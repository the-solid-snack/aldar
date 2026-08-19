const { BlobServiceClient } = require("@azure/storage-blob");
const crypto = require("crypto");

const CONTAINER_NAME = "maps";

function checkPasscode(req) {
  const expected = process.env.ALDAR_PASSCODE;
  const supplied = req.headers["x-aldar-passcode"];
  return expected && supplied && expected === supplied;
}

function parseDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || "");
  if (!m) return null;
  return { contentType: m[1], buffer: Buffer.from(m[2], "base64") };
}

function extFor(contentType) {
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/png") return "png";
  return "jpg";
}

module.exports = async function (context, req) {
  if (!checkPasscode(req)) {
    context.res = { status: 401, body: { error: "unauthorized" } };
    return;
  }

  const { name, dataUrl } = req.body || {};
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    context.res = { status: 400, body: { error: "invalid dataUrl" } };
    return;
  }

  try {
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const blobService = BlobServiceClient.fromConnectionString(conn);
    const container = blobService.getContainerClient(CONTAINER_NAME);
    await container.createIfNotExists({ access: "blob" }); // anonymous read on blobs only

    const safeName = (name || "carte").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const blobName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${safeName}.${extFor(parsed.contentType)}`;

    const blockBlob = container.getBlockBlobClient(blobName);
    await blockBlob.uploadData(parsed.buffer, {
      blobHTTPHeaders: { blobContentType: parsed.contentType },
    });

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { url: blockBlob.url },
    };
  } catch (e) {
    context.log.error(e);
    context.res = { status: 500, body: { error: "upload failed" } };
  }
};
