/* Genera la constant REPTES_SEED d'index.html a partir de dades/reptes_caixes_2026-2027.json
   Ús: node scripts/gen_reptes_seed.js [dades/reptes_caixes_2026-2027.json] [sortida.js] */
const fs = require('fs');
const src = process.argv[2] || 'dades/reptes_caixes_2026-2027.json';
const dest = process.argv[3] || 'reptes_seed.js';
const j = JSON.parse(fs.readFileSync(src, 'utf8'));

const pref = m => (m === 'mat' ? 'mat' : 'cat');
const rows = [];
j.caixes
  .slice()
  .sort((a, b) => a.materia.localeCompare(b.materia) || a.codi.localeCompare(b.codi))
  .forEach(c => {
    const tema = parseInt(c.codi.split('-')[1], 10);
    c.nivells.forEach(v => {
      rows.push({
        id: pref(c.materia) + '-t' + String(tema).padStart(2, '0') + '-n' + v.nivell,
        m: c.materia,
        c: c.codi,
        t: tema,
        n: v.nivell,        // 1,2,3 = ★ ★★ ★★★ ; 4 = ⭐ repte extra
        num: v.num,         // número correlatiu de la llista de la paret
        nom: c.nom,         // nom de la caixa (família)
        nn: v.nom,          // nom del nivell (el de l'etiqueta)
        d: v.desc           // què fa el nen en aquell nivell
      });
    });
  });

/* Entrades de TEMA (una per caixa): hi viuen les còpies i la fitxa imprimible,
   perquè la fitxa és la mateixa per als 3 nivells del tema. */
const temes = j.caixes
  .slice()
  .sort((a, b) => a.materia.localeCompare(b.materia) || a.codi.localeCompare(b.codi))
  .map(c => ({
    id: c.codi,                      // 'M-01'
    m: c.materia,
    t: parseInt(c.codi.split('-')[1], 10),
    nom: c.nom,
    d: c.desc,
    f: 'fitxes/Fitxa_' + c.codi + '_BN.pdf'
  }));

const out = '/* Caixes del Racó dels reptes (generat des de dades/reptes_caixes_2026-2027.json) */\n'
  + 'const REPTES_SEED=' + JSON.stringify(rows) + ';\n'
  + 'const REPTES_TEMES=' + JSON.stringify(temes) + ';\n';
fs.writeFileSync(dest, out, 'utf8');
console.log('temes:', temes.length);

const perMat = {};
rows.forEach(r => { perMat[r.m] = (perMat[r.m] || 0) + 1; });
console.log('Escrit:', dest, '·', (out.length / 1024).toFixed(1), 'KB');
console.log('caixes-nivell:', rows.length, JSON.stringify(perMat));
console.log('extres (⭐):', rows.filter(r => r.n === 4).map(r => r.id).join(', '));
console.log('exemple:', JSON.stringify(rows[0]));
