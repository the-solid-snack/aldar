const { TableClient } = require("@azure/data-tables");

const TABLE_NAME = "aldarstate";
const PARTITION_KEY = "aldar";
const ROW_KEY = "state";

function getTableClient() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  return TableClient.fromConnectionString(conn, TABLE_NAME, { allowInsecureConnection: false });
}

function checkPasscode(req) {
  const expected = process.env.ALDAR_PASSCODE;
  const supplied = req.headers["x-aldar-passcode"];
  return expected && supplied && expected === supplied;
}

module.exports = async function (context, req) {
  if (!checkPasscode(req)) {
    context.res = { status: 401, body: { error: "unauthorized" } };
    return;
  }

  const client = getTableClient();
  try {
    await client.createTable();
  } catch (e) {
    // table already exists — fine
  }

  if (req.method === "GET") {
    try {
      const entity = await client.getEntity(PARTITION_KEY, ROW_KEY);
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.parse(entity.data),
      };
    } catch (e) {
      if (e.statusCode === 404) {
        context.res = { status: 200, body: null };
      } else {
        context.log.error(e);
        context.res = { status: 500, body: { error: "read failed" } };
      }
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const payload = req.body;
      const entity = {
        partitionKey: PARTITION_KEY,
        rowKey: ROW_KEY,
        data: JSON.stringify(payload),
      };
      await client.upsertEntity(entity, "Replace");
      context.res = { status: 204 };
    } catch (e) {
      context.log.error(e);
      context.res = { status: 500, body: { error: "write failed" } };
    }
    return;
  }

  context.res = { status: 405 };
};