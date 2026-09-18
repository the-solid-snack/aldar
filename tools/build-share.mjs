/* Génère share/index.html à partir de index.html : même fiche, sans les données de campagne.
   À relancer après toute modification de index.html :  node tools/build-share.mjs           */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const src  = path.join(root, 'index.html');
const out  = path.join(root, 'share', 'index.html');

const crlf = fs.readFileSync(src, 'utf8').includes('\r\n');
let s = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');

const cut = (re, replacement, label) => {
  if(!re.test(s)) throw new Error('motif introuvable : ' + label);
  s = s.replace(re, replacement);
};

/* 1. Notes de campagne -> notes d'exemple inventées */
const NOTES = [
  "Session d'ouverture\nRéveillé dans une caisse au fond d'une cale, sans le moindre souvenir des trois jours précédents.\nLe couvercle portait un sceau de guilde à moitié fondu — personne à bord ne veut dire lequel.\nLe second du navire accepte de me débarquer au port haut si je surveille la cargaison jusque-là.",
  "Le bureau des douanes du port haut\nUn commis tatillon refuse de nous laisser passer sans un tampon qu'aucun bureau ne délivre plus depuis l'hiver dernier.\nSa collègue nous glisse que le tampon en question dort dans un tiroir du troisième étage.\nOn est ressortis avec le tampon et une invitation à ne plus jamais revenir.",
  "La halle aux grains\nTrois marchands se plaignent de la même chose : des sacs qui arrivent pleins et repartent à moitié vides, sans trace d'effraction.\nAu sous-sol, les dalles sonnent creux sur une bande de six pas de large.\nUn passage descend vers une galerie plus ancienne que la halle elle-même.",
  "La galerie sous la halle\nDes marques de taille naines, très soignées, et beaucoup plus vieilles que la ville.\nAu bout, une porte de bronze sans serrure ni poignée, tiède au toucher.\nElle s'ouvre quand on pose la paume dessus — mais seulement pour moi.",
  "Derrière la porte de bronze\nUne salle circulaire, un bassin de métal en fusion au centre, parfaitement immobile.\nSept niches vides le long du mur, une huitième encore scellée.\nJ'ai l'impression désagréable que la salle attendait quelqu'un, et que ce quelqu'un vient d'arriver.",
  "Ce qu'on sait de la confrérie du Creuset\nIls recrutent parmi les forgerons, jamais parmi les guerriers.\nLeur marque est un cercle barré d'une ligne, gravé à l'intérieur du col des outils.\nOn en a relevé quatre en ville, dont un sur le marteau du commis des douanes.",
  "À faire avant la prochaine étape\nRetrouver qui a scellé la huitième niche, et pourquoi.\nDemander au temple ce que vaut vraiment le sceau fondu de la caisse.\nNe plus poser la main sur des portes tièdes sans prévenir le reste du groupe.",
  "Notes de règles\nLe champ de force tient tant que je ne prends pas de dégâts de feu magiques.\nLa chute ralentie ne marche pas si j'ai les mains prises.\nPenser à activer l'endurance de l'ours AVANT le combat, pas au troisième round."
];
cut(/const NOTES_SEED = \[[\s\S]*?\n\];/,
    'const NOTES_SEED = [\n' + NOTES.map(n=>' ' + JSON.stringify(n)).join(',\n') + '\n];',
    'NOTES_SEED');

/* 2. Cartes de campagne -> aucune (allège aussi la page de ~900 Ko) */
cut(/const SEED_MAPS = \[[\s\S]*?\n\];/, 'const SEED_MAPS = [];', 'SEED_MAPS');

/* 3. Stockage isolé : même domaine, mais aucune collision avec la vraie fiche */
cut(/const PREFIX = "aldar_";/, 'const PREFIX = "aldarshare_";', 'PREFIX');

/* 4. Synchro serveur neutralisée : la démo ne lit ni n'écrit jamais /api,
      et ne réclame donc aucun code d'accès. */
cut(/function getPasscode\(\)\{[\s\S]*?\n\}/,
[ 'function getPasscode(){',
  "  /* page de démonstration : aucune synchro serveur, tout reste dans ce navigateur. */",
  '  return null;',
  '}' ].join('\n'), 'getPasscode');

cut(/console\.log\("Fiche Aldar v5 chargée/, 'console.log("Fiche Aldar — page de démonstration', 'console.log');

/* 5. Titre et bandeau : dire clairement que c'est une démo et que rien n'est enregistré */
cut(/<title>[\s\S]*?<\/title>/,
    '<title>Fiche de personnage D&amp;D — démonstration</title>', 'title');

cut(/\.reset-link:hover\{color:var\(--ember\)\}/,
[ '.reset-link:hover{color:var(--ember)}',
  '.demo{',
  '  display:flex; gap:10px 14px; align-items:baseline; flex-wrap:wrap;',
  '  background:var(--goldbg); border:1px solid var(--border2); border-left:4px solid var(--gold);',
  '  border-radius:8px; padding:9px 14px; margin-bottom:16px; box-shadow:var(--shadow);',
  '}',
  '.demo b{color:var(--gold); letter-spacing:.06em; text-transform:uppercase; font-size:11.5px; white-space:nowrap}',
  '.demo span{font-size:13px; color:var(--ink2); flex:1; min-width:240px}' ].join('\n'), 'CSS du bandeau');

cut(/<div class="wrap">\n/,
[ '<div class="wrap">',
  '',
  '<div class="demo">',
  '  <b>Démonstration</b>',
  '  <span>Personnage, notes et matériel sont fictifs. Modifie ce que tu veux : tout reste dans ton navigateur, rien n’est envoyé ni enregistré ailleurs, et personne d’autre ne verra tes changements.</span>',
  '</div>',
  '' ].join('\n'), 'bandeau');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, crlf ? s.replace(/\n/g,'\r\n') : s);

const ko = n => (n/1024).toFixed(0) + ' Ko';
console.log('share/index.html généré : ' + ko(fs.statSync(out).size) + ' (source : ' + ko(fs.statSync(src).size) + ')');
