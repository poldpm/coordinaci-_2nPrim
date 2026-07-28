/* Genera un full imprimible amb l'enllaç NFC de cada caixa del Racó dels reptes.
   Llegeix REPTES_SEED d'index.html (o un JSON amb {caixes:[...]}) i escriu un HTML.
   Ús: node scripts/gen_nfc_doc.js [sortida.html] */
const fs = require('fs');
const BASE = 'https://poldpm.github.io/coordinaci-_2nPrim/?repte=';
const html = fs.readFileSync('index.html', 'utf8');
const idFn = (html.match(/function reptCaixaId\s*\([^)]*\)\s*\{[\s\S]*?\}/) || [])[0] || '';
const seedM = html.match(/const REPTES_SEED\s*=\s*(\(function[\s\S]*?\}\)\(\));/);
if (!seedM) { console.error('No he trobat REPTES_SEED a index.html'); process.exit(1); }
// eslint-disable-next-line no-new-func
const caixes = new Function(idFn + '\n return ' + seedM[1] + ';')();
const MAT = { mat: 'Matemàtiques', catala: 'Català' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stars = n => '★'.repeat(Math.max(1, Math.min(3, n || 1)));
const ordered = caixes.slice().sort((a, b) =>
  (a.materia || '').localeCompare(b.materia || '') || (a.tema || 0) - (b.tema || 0) || (a.nivell || 0) - (b.nivell || 0));
const rows = ordered.map((c, i) => `
    <tr>
      <td class="n">${i + 1}</td>
      <td class="m">${MAT[c.materia] || c.materia}</td>
      <td>${c.tema ? 'Tema ' + c.tema : ''}</td>
      <td>${esc(c.nom)}</td>
      <td class="lv">${c.nivell ? stars(c.nivell) : ''}</td>
      <td class="u"><code>${BASE}${encodeURIComponent(c.id)}</code></td>
    </tr>`).join('');
const out = `<!doctype html><html lang="ca"><head><meta charset="utf-8">
<title>El racó dels reptes · enllaços NFC</title>
<style>
  body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#12333d;margin:28px;font-size:14px}
  h1{font-size:20px;margin:0 0 4px}
  p.sub{color:#5E8494;margin:0 0 18px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #d8e2e6;padding:8px 10px;text-align:left;vertical-align:top}
  th{background:#eef5f7;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
  td.n{width:2em;text-align:center;color:#5E8494;font-weight:700}
  td.m{width:8em}
  td.u code{font-size:12px;word-break:break-all}
  td.lv{color:#F2994A;white-space:nowrap;font-size:15px}
  .note{margin-top:18px;background:#fff7e6;border:1px solid #f0dfb0;color:#8a6d1f;padding:10px 12px;border-radius:8px;font-size:13px}
  @media print{.note{border:1px solid #ccc}}
</style></head><body>
  <h1>🎯 El racó dels reptes — enllaços NFC</h1>
  <p class="sub">Grava cada enllaç a l'etiqueta NFC de la caixa corresponent (com a URL/Link, amb una app tipus «NFC Tools»). Tocar la caixa amb el mòbil obrirà la seva pantalla a l'app.</p>
  <table>
    <thead><tr><th>#</th><th>Matèria</th><th>Tema</th><th>Caixa</th><th>Nivell</th><th>Enllaç per a l'etiqueta NFC</th></tr></thead>
    <tbody>${rows}
    </tbody>
  </table>
  <div class="note"><b>Provisional:</b> aquestes són les caixes d'exemple de la maqueta. Quan em passis la llista definitiva, regenero aquest full amb totes les caixes reals.</div>
</body></html>`;
const dest = process.argv[2] || 'enllacos_NFC_reptes.html';
fs.writeFileSync(dest, out, 'utf8');
console.log('Escrit:', dest, '·', caixes.length, 'caixes');
