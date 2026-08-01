/* Genera un full imprimible amb l'enllaç NFC de cada caixa del Racó dels reptes.
   Llegeix dades/reptes_caixes_2026-2027.json (font de veritat).
   Ús: node scripts/gen_nfc_doc.js [sortida.html] */
const fs = require('fs');
const BASE = 'https://poldpm.github.io/coordinaci-_2nPrim/?repte=';
const j = JSON.parse(fs.readFileSync('dades/reptes_caixes_2026-2027.json', 'utf8'));
const MAT = { mat: 'Matemàtiques', catala: 'Català' };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stars = n => (n === 4 ? '⭐' : '★'.repeat(Math.max(1, Math.min(3, n || 1))));
const pref = m => (m === 'mat' ? 'mat' : 'cat');

const files = [];
['mat', 'catala'].forEach(mat => {
  const caixes = j.caixes.filter(c => c.materia === mat)
    .sort((a, b) => a.codi.localeCompare(b.codi));
  if (!caixes.length) return;
  files.push(`<tr class="sec"><td colspan="6">${MAT[mat]} · ${caixes.length} caixes · ${caixes.reduce((n, c) => n + c.nivells.length, 0)} caixes-nivell</td></tr>`);
  caixes.forEach(c => {
    const tema = parseInt(c.codi.split('-')[1], 10);
    c.nivells.forEach((v, i) => {
      const id = pref(c.materia) + '-t' + String(tema).padStart(2, '0') + '-n' + v.nivell;
      files.push(`<tr>
        <td class="n">${v.num}</td>
        <td class="cd">${i === 0 ? esc(c.codi) : ''}</td>
        <td class="cx">${i === 0 ? esc(c.nom) : ''}</td>
        <td class="lv">${stars(v.nivell)}</td>
        <td>${esc(v.nom)}</td>
        <td class="u"><code>${BASE}${id}</code></td>
      </tr>`);
    });
  });
});

const total = j.caixes.reduce((n, c) => n + c.nivells.length, 0);
const out = `<!doctype html><html lang="ca"><head><meta charset="utf-8">
<title>El racó dels reptes · enllaços NFC</title>
<style>
  body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#12333d;margin:24px;font-size:13px}
  h1{font-size:20px;margin:0 0 4px}
  p.sub{color:#5E8494;margin:0 0 16px;max-width:70ch}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #d8e2e6;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#eef5f7;font-size:11px;text-transform:uppercase;letter-spacing:.03em}
  tr.sec td{background:#0F6C86;color:#fff;font-weight:700;font-size:13px;letter-spacing:.02em}
  td.n{width:2.2em;text-align:center;color:#5E8494;font-weight:700}
  td.cd{width:4em;font-weight:700}
  td.cx{width:14em;color:#33555f}
  td.lv{width:3.4em;color:#F2994A;white-space:nowrap;font-size:14px}
  td.u code{font-size:11px;word-break:break-all;color:#0F6C86}
  tbody tr:nth-child(even):not(.sec){background:#fbfdfe}
  .note{margin-top:16px;background:#eef5f7;border:1px solid #d8e2e6;padding:10px 12px;border-radius:8px;max-width:80ch}
  @media print{ body{margin:10mm} tr.sec td{-webkit-print-color-adjust:exact;print-color-adjust:exact} }
</style></head><body>
  <h1>🎯 El racó dels reptes — enllaços NFC</h1>
  <p class="sub">Grava cada enllaç a l'etiqueta NFC de la seva caixa (com a <b>URL/Link</b>, amb una app tipus «NFC Tools»). En tocar la caixa amb el mòbil s'obrirà directament la seva pantalla a l'app, per escriure el nom del nen i marcar-la. <b>${total} etiquetes</b> en total. El número de l'esquerra és el mateix de la llista de seguiment de la paret.</p>
  <table>
    <thead><tr><th>#</th><th>Codi</th><th>Caixa</th><th>Nivell</th><th>Nom del nivell</th><th>Enllaç per a l'etiqueta NFC</th></tr></thead>
    <tbody>${files.join('\n')}
    </tbody>
  </table>
  <div class="note">Els dos <b>⭐ reptes extra</b> (M-06 · Meitats i quarts, i M-12 · Simetria) tenen etiqueta pròpia encara que visquin dins la caixa de la seva família.</div>
</body></html>`;
const dest = process.argv[2] || 'enllacos_NFC_reptes.html';
fs.writeFileSync(dest, out, 'utf8');
console.log('Escrit:', dest, '·', total, 'etiquetes');
