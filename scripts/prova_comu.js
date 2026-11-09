/* Bastida compartida de les proves de taula (jsdom).
   NO va dins l'app: és una eina de desenvolupament (§4 del CLAUDE.md).

   La idea: les proves executen el codi REAL d'index.html, no una còpia. S'extreu
   el tros que interessa amb tros(), es munta un DOM de mentida i s'hi posen els
   quatre ajudants que l'app dona per fets (el, esc, uid, STATE, api…). Així, si
   algú canvia una funció, la prova se n'assabenta.

   ⚠️ Les `let`/`const` declarades DINS d'un eval no surten al nostre àmbit (les
   funcions sí). Per mirar o tocar una variable d'estat de l'app, afegeix-hi una
   finestreta al final del codi que passes a `munta()`, com fan les proves.  */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ARREL = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ARREL, 'index.html'), 'utf8');

/* Retalla un tros d'index.html, des d'`ini` fins just abans de `fi`. */
function tros(ini, fi, etiqueta) {
  const i = HTML.indexOf(ini), j = HTML.indexOf(fi, i);
  if (i < 0) throw new Error('No s’ha trobat l’inici de «' + (etiqueta || ini) + '»');
  if (j < 0) throw new Error('No s’ha trobat el final de «' + (etiqueta || ini) + '»');
  return HTML.slice(i, j);
}

/* Un valor constant del codi font (els const de dins de l'eval no es veuen). */
function constant(nom, dins) {
  const m = new RegExp('const ' + nom + '\\s*=\\s*(\\d+)').exec(dins || HTML);
  if (!m) throw new Error('No s’ha trobat la constant ' + nom);
  return Number(m[1]);
}

/* Munta el DOM i deixa els globals a punt. `cos` és l'HTML de dins del <body>. */
function munta(cos) {
  const dom = new JSDOM('<!doctype html><html><body>' + (cos || '') + '</body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  return dom;
}

/* Els ajudants que l'app dona per fets. Cada prova n'agafa els que necessita i
   hi afegeix els seus. */
function ajudants() {
  const document = global.document;
  const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
  return {
    el,
    esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])),
    stripHtml: s => String(s == null ? '' : s).replace(/<[^>]*>/g, ''),
    norm: s => String(s || '').toLowerCase(),
    uid: (() => { let n = 0; return () => 'u' + (++n); })(),
    nowISO: () => new Date().toISOString(),
    fmtDate: iso => new Date(iso).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' }),
    /* En català el plural de les acabades en -a és -es (subtema → subtemes) */
    plural: (n, s, p) => (n === 1 ? s : (p || (/a$/i.test(s) ? s.replace(/a$/i, 'es') : s + 's'))),
    deDe: n => (/^[aeiouàèéíòóúh]/i.test(String(n).trim()) ? 'd’' + n : 'de ' + n),
    avatarEl: (id, mida) => { const a = el('span', 'avatar'); a.textContent = String(id)[0].toUpperCase(); return a; },
  };
}

/* Dates: avui en hora LOCAL (com llibAvui), i fa/dins N dies. */
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const AVUI = iso(new Date());
const fa = n => iso(new Date(Date.now() - n * 864e5));
const dins = n => iso(new Date(Date.now() + n * 864e5));

/* Comptador de comprovacions */
function comptador(titol) {
  let ok = 0, mal = 0;
  return {
    get ok() { return ok; },
    get mal() { return mal; },
    bloc(t) { console.log(t); },
    cal(c, q) { if (c) ok++; else { mal++; console.log('  ✗ ' + q); } },
    igual(a, b, q) {
      const x = JSON.stringify(a), y = JSON.stringify(b);
      if (x === y) ok++;
      else { mal++; console.log('  ✗ ' + q + '\n     tenim: ' + x + '\n     volem: ' + y); }
    },
    /* Pinta dins d'un div i avisa si peta, en comptes de tombar la prova sencera */
    pinta(fn) {
      const S = global.document.createElement('div');
      try { fn(S); } catch (e) {
        mal++;
        console.log('  ✗ PETA: ' + e.message + '\n' + String(e.stack).split('\n').slice(1, 3).join('\n'));
        return null;
      }
      return S;
    },
    acaba() {
      console.log('\n' + (mal ? '❌ ' + mal + ' errors' : '✅ tot correcte') + ' (' + (ok + mal) + ' comprovacions) · ' + titol);
      process.exit(mal ? 1 : 0);
    },
  };
}

module.exports = { ARREL, HTML, tros, constant, munta, ajudants, comptador, AVUI, fa, dins, iso };
