/* Prova de taula de «Gestió de grups» (§9): marques, notes, la capa de noms
   corregits i els repartiments. Executa el codi REAL d'index.html.

   node scripts/prova_grups.js        (cal: npm i jsdom)  */
const P = require('./prova_comu');
const { tros, munta, ajudants, comptador } = P;

munta('<div id="sec"></div><div id="toast"></div>');
const T = comptador('grups');
const { el, esc, norm, uid, plural, deDe } = ajudants();
global.el = el;

/* ---------- el codi real ---------- */
const portBackend = tros('function fbArribaTard(', '/* === PORT DEL BACKEND: fi === */', 'fbApply');
const grups = tros('const GRUP_ETIQ_SEED=', '/* ============ REGISTRE DE LLIBRES A CASA ============', 'gestió de grups');
const stKeySrc = tros('function stKey(cls, name)', 'function stLlegeix(', 'stKey');
const classeSrc = tros('function studentClass(name)', 'function classColor(', 'studentClass');
const inicialsSrc = tros('function autInicials(', 'function autTextQueFalta(', 'autInicials');

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
let brindis = []; const toast = m => brindis.push(m);
let ULTIM_CONFIRM = null;
const askConfirm = (msg, onYes, opts) => { ULTIM_CONFIRM = { msg, onYes, opts: opts || {} }; };
let ULTIM_PROMPT = null;
const askPrompt = (o, cb) => { ULTIM_PROMPT = { o, cb }; };
let obertures = 0; const openSection = () => { obertures++; };
let heros = []; const buildSecHero = (S, sec, o) => { heros.push((o && o.title) || sec.name); };
let GRP_RESULT = null, GRP_SIZE = 4;
let STATE = {};

const CUA = [];
const api = {
  async grupEtiquetes(ets) { grupDades().etiquetes = ets || []; CUA.push(['grupEtiquetes', { etiquetes: ets }]); },
  /* ⚠️ Els noms dels camps han de ser EXACTAMENT els de l'api de debò: fbApply els
     llegeix pel nom, i un «etiq» en comptes d'«etiqueta» fa que el backend esborri
     coses que no toquen. La comprovació del bloc 11 és justament per enxampar-ho. */
  async grupMarca(alumne, etiqueta, on) {
    const g = grupDades();
    const m = g.marques[alumne] = g.marques[alumne] || {};
    if (on) m[etiqueta] = true;
    else { delete m[etiqueta]; if (!Object.keys(m).length) delete g.marques[alumne]; }
    CUA.push(['grupMarca', { alumne, etiqueta, on: !!on }]);
  },
  async grupNota(alumne, text) {
    const g = grupDades(); const t = String(text || '').trim();
    if (t) g.notes[alumne] = t; else delete g.notes[alumne];
    CUA.push(['grupNota', { alumne, text: t }]);
  },
  async grupNom(alumne, nom) {
    const g = grupDades(); const n = String(nom || '').trim();
    if (n) g.noms[alumne] = n; else delete g.noms[alumne];
    CUA.push(['grupNom', { alumne, nom: n }]);
  },
  async grupConjuntUpsert(conj) {
    const g = grupDades();
    const i = g.conjunts.findIndex(x => x.id === conj.id);
    const c = JSON.parse(JSON.stringify(conj));
    if (i < 0) g.conjunts.push(c); else g.conjunts[i] = c;
    CUA.push(['grupConjuntUpsert', { conjunt: c }]);
  },
  async grupConjuntDelete(id) {
    const g = grupDades();
    g.conjunts = g.conjunts.filter(x => x.id !== id);
    CUA.push(['grupConjuntDelete', { id }]);
  },
};

eval(stKeySrc + '\n' + classeSrc + '\n' + inicialsSrc + '\n' + portBackend + '\n' + grups
  + '\n;global.V = { get vista(){ return GRUPS_VIEW; }, set vista(v){ GRUPS_VIEW = v; },'
  + '              get classe(){ return GRUPS_CLASS; }, set classe(v){ GRUPS_CLASS = v; },'
  + '              get conj(){ return GRUPS_CONJ; }, set conj(v){ GRUPS_CONJ = v; },'
  + '              get cfg(){ return GRUPS_ETIQ_CFG; }, set cfg(v){ GRUPS_ETIQ_CFG = v; },'
  + '              get nav(){ return GRUPS_NAV; }, get eina(){ return PENDING_EINA; } };');

const SEC = { id: 'grups', name: 'Gestió de grups', desc: 'Marques, noms i grups.' };
function nouEstat(alumnes) {
  STATE = {
    grups: { etiquetes: [], marques: {}, notes: {}, noms: {}, conjunts: [] },
    students: alumnes || { '2nA': ['Anna Puig', 'Bru Soler'], '2nB': ['Cesc Mir'], '2nC': ['Dídac Roca', 'Emma Vila'] },
    flags: {},
  };
  V.vista = 'alumnes'; V.classe = null; V.conj = null; V.cfg = false;
  CUA.length = 0; obertures = 0; heros = []; brindis = []; ME = 'pol';
  ULTIM_CONFIRM = null; ULTIM_PROMPT = null; GRP_RESULT = null;
}
const esperaMicro = () => new Promise(r => setTimeout(r, 0));

async function main() {
  const { cal, igual, pinta, bloc } = T;

  /* ===================== LÒGICA ===================== */

  bloc('1. Les etiquetes');
  nouEstat();
  igual(grupEtiq().map(e => e.id), ['pi', 'conducta'], 'la sembra porta PI i Conducta');
  await api.grupEtiquetes(grupEtiq().concat([{ id: 'x1', nom: 'Logopèdia' }]));
  igual(grupEtiq().length, 3, 'la primera edició materialitza la sembra sencera');
  igual(autInicials('Dret de veu'), 'DV', 'les inicials ignoren «de/d’/la»');
  igual(autInicials('Conducta'), 'CON', 'i d’una paraula sola, les tres primeres lletres');

  bloc('2. Marques, granulars per alumne');
  nouEstat();
  await api.grupMarca('2nC|Dídac Roca', 'pi', true);
  cal(grupTe('2nC', 'Dídac Roca', 'pi'), 'queda marcat');
  cal(!grupTe('2nC', 'Emma Vila', 'pi'), 'i no toca ningú més');
  cal(!grupTe('2nA', 'Dídac Roca', 'pi'), 'ni un homònim d’una altra classe');
  igual(grupCompta('pi'), 1, 'el comptador en diu 1');
  await api.grupMarca('2nC|Dídac Roca', 'pi', false);
  cal(!grupTe('2nC', 'Dídac Roca', 'pi'), 'i es pot treure');
  igual(grupDades().marques['2nC|Dídac Roca'], undefined, 'sense marques, l’alumne desapareix del mapa');

  bloc('3. Treure una etiqueta NO esborra les marques');
  nouEstat();
  await api.grupMarca('2nC|Dídac Roca', 'conducta', true);
  await api.grupEtiquetes([{ id: 'pi', nom: 'PI' }]);              // fora «Conducta»
  igual(grupEtiq().map(e => e.id), ['pi'], 'la llista es queda només amb PI');
  cal(grupTe('2nC', 'Dídac Roca', 'conducta'), 'però la marca hi segueix');
  await api.grupEtiquetes([{ id: 'pi', nom: 'PI' }, { id: 'conducta', nom: 'Conducta' }]);
  cal(grupTe('2nC', 'Dídac Roca', 'conducta'), 'i en tornar-la a posar, es torna a veure');

  bloc('4. Notes');
  nouEstat();
  await api.grupNota('2nC|Emma Vila', '  No la posis amb en Dídac  ');
  igual(grupNotaDe('2nC', 'Emma Vila'), 'No la posis amb en Dídac', 'es desa sense espais');
  cal(grupTeAlgunaCosa('2nC', 'Emma Vila'), 'i compta com a «alguna cosa marcada»');
  cal(!grupTeAlgunaCosa('2nC', 'Dídac Roca'), 'qui no en té, no');
  await api.grupNota('2nC|Emma Vila', '   ');
  igual(grupNotaDe('2nC', 'Emma Vila'), '', 'una nota buida la treu');

  bloc('5. La capa de noms: corregeix com es MOSTRA, no la clau');
  nouEstat();
  await api.grupMarca('2nC|Dídac Roca', 'pi', true);
  await api.grupNom('2nC|Dídac Roca', 'Dídac R.');
  igual(stMostra('2nC', 'Dídac Roca'), 'Dídac R.', 'es mostra corregit');
  igual(stMostra('2nC', 'Emma Vila'), 'Emma Vila', 'i qui no té correcció, igual');
  cal(grupTe('2nC', 'Dídac Roca', 'pi'), '⚠️ la marca SEGUEIX valent: la clau no ha canviat');
  igual(Object.keys(grupDades().marques), ['2nC|Dídac Roca'], 'cap registre queda orfe');
  igual(grupTextLlista('2nC'), 'Dídac R.\nEmma Vila', 'la llista per enganxar al full va corregida');
  await api.grupNom('2nC|Dídac Roca', '');
  igual(stMostra('2nC', 'Dídac Roca'), 'Dídac Roca', 'i es pot desfer');

  bloc('6. stMostraNom, quan només tenim el nom solt');
  nouEstat();
  await api.grupNom('2nC|Dídac Roca', 'Dídac R.');
  igual(stMostraNom('Dídac Roca'), 'Dídac R.', 'troba la classe sol');
  igual(stMostraNom('Dídac Roca (2nC)'), 'Dídac R. (2nC)', 'i respecta el sufix de classe');
  igual(stMostraNom('Ningú'), 'Ningú', 'un nom que no hi és, tal qual');

  bloc('7. Homònims: grupResolClau');
  nouEstat({ '2nA': ['Anna Puig'], '2nC': ['Anna Puig', 'Dídac Roca'] });
  igual(grupResolClau('Anna Puig (2nA)', null, new Set()), '2nA|Anna Puig', 'el sufix mana');
  igual(grupResolClau('Anna Puig', '2nC', new Set()), '2nC|Anna Puig', 'si no, la classe de la secció');
  const gastats = new Set();
  const k1 = grupResolClau('Anna Puig', null, gastats); gastats.add(k1);
  const k2 = grupResolClau('Anna Puig', null, gastats);
  igual([k1, k2], ['2nA|Anna Puig', '2nC|Anna Puig'],
    'i si no, la primera classe que encara no s’hagi fet servir (bug real: les dues Annes)');

  bloc('8. grupParteix');
  nouEstat();
  await api.grupNom('2nC|Dídac Roca', 'Dídac R.');
  igual(grupParteix('2nC|Dídac Roca'), { cls: '2nC', nom: 'Dídac Roca', mostra: 'Dídac R.' }, 'parteix la clau');
  igual(grupParteix('Emma Vila').cls, '', 'i tolera una clau sense classe');

  bloc('9. grupMarcatsPlans (el que veu el generador)');
  nouEstat();
  STATE.flags = { 'Cesc Mir': true };
  await api.grupMarca('2nC|Dídac Roca', 'pi', true);
  const plans = grupMarcatsPlans();
  cal(plans['Cesc Mir'], 'les marques del full segueixen valent');
  cal(plans['Dídac Roca'], 'i s’hi sumen les d’aquí, pel nom solt');
  cal(!plans['Emma Vila'], 'qui no té res, no hi surt');

  bloc('10. Repartiments: pool i membres');
  nouEstat();
  const conj = {
    id: 'c1', nom: 'Primer trimestre', creat: new Date().toISOString(), by: 'pol', classes: ['2nC'],
    grups: [{ id: 'g1', nom: 'Els dracs', membres: ['2nC|Dídac Roca'] }, { id: 'g2', nom: 'Grup 2', membres: [] }],
  };
  await api.grupConjuntUpsert(conj);
  igual(grupConjunts().length, 1, 'es desa');
  igual(grupMembresTots(grupConjuntDe('c1')), ['2nC|Dídac Roca'], 'els membres de tots els grups');
  igual(grupPool(grupConjuntDe('c1')), ['2nC|Emma Vila'], 'i el pool, qui queda fora');
  igual(grupPool({ classes: [], grups: [] }), [], 'sense classes, el pool és buit');

  /* ===================== fbApply ===================== */

  bloc('11. fbApply desa exactament el mateix que l’app');
  nouEstat();
  await api.grupEtiquetes([{ id: 'pi', nom: 'PI' }, { id: 'x', nom: 'Logopèdia' }]);
  await api.grupMarca('2nC|Dídac Roca', 'pi', true);
  await api.grupMarca('2nC|Dídac Roca', 'x', true);
  await api.grupMarca('2nC|Dídac Roca', 'x', false);
  await api.grupNota('2nC|Emma Vila', 'Una nota');
  await api.grupNom('2nC|Dídac Roca', 'Dídac R.');
  await api.grupConjuntUpsert({ id: 'c1', nom: 'Un', classes: ['2nC'], grups: [{ id: 'g1', nom: 'G1', membres: ['2nC|Emma Vila'] }] });
  await api.grupConjuntUpsert({ id: 'c2', nom: 'Dos', classes: ['2nA'], grups: [] });
  await api.grupConjuntDelete('c2');
  const local = JSON.parse(JSON.stringify(STATE.grups));
  const servidor = { grups: { etiquetes: [], marques: {}, notes: {}, noms: {}, conjunts: [] } };
  CUA.forEach(([a, p]) => fbApply(servidor, a, p));
  igual(servidor.grups, local, 'el backend arriba al mateix estat');
  CUA.forEach(([a, p]) => fbApply(servidor, a, p));
  igual(servidor.grups, local, 'i reenviar el lot no duplica res');

  /* ===================== PINTAT ===================== */

  bloc('12. Vista «Alumnes»');
  nouEstat();
  await api.grupMarca('2nC|Dídac Roca', 'pi', true);
  await api.grupNota('2nC|Emma Vila', 'No la posis amb en Dídac');
  let S = pinta(x => renderGestioGrups(x, SEC));
  if (S) {
    igual(S.querySelectorAll('.prog-segbtn').length, 2, 'les dues vistes');
    igual(S.querySelectorAll('.att-tab').length, 3, 'les 3 classes');
    cal(/^2nC/.test(S.querySelector('.att-tab.on').textContent), 'per defecte la del tutor');
    igual(S.querySelectorAll('.aut-fila:not(.aut-cap)').length, 2, 'els 2 alumnes de 2nC');
    igual([...S.querySelectorAll('.aut-resum span')].map(x => x.textContent), ['1', '0'], 'els comptadors per etiqueta');
    igual(S.querySelectorAll('.aut-check.on').length, 1, 'una marca posada');
    const subs = [...S.querySelectorAll('.gg-fila-sub')];
    igual(subs.filter(x => !x.hidden).length, 1, 'i NOMÉS es veu la nota de qui en té');
    cal(/No la posis/.test(subs.find(x => !x.hidden).textContent), 'amb el text');
  }

  bloc('13. Clicar una marca');
  S = pinta(x => renderGestioGrups(x, SEC));
  obertures = 0;
  const check = S.querySelectorAll('.aut-fila:not(.aut-cap)')[0].querySelectorAll('.aut-check')[1];
  await check.onclick();
  cal(grupTe('2nC', 'Dídac Roca', 'conducta'), 'queda marcada');
  igual([...S.querySelectorAll('.aut-resum span')].map(x => x.textContent), ['1', '1'], 'els comptadors pugen sols');
  cal(/^2nC \(2\/2\)/.test(S.querySelector('.att-tab.on').textContent), 'i la pestanya de classe');
  igual(obertures, 0, 'sense repintar la secció');

  bloc('14. Corregir el nom des de la graella');
  S = pinta(x => renderGestioGrups(x, SEC));
  S.querySelector('.gg-llapis').onclick();
  cal(!!ULTIM_PROMPT && /Al full hi diu «Dídac Roca»/.test(ULTIM_PROMPT.o.label), 'diu què hi ha al full');
  ULTIM_PROMPT.cb('Dídac R.');
  await esperaMicro();
  igual(S.querySelector('.gg-nom').textContent, 'Dídac R.', 'la fila s’actualitza sola');
  cal(S.querySelector('.gg-nom').classList.contains('gg-nom-canviat'), 'i es marca com a corregit');
  igual(obertures, 0, 'tampoc cal repintar');

  bloc('15. «Què marquem»');
  nouEstat(); V.cfg = true;
  S = pinta(x => renderGestioGrups(x, SEC));
  if (S) {
    igual(S.querySelectorAll('.aut-config-row').length, 2, 'les dues etiquetes sembrades');
    const inp = S.querySelectorAll('.aut-config-row input')[0];
    inp.value = 'Pla individualitzat';
    await inp.onchange(); await esperaMicro();
    igual(grupEtiq()[0].nom, 'Pla individualitzat', 'es poden reanomenar');
  }

  bloc('16. Copiar la llista de la classe');
  nouEstat();
  await api.grupNom('2nC|Dídac Roca', 'Dídac R.');
  S = pinta(x => renderGestioGrups(x, SEC));
  const copia = [...S.querySelectorAll('.att-actions .btn')].find(b => /Copia la llista/.test(b.textContent));
  cal(!!copia, 'hi ha el botó');
  copia.onclick();
  cal(/Dídac R\.\nEmma Vila/.test(S.querySelector('.att-result pre').textContent), 'i surt amb els noms corregits');

  bloc('17. Repartiments (buit)');
  nouEstat(); V.vista = 'conjunts';
  S = pinta(x => renderGestioGrups(x, SEC));
  if (S) {
    cal(/Encara no hi ha cap repartiment/.test(S.textContent), 'ho diu');
    igual([...S.querySelectorAll('.att-actions .btn')].map(b => b.textContent),
      ['Repartiment nou', 'Generador automàtic'], 'amb els dos botons');
  }

  bloc('18. Crear-ne un');
  S.querySelectorAll('.att-actions .btn')[0].onclick();
  cal(!!ULTIM_PROMPT, 'demana el nom');
  cal(ULTIM_PROMPT.cb('') === false, 'un nom buit no val');
  ULTIM_PROMPT.cb('Grups de treball');
  await esperaMicro();
  const c = grupConjunts()[0];
  igual(c.nom, 'Grups de treball', 'es crea amb el nom');
  igual(c.grups.length, 4, 'i surten 4 grups buits');
  igual(c.classes, ['2nC'], 'amb la classe del tutor');
  cal(V.conj === c.id, 'i queda obert');

  bloc('19. Gestionar-lo: moure un alumne');
  V.vista = 'conjunts';
  S = pinta(x => renderGestioGrups(x, SEC));
  igual(heros[heros.length - 1], 'Grups de treball', 'la capçalera porta el nom del repartiment');
  igual(S.querySelectorAll('.gg-grup').length, 4, 'els 4 grups');
  igual(S.querySelectorAll('.gg-pool .gg-membre').length, 2, 'i els 2 alumnes sense grup');
  const sel = S.querySelector('.gg-pool .gg-membre select');
  sel.value = grupConjuntDe(c.id).grups[1].id;
  await sel.onchange(); await esperaMicro();
  igual(grupConjuntDe(c.id).grups[1].membres, ['2nC|Dídac Roca'], 'l’alumne passa al grup triat');
  igual(grupPool(grupConjuntDe(c.id)).length, 1, 'i surt del pool');

  bloc('20. «Reparteix-los»');
  S = pinta(x => renderGestioGrups(x, SEC));
  await [...S.querySelectorAll('.gg-pool .btn')].find(b => /Reparteix/.test(b.textContent)).onclick();
  await esperaMicro();
  igual(grupPool(grupConjuntDe(c.id)).length, 0, 'ja no queda ningú fora');
  igual(grupConjuntDe(c.id).grups.filter(g => g.membres.length).length, 2, 'repartits al grup amb menys gent');

  bloc('21. Reanomenar un grup i treure’l');
  S = pinta(x => renderGestioGrups(x, SEC));
  const inpG = S.querySelector('.gg-grup-cap input');
  inpG.value = 'Els dracs';
  await inpG.onchange(); await esperaMicro();
  igual(grupConjuntDe(c.id).grups[0].nom, 'Els dracs', 'es reanomena');
  S = pinta(x => renderGestioGrups(x, SEC));
  const ambGent = [...S.querySelectorAll('.gg-grup')].find(g => g.querySelector('.gg-membre'));
  ambGent.querySelector('.icon-btn.danger').onclick();
  cal(!!ULTIM_CONFIRM && /quedaran sense grup/.test(ULTIM_CONFIRM.msg), 'avisa que els membres quedaran fora');
  await ULTIM_CONFIRM.onYes(); await esperaMicro();
  igual(grupConjuntDe(c.id).grups.length, 3, 'el grup marxa');
  cal(grupPool(grupConjuntDe(c.id)).length > 0, 'i els seus membres tornen al pool');

  bloc('22. Quines classes hi entren');
  nouEstat();
  await api.grupConjuntUpsert({ id: 'c1', nom: 'Un', creat: new Date().toISOString(), by: 'pol',
    classes: ['2nC', '2nA'], grups: [{ id: 'g1', nom: 'G1', membres: ['2nC|Dídac Roca', '2nA|Anna Puig'] }] });
  V.vista = 'conjunts'; V.conj = 'c1';
  S = pinta(x => renderGestioGrups(x, SEC));
  igual(S.querySelectorAll('.att-tab.on').length, 2, 'dues classes marcades');
  const treu = [...S.querySelectorAll('.att-tab')].find(t => /^✓ 2nA/.test(t.textContent));
  await treu.onclick(); await esperaMicro();
  igual(grupConjuntDe('c1').classes, ['2nC'], 'treure una classe la treu del repartiment');
  igual(grupConjuntDe('c1').grups[0].membres, ['2nC|Dídac Roca'],
    'i també els seus membres (si no, quedarien alumnes fantasma)');

  bloc('23. Copiar i esborrar el repartiment');
  S = pinta(x => renderGestioGrups(x, SEC));
  [...S.querySelectorAll('.att-actions .btn')].find(b => /Copia els grups/.test(b.textContent)).onclick();
  const text = S.querySelector('.att-result pre').textContent;
  cal(/^Un/.test(text), 'el text comença pel nom');
  cal(/G1 \(1\):/.test(text), 'amb cada grup i quants són');
  cal(/- Dídac Roca/.test(text), 'i els noms');
  cal(/Sense grup:/.test(text), 'i qui queda fora');
  [...S.querySelectorAll('.att-actions .btn-danger')].find(b => /Esborra/.test(b.textContent)).onclick();
  await ULTIM_CONFIRM.onYes(); await esperaMicro();
  igual(grupConjunts().length, 0, 'esborrat');

  bloc('24. Desa els grups del generador');
  nouEstat({ '2nA': ['Anna Puig'], '2nC': ['Anna Puig', 'Dídac Roca'] });
  GRP_RESULT = { sections: [{ label: '2nC', groups: [['Anna Puig', 'Dídac Roca']] }] };
  await grupDesaDelGenerador(); await esperaMicro();
  const g = grupConjunts()[0];
  igual(g.grups[0].membres, ['2nC|Anna Puig', '2nC|Dídac Roca'],
    '⚠️ agafa l’Anna de 2nC, no la de 2nA (bug real dels homònims)');
  igual(g.classes, ['2nC'], 'i la classe del repartiment');
  cal(V.nav && V.conj === g.id, 'deixa l’app apuntant-hi');

  bloc('25. Sense alumnes al full');
  nouEstat({});
  S = pinta(x => renderGestioGrups(x, SEC));
  cal(S && /No hi ha alumnes/.test(S.textContent), 'ho diu i no peta');

  bloc('26. Robustesa');
  nouEstat();
  delete STATE.grups;
  cal(!!grupDades().etiquetes, 'grupDades reconstrueix l’estat si falta');
  igual(grupEtiq().length, 2, 'i la sembra hi torna a ser');
  STATE.grups = { conjunts: [{ id: 'x' }] };                    // un conjunt a mig fer
  igual(grupMembresTots(grupConjuntDe('x')), [], 'un conjunt sense grups no peta');
  igual(grupPool(grupConjuntDe('x')), [], 'ni el seu pool');

  T.acaba();
}
main();
