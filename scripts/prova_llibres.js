/* Prova de taula del «Registre llibres a casa» (model de CICLES, §9).
   Executa el codi REAL d'index.html dins d'un DOM de mentida: la lògica dels
   cicles, el pintat de la graella, els clics, l'avís de la portada i que
   fbApply (la còpia del backend) acabi exactament igual que l'aplicació local.

   node scripts/prova_llibres.js        (cal: npm i jsdom)  */
const P = require('./prova_comu');
const { tros, constant, munta, ajudants, comptador, AVUI, fa, dins } = P;

munta('<div id="sec"></div><div id="toast"></div>');
const T = comptador('llibres');
const { el, esc, stripHtml, norm, uid, plural, avatarEl } = ajudants();
global.el = el;

/* ---------- el codi real ---------- */
const portBackend = tros('function fbArribaTard(', '/* === PORT DEL BACKEND: fi === */', 'fbApply');
const eina = tros('const LLIB_SEED=[', '/* ============ EL RACÓ DELS REPTES ============ */', 'eina de llibres');
const panell = tros('const LLIB_PANEL_MAX=', 'function renderNovetats(', 'avís de la portada');
const stKeySrc = tros('function stKey(cls, name)', 'function stLlegeix(', 'stKey');
const classeSrc = tros('function studentClass(name)', 'function classColor(', 'studentClass');
const nomsSrc = tros('function stMostra(cls, nom)', 'function grupCompta(', 'stMostra');
const colorsSrc = tros('function _relLum(hex){', '/* ============================================================\n   VISTA DE SECCIÓ', 'colors');
const LLIB_PANEL_MAX = constant('LLIB_PANEL_MAX', panell);

/* ---------- bastida ---------- */
const GROUPS = [{ id: '2na', color: '#D5638E' }, { id: '2nb', color: '#EE9B4C' }, { id: '2nc', color: '#5A6FE0' }];
const classColor = cls => { const g = GROUPS.find(x => x.id === String(cls).toLowerCase()); return g ? g.color : 'var(--muted)'; };
const TUTOR_CLASS = { pol: '2nC', cristina: '2nA', mireia: '2nB' };
let ME = 'pol';
const pickTutorClass = classes => {
  const w = TUTOR_CLASS[ME];
  if (w) { const f = classes.find(c => c.toLowerCase() === w.toLowerCase()); if (f) return f; }
  return classes[0];
};
const autClasses = () => Object.keys(STATE.students || {}).filter(c => (STATE.students[c] || []).length);
const ICONS = { eines: '<path d="M0 0"/>' };
let brindis = []; const toast = m => brindis.push(m);
let ULTIM_CONFIRM = null;
const askConfirm = (msg, onYes, opts) => { ULTIM_CONFIRM = { msg, onYes, opts: opts || {} }; };
let ULTIM_PROMPT = null;
const askPrompt = (o, cb) => { ULTIM_PROMPT = { o, cb }; };
const refrescaEstat = async () => {};
const wireModal = () => (() => {});
let obertures = 0; const openSection = () => { obertures++; };
let refrescs = 0; const refreshHome = () => { refrescs++; };
let dashos = 0; const renderDash = () => { dashos++; };
let LLIB_CICLE = null, LLIB_CLASS = null, LLIB_CONFIG = false, LLIB_NAV = false, PENDING_EINA = null;
let STATE = {};

/* L'API, com la de debò: toca STATE i apunta l'acció a la cua (per comparar-la
   després amb fbApply, que és la còpia del backend). */
const CUA = [];
const api = {
  async llibTitols(titols) {
    const d = llibDades(); d.titols = titols || [];
    CUA.push(['llibTitols', { titols: d.titols }]);
  },
  async llibCicleSet(id, patch) {
    const d = llibDades();
    let c = d.cicles.find(x => x.id === id);
    if (!c) { c = { id, nom: '', dona: '', recull: '', alumnes: {} }; d.cicles.push(c); }
    Object.keys(patch || {}).forEach(k => { c[k] = patch[k]; });
    c.alumnes = c.alumnes || {};
    CUA.push(['llibCicleSet', { id, patch }]);
  },
  async llibAlumne(cicle, alumne, patch) {
    const d = llibDades();
    const c = d.cicles.find(x => x.id === cicle);
    if (!c) return;
    c.alumnes = c.alumnes || {};
    const a = c.alumnes[alumne] = c.alumnes[alumne] || {};
    Object.keys(patch || {}).forEach(k => { if (patch[k] == null) delete a[k]; else a[k] = patch[k]; });
    if (!Object.keys(a).length) delete c.alumnes[alumne];
    CUA.push(['llibAlumne', { cicle, alumne, patch }]);
  },
  async llibCicleDelete(id) {
    const d = llibDades();
    d.cicles = d.cicles.filter(x => x.id !== id);
    CUA.push(['llibCicleDelete', { id }]);
  },
};

eval(stKeySrc + '\n' + classeSrc + '\n' + nomsSrc + '\n' + colorsSrc + '\n'
  + portBackend + '\n' + eina + '\n' + panell
  /* finestreta: les `let` de dins de l'eval no surten al nostre àmbit */
  + '\n;global.V = { get cicle(){ return LLIB_CICLE; }, set cicle(v){ LLIB_CICLE = v; },'
  + '              get classe(){ return LLIB_CLASS; }, set classe(v){ LLIB_CLASS = v; },'
  + '              get config(){ return LLIB_CONFIG; }, set config(v){ LLIB_CONFIG = v; },'
  + '              get nav(){ return LLIB_NAV; }, get eina(){ return PENDING_EINA; } };');

function nouEstat(alumnes) {
  STATE = {
    llibres: { titols: [], cicles: [] },
    students: alumnes || { '2nA': ['Anna Puig', 'Bru Soler'], '2nB': ['Cesc Mir'], '2nC': ['Dídac Roca', 'Emma Vila'] },
  };
  V.cicle = null; V.classe = null; V.config = false;
  CUA.length = 0; obertures = 0; refrescs = 0; brindis = []; ME = 'pol';
  ULTIM_CONFIRM = null; ULTIM_PROMPT = null;
  [...document.querySelectorAll('.modal')].forEach(m => m.remove());
}
const cicleNou = async (id, nom, dona, recull) => { await api.llibCicleSet(id, { nom, dona, recull }); return llibCicle(id); };
const esperaMicro = () => new Promise(r => setTimeout(r, 0));

async function main() {
  const { cal, igual, pinta, bloc } = T;

  /* ===================== LÒGICA ===================== */

  bloc('1. La llista de títols');
  nouEstat();
  igual(llibTitols().length, 11, 'la sembra porta 11 llibres');
  igual(llibTitols()[0].id, 'l01', 'amb ids estables');
  igual(llibTitol('l06'), 'En Ton i la Neus', 'llibTitol resol el nom');
  igual(llibTitol('zzz'), '(llibre tret de la llista)', 'i un id que ja no hi és ho diu clarament');
  await api.llibTitols(llibTitols().concat([{ id: 'l99', nom: 'Un de nou' }]));
  igual(llibTitols().length, 12, 'la primera edició materialitza la sembra sencera');

  bloc('2. Cicles');
  nouEstat();
  igual(llibCicles(), [], 'sense cicles, cap');
  cal(llibCicleActual() === null, 'i cap «cicle d’ara»');
  await cicleNou('c2', 'Segon', fa(5), dins(9));
  await cicleNou('c1', 'Primer', fa(40), fa(26));
  igual(llibCicles().map(c => c.id), ['c1', 'c2'], 'ordenats per la data de donar-los');
  igual(llibCicle('c1').nom, 'Primer', 'llibCicle els troba per id');
  cal(llibCicle('nope') === null, 'i un id inventat torna null');

  bloc('3. Assignar i tornar');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(10), fa(3));
  await api.llibAlumne('c1', '2nC|Dídac Roca', { llibre: 'l03' });
  igual(llibAlu(llibCicle('c1'), '2nC', 'Dídac Roca'), { llibre: 'l03' }, 'queda assignat');
  await api.llibAlumne('c1', '2nC|Dídac Roca', { tornat: AVUI });
  igual(llibAlu(llibCicle('c1'), '2nC', 'Dídac Roca'), { llibre: 'l03', tornat: AVUI },
    'marcar tornat FUSIONA, no substitueix');
  await api.llibAlumne('c1', '2nC|Dídac Roca', { tornat: null });
  igual(llibAlu(llibCicle('c1'), '2nC', 'Dídac Roca'), { llibre: 'l03' }, 'i null esborra només aquell camp');
  await api.llibAlumne('c1', '2nC|Dídac Roca', { llibre: null, tornat: null });
  igual(llibCicle('c1').alumnes['2nC|Dídac Roca'], undefined, 'sense cap camp, l’alumne desapareix del cicle');

  bloc('4. Dues Annes de classes diferents');
  nouEstat({ '2nA': ['Anna Puig'], '2nC': ['Anna Puig'] });
  await cicleNou('c1', 'Llibres 1', fa(10), fa(3));
  await api.llibAlumne('c1', stKey('2nA', 'Anna Puig'), { llibre: 'l01' });
  igual(llibAlu(llibCicle('c1'), '2nC', 'Anna Puig'), {}, 'la de 2nC no s’hi veu afectada');
  igual(llibAlu(llibCicle('c1'), '2nA', 'Anna Puig').llibre, 'l01', 'i la de 2nA sí: la clau és CLASSE|NOM');

  bloc('5. Comptadors');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(10), fa(3));
  igual(llibComptaCicle(llibCicle('c1')), { assignats: 0, tornats: 0, total: 5, falten: 0 }, 'cicle buit');
  await api.llibAlumne('c1', '2nC|Dídac Roca', { llibre: 'l01' });
  await api.llibAlumne('c1', '2nC|Emma Vila', { llibre: 'l02', tornat: fa(1) });
  igual(llibComptaCicle(llibCicle('c1')), { assignats: 2, tornats: 1, total: 5, falten: 1 }, 'amb dos repartits i un tornat');
  igual(llibFalten(llibCicle('c1')).map(x => x.nom), ['Dídac Roca'], 'falta només en Dídac');

  bloc('6. Què ha tingut ja, entre cicles');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(40), fa(26));
  await cicleNou('c2', 'Llibres 2', fa(10), fa(3));
  await api.llibAlumne('c1', '2nC|Dídac Roca', { llibre: 'l01', tornat: fa(26) });
  await api.llibAlumne('c2', '2nC|Dídac Roca', { llibre: 'l02' });
  igual(Object.keys(llibJaTingut('2nC', 'Dídac Roca', 'c2')), ['l01'], 'el del cicle anterior sí');
  igual(Object.keys(llibJaTingut('2nC', 'Dídac Roca', 'c1')), ['l02'], 'i, mirant des de l’altre, el contrari');
  igual(Object.keys(llibJaTingut('2nC', 'Emma Vila', 'c2')), [], 'qui no n’ha tingut cap, cap');

  bloc('7. Quin cicle és el d’ara');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(40), fa(26));
  await cicleNou('c2', 'Llibres 2', fa(10), fa(3));
  await api.llibAlumne('c1', '2nC|Dídac Roca', { llibre: 'l01' });     // no tornat: el cicle vell segueix obert
  igual(llibCicleActual().id, 'c1', 'el primer que encara té llibres fora');
  await api.llibAlumne('c1', '2nC|Dídac Roca', { tornat: fa(20) });
  igual(llibCicleActual().id, 'c2', 'tancat aquell, passa al següent');
  await api.llibAlumne('c2', '2nC|Emma Vila', { llibre: 'l02', tornat: fa(1) });
  igual(llibCicleActual().id, 'c2', 'i si tots estan tancats, l’últim');

  bloc('8. Repartiment automàtic');
  nouEstat({ '2nC': ['A', 'B', 'C', 'D'] });
  await cicleNou('c1', 'Llibres 1', fa(2), dins(12));
  await api.llibAlumne('c1', '2nC|A', { llibre: 'l01' });
  const canvis = llibReparteix(llibCicle('c1'), '2nC');
  igual(canvis.map(c => c.nom), ['B', 'C', 'D'], 'no toca qui ja en té');
  igual(new Set(canvis.map(c => c.llibre)).size, 3, 'i no en repeteix cap entre ells');
  cal(!canvis.some(c => c.llibre === 'l01'), 'ni el que ja estava repartit (reparteix les còpies)');

  bloc('9. El repartiment no repeteix el que ja ha llegit');
  nouEstat({ '2nC': ['A'] });
  await cicleNou('c1', 'Llibres 1', fa(40), fa(26));
  await cicleNou('c2', 'Llibres 2', fa(2), dins(12));
  await api.llibAlumne('c1', '2nC|A', { llibre: 'l05', tornat: fa(26) });
  igual(llibReparteix(llibCicle('c2'), '2nC').map(c => c.llibre !== 'l05'), [true], 'li’n dona un altre');
  /* si ja els ha tingut tots, val més repetir que deixar-lo sense */
  await api.llibTitols([{ id: 'l05', nom: 'L’únic' }]);
  igual(llibReparteix(llibCicle('c2'), '2nC').map(c => c.llibre), ['l05'], 'si no en queda cap de nou, repeteix');

  bloc('10. Qui falta (text per copiar)');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(20), fa(6));
  igual(llibTextFalten(llibCicle('c1')), 'Tots els llibres tornats ✓', 'sense ningú, ho diu');
  await api.llibAlumne('c1', '2nC|Dídac Roca', { llibre: 'l01' });
  await api.llibAlumne('c1', '2nA|Anna Puig', { llibre: 'l02' });
  const txt = llibTextFalten(llibCicle('c1'));
  cal(/falten 2/.test(txt), 'diu quants en falten');
  cal(/2nA:/.test(txt) && /2nC:/.test(txt), 'agrupat per classe');
  cal(/- Dídac Roca — Tumbili/.test(txt), 'amb el nom i el llibre');

  bloc('11. Dies de retard');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(20), fa(6));
  igual(llibDiesDeRetard(llibCicle('c1')), 6, 'sis dies tard');
  await cicleNou('c2', 'Llibres 2', fa(2), dins(12));
  igual(llibDiesDeRetard(llibCicle('c2')), -12, 'i en negatiu si encara no toca');
  await cicleNou('c3', 'Sense data', fa(2), '');
  igual(llibDiesDeRetard(llibCicle('c3')), -999, 'sense data de recollir, mai no venç');
  igual(llibFmtDia('2026-11-09'), '09/11', 'la data curta surt dia/mes');

  bloc('12. El nom corregit de Gestió de grups');
  nouEstat();
  STATE.grups = { noms: { '2nC|Dídac Roca': 'Dídac R.' } };
  await cicleNou('c1', 'Llibres 1', fa(20), fa(6));
  await api.llibAlumne('c1', '2nC|Dídac Roca', { llibre: 'l01' });
  igual(llibFalten(llibCicle('c1')).map(x => x.mostra), ['Dídac R.'], 'surt corregit');
  cal(/Dídac R\. —/.test(llibTextFalten(llibCicle('c1'))), 'i al text per copiar');
  igual(Object.keys(llibCicle('c1').alumnes), ['2nC|Dídac Roca'], 'però la clau desada NO canvia mai');

  bloc('13. Esborrar un cicle');
  nouEstat();
  await cicleNou('c1', 'Un', fa(20), fa(6));
  await cicleNou('c2', 'Dos', fa(2), dins(12));
  await api.llibCicleDelete('c1');
  igual(llibCicles().map(c => c.id), ['c2'], 'se’n va només aquell');

  /* ===================== fbApply (la còpia del backend) ===================== */

  bloc('14. fbApply desa exactament el mateix que l’app');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(10), fa(3));
  await api.llibTitols([{ id: 'l01', nom: 'Tumbili' }, { id: 'l02', nom: 'Plou' }]);
  await api.llibAlumne('c1', '2nC|Dídac Roca', { llibre: 'l01' });
  await api.llibAlumne('c1', '2nC|Dídac Roca', { tornat: AVUI });
  await api.llibAlumne('c1', '2nC|Emma Vila', { llibre: 'l02' });
  await api.llibCicleSet('c1', { nom: 'Rebatejat' });
  await cicleNou('c2', 'Llibres 2', fa(1), dins(13));
  await api.llibCicleDelete('c2');
  const local = JSON.parse(JSON.stringify(STATE.llibres));
  const servidor = { llibres: { titols: [], cicles: [] } };
  CUA.forEach(([accio, payload]) => fbApply(servidor, accio, payload));
  igual(servidor.llibres, local, 'el backend arriba al mateix estat');

  bloc('15. Reenviar un lot no fa mal (idempotència)');
  CUA.forEach(([accio, payload]) => fbApply(servidor, accio, payload));
  igual(servidor.llibres, local, 'aplicar-ho dues vegades dona el mateix');

  /* ===================== PINTAT ===================== */

  bloc('16. Sense cap cicle');
  nouEstat();
  let S = pinta(renderLlibres);
  if (S) {
    cal(/Encara no hi ha cap cicle/.test(S.textContent), 'convida a crear-ne un');
    igual(S.querySelectorAll('.att-actions .btn').length, 2, 'botó de crear + ⚙ Llibres');
    cal(!S.querySelector('.llib-ciclesel'), 'i cap selector');
  }
  nouEstat({});
  S = pinta(renderLlibres);
  if (S) cal(/No hi ha alumnes/.test(S.textContent), 'i sense alumnes ho diu, sense petar');

  bloc('17. Crear el primer cicle');
  nouEstat();
  S = pinta(renderLlibres);
  S.querySelectorAll('.att-actions .btn')[0].onclick();
  cal(!!ULTIM_PROMPT && ULTIM_PROMPT.o.value === 'Llibres 1', 'proposa «Llibres 1»');
  ULTIM_PROMPT.cb('Llibres de tardor');
  await esperaMicro();
  igual(llibCicles().length, 1, 'es crea');
  igual(llibCicles()[0].dona, AVUI, 'i es donen avui per defecte');
  cal(V.cicle === llibCicles()[0].id, 'i queda seleccionat');

  bloc('18. La graella d’un cicle');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(10), fa(3));
  V.cicle = 'c1';
  S = pinta(renderLlibres);
  if (S) {
    igual(S.querySelectorAll('.llib-ciclesel option').length, 1, '1 opció al selector');
    cal(/sense repartir/.test(S.querySelector('.llib-ciclesel option').textContent), 'que diu «sense repartir»');
    igual(S.querySelectorAll('.att-tab').length, 3, 'les 3 pestanyes de classe');
    cal(/^2nC/.test(S.querySelector('.att-tab.on').textContent), 'per defecte la del tutor (Pol → 2nC)');
    igual(S.querySelectorAll('.aut-fila').length, 2, 'els 2 alumnes de 2nC');
    igual(S.querySelectorAll('.llib-pick.buit').length, 2, 'tots dos sense llibre');
    igual([...S.querySelectorAll('.aut-resum span')].map(x => x.textContent), ['0/5', '0/0'], 'comptadors a zero');
    cal([...S.querySelectorAll('.llib-check')].every(b => b.disabled), 'no es pot marcar tornat sense llibre');
    igual(S.querySelectorAll('.llib-data input').length, 2, 'els dos camps de data');
  }

  bloc('19. Els botons de repartir');
  const noms = () => [...S.querySelectorAll('.att-actions .btn')].map(b => b.textContent);
  igual(noms(), ['El mateix per a tota la classe', 'Un de diferent a cada un dels 2 que falten', 'Copia qui falta'],
    'els tres, i el de tota la classe PRIMER');
  igual(S.querySelector('.att-actions .btn-primary').textContent, 'El mateix per a tota la classe',
    'que a més és el destacat: sovint tota la classe llegeix el mateix');

  bloc('20. Un llibre per a tota la classe');
  await S.querySelector('.att-actions .btn-primary').onclick();
  let box = document.querySelector('.llib-tria');
  cal(!!box, 's’obre el modal');
  if (box) {
    igual(box.querySelectorAll('.llib-tria-op').length, 11, 'amb els 11 títols');
    cal(/2 alumnes/.test(box.querySelector('p').textContent), 'i diu a quants afecta');
    cal(!box.querySelector('.btn-danger'), 'sense «treu-li el llibre» (no és d’un alumne)');
    box.querySelectorAll('.llib-tria-op')[3].onclick();
    await esperaMicro(); await esperaMicro();
    const al = llibCicle('c1').alumnes;
    igual(Object.keys(al).length, 2, 'els dos alumnes queden assignats');
    cal(Object.values(al).every(x => x.llibre === 'l04'), 'i tots amb el MATEIX llibre');
    igual(S.querySelectorAll('.llib-pick.buit').length, 0, 'cap fila es queda buida');
    igual([...S.querySelectorAll('.aut-resum span')].map(x => x.textContent), ['2/5', '0/2'], 'els comptadors es refresquen');
    cal(/^2nC \(0\/2\)/.test(S.querySelector('.att-tab.on').textContent), 'i la pestanya de classe');
    igual(obertures, 0, 'TOT això SENSE repintar la secció');
  }

  bloc('21. Si ja en tenien un altre, ho pregunta');
  ULTIM_CONFIRM = null;
  /* amb tothom servit, el botó ja no és el destacat: es busca pel text */
  const botoTots = [...S.querySelectorAll('.att-actions .btn')].find(b => /tota la classe/.test(b.textContent));
  cal(!!botoTots && !botoTots.classList.contains('btn-primary'), 'amb tothom servit deixa de ser el destacat');
  await botoTots.onclick();
  document.querySelector('.llib-tria').querySelectorAll('.llib-tria-op')[0].onclick();
  await esperaMicro();
  cal(!!ULTIM_CONFIRM, 'demana confirmació');
  if (ULTIM_CONFIRM) {
    cal(/2 alumnes ja tenen un altre llibre/.test(ULTIM_CONFIRM.msg), 'dient quants: ' + ULTIM_CONFIRM.msg.slice(0, 60));
    igual(ULTIM_CONFIRM.opts.danger, false, 'i no és un esborrat (res de paperera vermella)');
    await ULTIM_CONFIRM.onYes();
    cal(Object.values(llibCicle('c1').alumnes).every(x => x.llibre === 'l01'), 'en dir que sí, tots canviats');
  }

  bloc('22. Assignar i treure a UN alumne');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(10), fa(3));
  V.cicle = 'c1';
  S = pinta(renderLlibres);
  S.querySelectorAll('.llib-pick')[0].onclick();
  box = document.querySelector('.llib-tria');
  cal(!box.querySelector('.btn-danger'), 'sense llibre, no hi ha «Treu-li el llibre»');
  box.querySelectorAll('.llib-tria-op')[2].onclick();
  await esperaMicro(); await esperaMicro();
  igual(llibAlu(llibCicle('c1'), '2nC', 'Dídac Roca').llibre, 'l03', 'queda assignat');
  igual(S.querySelectorAll('.llib-pick')[0].textContent, 'Llista d’aniversari', 'la fila ensenya el títol');
  cal(!S.querySelectorAll('.llib-pick')[0].classList.contains('buit'), 'i ja no és buida');
  cal(!S.querySelectorAll('.llib-check')[0].disabled, 'ara sí que es pot marcar tornat');
  igual(obertures, 0, 'sense repintar la secció');
  S.querySelectorAll('.llib-pick')[0].onclick();
  box = document.querySelector('.llib-tria');
  cal(!!box.querySelector('.btn-danger'), 'ara sí que hi ha «Treu-li el llibre»');
  igual(box.querySelectorAll('.llib-tria-op.on').length, 1, 'i el que té ara surt marcat');
  box.querySelector('.btn-danger').onclick();
  await esperaMicro(); await esperaMicro();
  igual(llibCicle('c1').alumnes['2nC|Dídac Roca'], undefined, 'queda net');
  cal(S.querySelectorAll('.llib-check')[0].disabled, 'i la casella es torna a desactivar');

  bloc('23. Marcar «tornat»');
  await api.llibAlumne('c1', '2nC|Dídac Roca', { llibre: 'l03' });
  S = pinta(renderLlibres);
  obertures = 0;
  const check = S.querySelectorAll('.llib-check')[0];
  await check.onclick();
  igual(llibAlu(llibCicle('c1'), '2nC', 'Dídac Roca').tornat, AVUI, 'desa la data d’avui');
  cal(check.classList.contains('on'), 'la casella es queda marcada');
  igual([...S.querySelectorAll('.aut-resum span')].map(x => x.textContent), ['1/5', '1/1'], 'comptadors al dia');
  igual(obertures, 0, 'i sense repintar (no perdre el punt on ets)');
  await check.onclick();
  cal(!llibAlu(llibCicle('c1'), '2nC', 'Dídac Roca').tornat, 'tornar a clicar el desmarca');
  cal(llibAlu(llibCicle('c1'), '2nC', 'Dídac Roca').llibre === 'l03', 'però no li treu el llibre');

  bloc('24. Dates, nom i esborrat del cicle');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(10), fa(3));
  V.cicle = 'c1';
  S = pinta(renderLlibres);
  obertures = 0;
  const camps = S.querySelectorAll('.llib-data input');
  camps[1].value = dins(3); await camps[1].onchange(); await esperaMicro();
  igual(llibCicle('c1').recull, dins(3), 'la data de recollir es desa');
  S.querySelector('.llib-dates-row .btn').onclick();          // ✏️ Nom
  ULTIM_PROMPT.cb('Llibres d’hivern'); await esperaMicro();
  igual(llibCicle('c1').nom, 'Llibres d’hivern', 'i el nom');
  cal(/Llibres d’hivern/.test(S.querySelector('.llib-ciclesel option').textContent), 'el selector s’actualitza sol');
  igual(obertures, 0, 'tampoc cal repintar per això');
  await S.querySelector('.llib-esb').onclick();
  cal(!!ULTIM_CONFIRM, 'esborrar demana confirmació');
  await ULTIM_CONFIRM.onYes(); await esperaMicro();
  igual(llibCicles().length, 0, 'i marxa');

  bloc('25. La llista de títols');
  nouEstat();
  V.config = true;
  S = pinta(renderLlibres);
  if (S) {
    igual(S.querySelectorAll('.aut-config-row').length, 11, '11 títols');
    const inp = S.querySelectorAll('.aut-config-row input')[0];
    igual(inp.value, 'Tumbili', 'el primer és Tumbili');
    inp.value = 'Tumbili (2a part)';
    await inp.onchange(); await esperaMicro();
    igual(llibTitols()[0].nom, 'Tumbili (2a part)', 'es pot reanomenar');
    igual(llibTitols().length, 11, 'i la sembra es materialitza sencera');
  }
  S = pinta(renderLlibres);
  await S.querySelectorAll('.icon-btn.danger')[0].onclick();
  await ULTIM_CONFIRM.onYes(); await esperaMicro();
  igual(llibTitols().length, 10, 'i treure’n un');
  nouEstat(); V.config = true;
  await api.llibTitols([{ id: 'l01', nom: 'L’únic' }]);
  S = pinta(renderLlibres);
  igual(S.querySelectorAll('.icon-btn.danger').length, 0, 'amb un de sol no es pot treure');

  /* ===================== AVÍS DE LA PORTADA ===================== */

  bloc('26. Avís: vençut i en falten');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(20), fa(6));
  await api.llibAlumne('c1', '2nC|Dídac Roca', { llibre: 'l01' });
  await api.llibAlumne('c1', '2nC|Emma Vila', { llibre: 'l02', tornat: fa(5) });
  await api.llibAlumne('c1', '2nA|Anna Puig', { llibre: 'l03' });
  let Q = buildLlibresPanel();
  if (!Q) { T.cal(false, 'no surt l’avís'); } else {
    cal(/Llibres per tornar/.test(Q.querySelector('h3').textContent), 'títol «Llibres per tornar»');
    cal(!/totes les classes/.test(Q.querySelector('h3').textContent), 'sap quina és la meva classe');
    igual(Q.querySelectorAll('.hrow').length, 1, 'només el de la MEVA classe (2nC)');
    cal(/Dídac Roca · Tumbili/.test(Q.querySelector('.htitle').textContent), 'nom · llibre');
    igual(Q.querySelector('.hpanel-count').textContent, '1', 'comptador a 1');
    cal(/6 dies tard/.test(Q.textContent), 'i els dies de retard');
  }

  bloc('27. Marcar tornat des de la portada');
  Q = buildLlibresPanel();
  refrescs = 0;
  await Q.querySelector('.hbox').onclick({ stopPropagation() {} });
  igual(llibAlu(llibCicle('c1'), '2nC', 'Dídac Roca').tornat, AVUI, 'queda tornat');
  cal(refrescs > 0, 'i refresca la portada SENCERA (refreshHome, no renderDash)');
  cal(!buildLlibresPanel(), 'l’avís desapareix');

  bloc('28. El clic obre l’eina al cicle i la classe bons');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(20), fa(6));
  await api.llibAlumne('c1', '2nA|Anna Puig', { llibre: 'l03' });
  ME = 'cristina';
  Q = buildLlibresPanel();
  Q.querySelectorAll('.hrow')[0].onclick();
  igual([V.eina, V.cicle, V.classe, V.config, V.nav], ['llibres', 'c1', '2nA', false, true], 'deixa l’estat apuntant-hi');
  cal(obertures > 0, 'i obre la secció');

  bloc('29. Els altres tres motius per sortir');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', AVUI, dins(14));
  Q = buildLlibresPanel();
  cal(Q && /Avui es donen els llibres/.test(Q.textContent), 'el dia de donar-los');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(14), AVUI);
  Q = buildLlibresPanel();
  cal(Q && /Avui es recullen els llibres/.test(Q.textContent), 'el dia de recollir-los');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(2), dins(12));
  Q = buildLlibresPanel();
  cal(Q && /Llibres per repartir/.test(Q.querySelector('h3').textContent), 'passat el dia i sense repartir');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', dins(3), dins(17));
  cal(!buildLlibresPanel(), 'un cicle futur no molesta');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(20), fa(6));
  for (const c of ['2nA', '2nB', '2nC']) for (const n of STATE.students[c]) await api.llibAlumne('c1', stKey(c, n), { llibre: 'l01', tornat: fa(6) });
  cal(!buildLlibresPanel(), 'ni un cicle tancat');
  nouEstat();
  await cicleNou('c1', 'Llibres 1', fa(20), fa(6));   // vençut i ningú repartit
  cal(!buildLlibresPanel(), 'ni un de vençut que mai no es va repartir');

  bloc('30. Si no es pot saber la classe del tutor');
  nouEstat({ 'Grup 1': ['Anna Puig'], 'Grup 2': ['Bru Soler'] });
  await cicleNou('c1', 'Llibres 1', fa(20), fa(6));
  await api.llibAlumne('c1', 'Grup 1|Anna Puig', { llibre: 'l01' });
  await api.llibAlumne('c1', 'Grup 2|Bru Soler', { llibre: 'l02' });
  Q = buildLlibresPanel();
  if (Q) {
    cal(/totes les classes/.test(Q.querySelector('h3').textContent), 'ho diu al títol');
    igual(Q.querySelectorAll('.hrow').length, 2, 'i ensenya els dos');
    igual(Q.querySelectorAll('.hstatus').length, 2, 'amb el xip de classe a cada fila');
  }

  bloc('31. Topall de ' + LLIB_PANEL_MAX + ' files');
  nouEstat();
  STATE.students['2nC'] = Array.from({ length: LLIB_PANEL_MAX + 3 }, (_, i) => 'Alumne ' + (i + 1));
  await cicleNou('c1', 'Llibres 1', fa(20), fa(6));
  for (const n of STATE.students['2nC']) await api.llibAlumne('c1', stKey('2nC', n), { llibre: 'l01' });
  Q = buildLlibresPanel();
  if (Q) {
    igual(Q.querySelectorAll('.hrow').length, LLIB_PANEL_MAX + 1, LLIB_PANEL_MAX + ' files + el resum');
    cal(/i 3 alumnes més/.test(Q.textContent), 'i diu quants en queden');
    igual(Q.querySelector('.hpanel-count').textContent, String(LLIB_PANEL_MAX + 3), 'el comptador els compta tots');
  }

  T.acaba();
}
main();
