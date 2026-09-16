/* Copia la lògica d'escriptura del backend (Codi_AppsScript.gs) a index.html, perquè
   Firebase apliqui els canvis EXACTAMENT igual que ho feia el servidor.
   Ús:  node scripts/gen_fb_apply.js
   Copia _arribaTard, _conservaLlegits i _apply (sense res més: cap secret ni token)
   i substitueix el bloc marcat a index.html. */
const fs = require('fs');
const path = require('path');
const arrel = path.join(__dirname, '..');
const gs = fs.readFileSync(path.join(arrel, 'Codi_AppsScript.gs'), 'utf8');
const html = fs.readFileSync(path.join(arrel, 'index.html'), 'utf8');

function tros(ini, fi) {
  const i = gs.indexOf(ini), j = gs.indexOf(fi, i);
  if (i < 0 || j < 0) throw new Error('No trobat: ' + ini);
  return gs.slice(i, j).trimEnd();
}
let codi = [
  tros('function _arribaTard(', '/* Encara que l'),
  tros('function _conservaLlegits(', '/* La pestanya'),
  tros('function _apply(', 'function _loadStudents('),
].join('\n');
if (/TOKEN|SECRET|telegram|@escorialvic/i.test(codi)) throw new Error('El tros copiat conté dades sensibles: aturat');
codi = codi.replace(/\b_arribaTard\b/g, 'fbArribaTard')
           .replace(/\b_conservaLlegits\b/g, 'fbConservaLlegits')
           .replace(/\b_apply\b/g, 'fbApply');

const INI = '/* === PORT DEL BACKEND: inici (generat per scripts/gen_fb_apply.js; no editar a mà) === */';
const FI = '/* === PORT DEL BACKEND: fi === */';
const a = html.indexOf(INI), b = html.indexOf(FI);
if (a < 0 || b < 0) throw new Error('No trobo les marques del bloc a index.html');
const nou = html.slice(0, a) + INI + '\n' + codi + '\n' + html.slice(b);
fs.writeFileSync(path.join(arrel, 'index.html'), nou, 'utf8');
console.log('fbApply actualitzat (' + codi.length + ' caràcters)');
