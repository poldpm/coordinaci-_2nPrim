/* Prova de taula dels «Avisos ràpids» (§9): el modal, la targeta de banda a banda
   de la portada, contestar sense sortir-ne, el botó de la barra de dalt i que NO
   es dupliquin a Novetats. Executa el codi REAL d'index.html.

   node scripts/prova_avisos.js        (cal: npm i jsdom)  */
const P = require('./prova_comu');
const { tros, constant, munta, ajudants, comptador } = P;

munta(`<header class="topbar">
    <button class="avis-pill" id="avisBtn" title="Avisos"><span class="lbl">Avisos</span></button>
    <button class="me" id="meBtn"></button>
  </header>
  <div id="home"><div id="dashCols"></div><div id="dashBlock"></div>
    <div id="avisBlock" style="display:none"><div id="avisWrap"></div></div>
    <div id="novetats"></div><div id="novBlock"></div><span id="novCount"></span></div>
  <div id="bento"></div><div id="section" class="hidden"></div><div id="toast"></div>`);

const T = comptador('avisos');
const { el, esc, stripHtml, norm, uid, nowISO, fmtDate, plural, deDe, avatarEl } = ajudants();
const $ = s => document.querySelector(s);
global.el = el;

/* ---------- el codi real ---------- */
const codiAvisos = tros('const AVIS_SEC=', 'function novItems(){', 'avisos');
const novItemsSrc = tros('function novItems(){', 'function isoDate(', 'novItems');
const seccionsSrc = tros('const SECTIONS = [', 'const secById', 'SECTIONS');
const colorsSrc = tros('function _relLum(hex){', '/* ============================================================\n   VISTA DE SECCIÓ', 'colors');
const badgeSrc = tros('function sectionBadge(sec){', 'function renderBento(){', 'sectionBadge');
const bentoSrc = tros('function renderBento(){', 'function metaLabel(sec){', 'renderBento');
const metaSrc = tros('function metaLabel(sec){', '/* Plurals i apostrofacio', 'metaLabel');
const AVIS_PANEL_MAX = constant('AVIS_PANEL_MAX', codiAvisos);

/* ---------- bastida ---------- */
const ICONS = { avis: '<path d="M0 0"/>' };
const USERS = [
  { id: 'mireia', name: 'Mireia', accent: 'var(--mireia)', ink: '#9C5C12' },
  { id: 'cristina', name: 'Cristina', accent: 'var(--cristina)', ink: '#B84371' },
  { id: 'pol', name: 'Pol', accent: 'var(--pol)', ink: '#4356C9' },
];
const userById = id => USERS.find(u => u.id === id) || USERS[0];
let brindis = []; const toast = m => brindis.push(m);
let ME = 'pol';
const OPEN_COMMENTS = new Set();
let STATE = {};
let obertures = [], dashos = 0, novs = 0, flashos = [], desmuntats = 0;
const openSection = id => { obertures.push(id); };
const renderDash = () => { dashos++; renderAvisosHome(); };
const renderNovetats = () => { novs++; };
const renderBento = () => {};
const refreshHome = () => { renderDash(); renderNovetats(); };
const openAndFlash = id => { flashos.push(id); };
const jaCreatAra = () => null;
const wireModal = () => () => { desmuntats++; };
let BOOTING = false, DEMO_MODE = false;
const entryHasUnseenComments = entryId => {
  const fils = (STATE.comments || {})[entryId] || [];
  return fils.some(t => (t.author !== ME && !(t.seenBy || []).includes(ME))
    || (t.replies || []).some(r => r.author !== ME && !(r.seenBy || []).includes(ME)));
};
const CUA = [];
const api = {
  async addEntry(e) { STATE.entries.push(e); CUA.push(['addEntry', e.id]); },
  async entryRead(id) {
    const e = STATE.entries.find(x => x.id === id);
    if (e) e.readBy = (e.readBy || []).concat(ME);
    CUA.push(['entryRead', id]);
  },
  async commentAdd(entryId, c) {
    STATE.comments = STATE.comments || {};
    (STATE.comments[entryId] = STATE.comments[entryId] || []).push(c);
    CUA.push(['commentAdd', entryId]);
  },
  async commentSeen(id) {
    ((STATE.comments || {})[id] || []).forEach(t => {
      t.seenBy = (t.seenBy || []).concat(ME);
      (t.replies || []).forEach(r => { r.seenBy = (r.seenBy || []).concat(ME); });
    });
    CUA.push(['commentSeen', id]);
  },
};

/* Les `let` de dins d'un eval no surten al nostre àmbit: hi deixem una finestreta. */
eval(seccionsSrc + '\n' + colorsSrc + '\n' + badgeSrc + '\n'
  + bentoSrc.replace('function renderBento(){', 'function renderBentoReal(){')
  + '\n' + metaSrc + '\n' + codiAvisos + '\n' + novItemsSrc
  + '\n;global.V = { get reply(){ return AVIS_REPLY; }, set reply(v){ AVIS_REPLY = v; },'
  + '              get draft(){ return AVIS_DRAFT; }, set draft(v){ AVIS_DRAFT = v; } };');

function nouEstat() {
  STATE = {
    entries: [], tasks: [], comments: {}, subthemes: [], correus: [],
    grups: { etiquetes: [], marques: {}, notes: {}, noms: {}, conjunts: [] },
  };
  obertures = []; flashos = []; dashos = 0; novs = 0; CUA.length = 0; desmuntats = 0;
  brindis = []; ME = 'pol';
  OPEN_COMMENTS.clear();
  document.querySelectorAll('.modal').forEach(m => m.remove());
  const b = $('#avisBtn');
  b.className = 'avis-pill';
  b.querySelectorAll('.avis-badge,.t-alerta').forEach(x => x.remove());
  $('#bento').innerHTML = '';
  $('#avisWrap').innerHTML = ''; $('#avisBlock').style.display = 'none';
  V.reply = null; V.draft = '';
}
const T2 = n => new Date(Date.now() - n * 60000).toISOString();
function avis(o) {
  const ts = o.t || nowISO();
  const e = {
    id: o.id, section: 'avisos', subtheme: null, author: o.author, title: '', body: o.body,
    rich: false, url: '', date: ts, createdAt: ts, updatedAt: ts, readBy: o.readBy || [o.author],
  };
  STATE.entries.push(e);
  return e;
}
const esperaMicro = () => new Promise(r => setTimeout(r, 0));

async function main() {
  const { cal, igual, bloc } = T;

  bloc('1. Qui ha de veure què');
  nouEstat(); ME = 'pol';
  const a1 = avis({ id: 'a1', author: 'cristina', body: 'Demà sortida a les 9' });
  igual(avisosTots().length, 1, 'hi ha un avís');
  cal(avisNoLlegit(a1), 'per a en Pol és nou');
  ME = 'cristina'; cal(!avisNoLlegit(a1), 'per a qui l’ha escrit, no');
  ME = 'pol';
  igual(avisQuiFalta(a1).map(u => u.id).sort(), ['mireia', 'pol'], 'falten la Mireia i en Pol');
  await api.entryRead('a1');
  cal(!avisNoLlegit(a1), 'un cop llegit, ja no és nou');
  igual(avisQuiFalta(a1).map(u => u.id), ['mireia'], 'i només falta la Mireia');

  bloc('2. Una entrada normal NO és un avís');
  nouEstat();
  STATE.entries.push({ id: 'n1', section: 'general', author: 'cristina', body: 'x', readBy: [], date: nowISO() });
  igual(avisosTots().length, 0, 'una entrada d’Aspectes generals no hi surt');

  bloc('3. Quins surten a la portada');
  nouEstat(); ME = 'pol';
  avis({ id: 'x1', author: 'cristina', body: 'no llegit', readBy: ['cristina'] });
  avis({ id: 'x2', author: 'cristina', body: 'llegit per tots', readBy: ['cristina', 'mireia', 'pol'] });
  avis({ id: 'x3', author: 'pol', body: 'meu, falta la Mireia', readBy: ['pol', 'cristina'] });
  avis({ id: 'x4', author: 'pol', body: 'meu, llegit per tots', readBy: ['pol', 'cristina', 'mireia'] });
  igual(avisActius().map(e => e.id).sort(), ['x1', 'x3'], 'el no llegit i el meu que falta algú');
  igual(avisPendentsMeus().map(e => e.id), ['x1'], 'el comptador: només el que he de llegir jo');
  STATE.comments['x2'] = [{ id: 'c1', author: 'mireia', text: 'ep!', createdAt: nowISO(), seenBy: ['mireia'] }];
  igual(avisActius().map(e => e.id).sort(), ['x1', 'x2', 'x3'], 'amb comentaris nous també hi surt');
  nouEstat(); ME = 'pol';
  avis({ id: 'y1', author: 'cristina', body: 'b', readBy: ['cristina', 'pol', 'mireia'] });
  STATE.comments['y1'] = [{ id: 'c2', author: 'pol', text: 'meu', createdAt: nowISO(), seenBy: ['pol'] }];
  igual(avisActius().length, 0, 'un comentari MEU no em reclama res');

  bloc('4. Ordre: el més nou primer');
  nouEstat(); ME = 'pol';
  avis({ id: 'o1', author: 'cristina', body: 'vell', readBy: ['cristina'], t: T2(100) });
  avis({ id: 'o2', author: 'mireia', body: 'nou', readBy: ['mireia'], t: T2(2) });
  avis({ id: 'o3', author: 'cristina', body: 'mig', readBy: ['cristina'], t: T2(30) });
  igual(avisActius().map(e => e.id), ['o2', 'o3', 'o1'], 'el més nou primer');

  bloc('5. El comptador del botó de dalt');
  nouEstat(); ME = 'pol';
  updateAvisBadge();
  cal(!$('#avisBtn').querySelector('.avis-badge'), 'sense avisos, cap comptador');
  cal(!$('#avisBtn').classList.contains('te'), 'ni el botó destacat');
  avis({ id: 'b1', author: 'cristina', body: '1', readBy: ['cristina'] });
  avis({ id: 'b2', author: 'mireia', body: '2', readBy: ['mireia'] });
  updateAvisBadge();
  igual($('#avisBtn').querySelector('.avis-badge').textContent, '2', 'el comptador diu 2');
  cal($('#avisBtn').classList.contains('te'), 'i el botó es destaca');
  cal(/2 avisos per llegir/.test($('#avisBtn').title), 'el title ho diu');
  await api.entryRead('b1'); await api.entryRead('b2');
  updateAvisBadge();
  cal(!$('#avisBtn').querySelector('.avis-badge'), 'llegits tots dos, fora comptador');

  bloc('6. Comentaris: punt de color, NO número');
  nouEstat(); ME = 'pol';
  avis({ id: 'k1', author: 'cristina', body: 'llegit per tots', readBy: ['cristina', 'pol', 'mireia'] });
  STATE.comments['k1'] = [{ id: 'c1', author: 'mireia', text: 'ep!', createdAt: nowISO(), seenBy: ['mireia'] }];
  igual(avisNoLlegits().length, 0, 'cap per llegir');
  igual(avisComentarisNous().length, 1, 'un amb comentaris nous');
  updateAvisBadge();
  cal(!$('#avisBtn').querySelector('.avis-badge'), 'els comentaris no fan número');
  cal(!!$('#avisBtn').querySelector('.t-alerta'), 'sinó un punt de color');
  cal(/comentaris nous/.test($('#avisBtn').title), 'i el title ho explica');
  avis({ id: 'j1', author: 'cristina', body: 'no llegit', readBy: ['cristina'] });
  updateAvisBadge();
  igual($('#avisBtn').querySelector('.avis-badge').textContent, '1', 'amb un per llegir, número 1');
  cal(!$('#avisBtn').querySelector('.t-alerta'), 'i sense punt (el número ja crida prou)');
  cal(/1 avís per llegir · 1 amb comentaris nous/.test($('#avisBtn').title), 'però el title ho diu tot');

  bloc('7. El modal d’escriure');
  nouEstat(); ME = 'pol';
  obreAvisRapid();
  let box = document.querySelector('.avis-modal');
  cal(!!box, 's’obre');
  if (box) {
    igual(box.querySelector('h3').textContent, 'Avís ràpid', 'amb el títol');
    cal(!!box.querySelector('.avis-ta'), 'una caixa de text');
    cal(box.querySelector('.avis-veure').disabled, 'sense avisos, «veure’ls tots» desactivat');
    const si = box.querySelectorAll('.btn-primary')[0];
    si.onclick(); await esperaMicro();
    igual(STATE.entries.length, 0, 'un avís buit no es publica');
    cal(!box.querySelector('.modal-err').hidden, 'i ho diu');
    box.querySelector('.avis-ta').value = '  Demà la sortida surt a les 9  ';
    si.onclick(); await esperaMicro();
    igual(STATE.entries.length, 1, 'publicat');
    const e = STATE.entries[0];
    igual([e.section, e.body, e.author, e.readBy, e.rich],
      ['avisos', 'Demà la sortida surt a les 9', 'pol', ['pol'], false],
      'a la secció avisos, net d’espais, firmat per mi i ja llegit');
    cal(!document.querySelector('.avis-modal'), 'el modal es tanca');
    cal(dashos >= 1, 'i refresca la portada');
  }

  bloc('8. «Veure els avisos» del modal');
  nouEstat();
  avis({ id: 'v1', author: 'cristina', body: 'a', readBy: ['cristina'] });
  avis({ id: 'v2', author: 'cristina', body: 'b', readBy: ['cristina'] });
  obreAvisRapid();
  box = document.querySelector('.avis-modal');
  const v = box.querySelector('.avis-veure');
  cal(!v.disabled, 'activat quan n’hi ha');
  igual(v.textContent, 'Veure els 2 avisos', 'amb el compte');
  v.onclick();
  igual(obertures, ['avisos'], 'obre la secció d’avisos');
  nouEstat(); avis({ id: 'v3', author: 'cristina', body: 'a', readBy: ['cristina'] });
  obreAvisRapid();
  igual(document.querySelector('.avis-veure').textContent, 'Veure l’avís que hi ha',
    'i amb un de sol, en català correcte');
  document.querySelectorAll('.modal').forEach(m => m.remove());

  bloc('9. La targeta de la portada');
  nouEstat(); ME = 'pol';
  cal(buildAvisosPanel() === null, 'sense avisos, cap targeta');
  avis({ id: 'p1', author: 'cristina', body: 'Demà sortida a les 9', readBy: ['cristina'] });
  let Q = buildAvisosPanel();
  if (Q) {
    cal(Q.classList.contains('avis-panel'), 'és la targeta vermella');
    igual(Q.querySelectorAll('.avis-item').length, 1, '1 avís');
    igual(Q.querySelector('.hpanel-count').textContent, '1', 'comptador 1');
    igual(Q.querySelector('.avis-text').textContent, 'Demà sortida a les 9', 'el text sencer');
    cal(Q.querySelector('.avis-item').classList.contains('nou'), 'marcat com a nou per a mi');
    igual(Q.querySelector('.avis-top b').textContent, 'Cristina', 'qui l’ha escrit');
    igual(Q.querySelector('.avis-estat').textContent, 'nou', 'i el xip «nou»');
    cal(!!Q.querySelector('.avis-nou-btn'), 'amb el botó d’escriure’n un');
  }

  bloc('10. Els dos botons de dins');
  const acts = Q.querySelector('.avis-acts');
  igual(acts.querySelectorAll('.btn').length, 2, 'dos botons');
  cal(/Marca.l com a llegit/.test(acts.querySelector('.avis-llegit').textContent), 'un de «marca’l com a llegit»');
  igual(acts.querySelector('.avis-contesta').textContent, 'Contesta', 'i un de «contesta»');
  dashos = 0;
  await acts.querySelector('.avis-llegit').onclick();
  cal(!avisNoLlegit(STATE.entries[0]), 'queda llegit');
  igual(CUA.filter(c => c[0] === 'entryRead').length, 1, 'una sola crida a entryRead');
  cal(dashos === 1, 'i refresca la portada');
  cal(buildAvisosPanel() === null, 'i desapareix de la targeta');

  bloc('11. Contestar sense sortir de la portada');
  nouEstat(); ME = 'pol';
  avis({ id: 'r0', author: 'cristina', body: 'Qui porta les fotocòpies?', readBy: ['cristina'] });
  renderAvisosHome();
  cal($('#avisBlock').style.display !== 'none', 'el bloc es veu');
  cal(!$('#avisWrap').querySelector('.avis-comp'), 'el compositor comença tancat');
  $('#avisWrap').querySelector('.avis-contesta').onclick();
  let comp = $('#avisWrap').querySelector('.avis-comp');
  cal(!!comp, 's’obre a dins de la mateixa targeta');
  cal(/Deixa-ho estar/.test($('#avisWrap').querySelector('.avis-contesta').textContent), 'i el botó canvia');
  comp.querySelector('textarea').value = '  Ja les porto jo  ';
  dashos = 0;
  await comp.querySelector('.btn-primary').onclick();
  igual((STATE.comments['r0'] || []).map(c => c.text), ['Ja les porto jo'], 'el comentari es desa net d’espais');
  igual([STATE.comments['r0'][0].author, STATE.comments['r0'][0].seenBy], ['pol', ['pol']], 'firmat i vist per mi');
  cal(!avisNoLlegit(STATE.entries[0]), 'contestar-lo també el marca com a llegit');
  cal(OPEN_COMMENTS.has('r0'), 'i deixa el fil obert per quan s’obri l’avís');
  cal(dashos === 1, 'refresca la portada');
  igual(V.reply, null, 'el compositor es tanca');
  cal(!$('#avisWrap').querySelector('.avis-comp'), 'i desapareix de la pantalla');

  bloc('12. Una resposta buida no publica res');
  nouEstat(); ME = 'pol';
  avis({ id: 'r1', author: 'cristina', body: 'x', readBy: ['cristina'] });
  renderAvisosHome();
  $('#avisWrap').querySelector('.avis-contesta').onclick();
  comp = $('#avisWrap').querySelector('.avis-comp');
  await comp.querySelector('.btn-primary').onclick();
  igual(STATE.comments['r1'], undefined, 'no es publica');
  cal(!!$('#avisWrap').querySelector('.avis-comp'), 'i el compositor es queda obert');
  $('#avisWrap').querySelector('.avis-comp .btn-ghost').onclick();
  cal(!$('#avisWrap').querySelector('.avis-comp'), 'cancel·lar el tanca');
  igual([V.reply, V.draft], [null, ''], 'i no queda esborrany');

  bloc('13. Un repintat no s’emporta el que s’està escrivint');
  nouEstat(); ME = 'pol';
  avis({ id: 's1', author: 'cristina', body: 'x', readBy: ['cristina'] });
  renderAvisosHome();
  $('#avisWrap').querySelector('.avis-contesta').onclick();
  let ta = $('#avisWrap').querySelector('.avis-comp textarea');
  ta.value = 'a mig escriure';
  ta.dispatchEvent(new window.Event('input'));
  igual(V.draft, 'a mig escriure', 'l’esborrany es guarda a cada tecla');
  ta.focus();
  renderAvisosHome();                                   // com si arribés una sincronització
  igual($('#avisWrap').querySelector('.avis-comp textarea').value, 'a mig escriure',
    'amb el focus al CAMP, no es repinta i el text hi segueix');
  ta.blur();
  renderAvisosHome();
  igual($('#avisWrap').querySelector('.avis-comp textarea').value, 'a mig escriure',
    'i sense focus, el repintat el torna a posar');

  bloc('14. ⚠️ El focus en un BOTÓ no ha de bloquejar el repintat');
  nouEstat(); ME = 'pol';
  avis({ id: 't1', author: 'cristina', body: 'un avís', readBy: ['cristina'] });
  renderAvisosHome();
  const boto = $('#avisWrap').querySelector('.avis-llegit');
  boto.focus();                                          // com fa el navegador en clicar
  await boto.onclick();
  cal(!$('#avisWrap').querySelector('.avis-item'),
    'la targeta es refresca igualment (bug real: amb la comprovació ampla es quedava estancada)');

  bloc('15. Els comentaris, a dins de la targeta');
  nouEstat(); ME = 'pol';
  avis({ id: 'q1', author: 'cristina', body: 'text', readBy: ['cristina', 'pol', 'mireia'] });
  STATE.comments['q1'] = [
    { id: 'c1', author: 'mireia', text: 'nou!', createdAt: nowISO(), seenBy: ['mireia'],
      replies: [{ id: 'r', author: 'cristina', text: 'ok', createdAt: nowISO(), seenBy: ['cristina', 'pol'] }] },
    { id: 'c2', author: 'pol', text: 'meu', createdAt: nowISO(), seenBy: ['pol'], resolved: true },
  ];
  Q = buildAvisosPanel();
  if (Q) {
    igual(Q.querySelectorAll('.avis-fil').length, 1, 'ensenya el fil obert (el resolt no)');
    cal(/Mireia/.test(Q.querySelector('.avis-fil b').textContent), 'amb qui l’ha escrit');
    cal(/nou!/.test(Q.querySelector('.avis-fil').textContent), 'i el text');
    cal(/\+1 resposta/.test(Q.querySelector('.avis-fil i').textContent), 'i les respostes');
    igual(Q.querySelector('.avis-contesta').textContent, 'Contesta (1)', 'el botó compta els fils');
    cal(Q.querySelector('.avis-contesta').classList.contains('nous'), 'i avisa que n’hi ha de nous');
    cal(/Marca els comentaris com a vistos/.test(Q.querySelector('.avis-llegit').textContent),
      'l’avís ja està llegit: el botó parla dels comentaris');
  }
  STATE.comments['q1'] = [1, 2, 3, 4].map(i => ({ id: 'f' + i, author: 'mireia', text: 't' + i, createdAt: nowISO(), seenBy: ['mireia'] }));
  Q = buildAvisosPanel();
  if (Q) {
    igual(Q.querySelectorAll('.avis-fil').length, 2, 'amb més de dos, només els dos últims');
    igual([...Q.querySelectorAll('.avis-fil span')].map(x => x.textContent), ['t3', 't4'], 'els més nous');
    cal(/Veure els 4 comentaris/.test(Q.querySelector('.avis-fils .avis-mes').textContent), 'i un enllaç a la resta');
  }

  bloc('16. Clicar el text obre l’avís');
  nouEstat(); ME = 'pol';
  avis({ id: 'o9', author: 'cristina', body: 'text', readBy: ['cristina', 'pol', 'mireia'] });
  STATE.comments['o9'] = [{ id: 'c1', author: 'mireia', text: 'ep', createdAt: nowISO(), seenBy: ['mireia'] }];
  Q = buildAvisosPanel();
  Q.querySelector('.avis-text').onclick();
  cal(OPEN_COMMENTS.has('o9'), 'deixa el panell de comentaris obert');
  igual(flashos, ['o9'], 'i obre l’avís');
  cal(CUA.some(c => c[0] === 'commentSeen' && c[1] === 'o9'), 'marca els comentaris com a vistos');

  bloc('17. Qui falta, als meus');
  nouEstat(); ME = 'pol';
  avis({ id: 'm1', author: 'pol', body: 'meu', readBy: ['pol'] });
  Q = buildAvisosPanel();
  if (Q) {
    cal(!Q.querySelector('.avis-llegit'), 'els meus no porten botó de «llegit»');
    igual(Q.querySelector('.avis-estat').textContent, 'falta Mireia i Cristina', 'diu qui falta');
    cal(!!Q.querySelector('.avis-contesta'), 'però sí que s’hi pot comentar');
  }
  STATE.entries[0].readBy = ['pol', 'mireia'];
  igual(buildAvisosPanel().querySelector('.avis-estat').textContent, 'falta Cristina', 'i s’actualitza');
  STATE.entries[0].readBy = ['pol', 'mireia', 'cristina'];
  cal(buildAvisosPanel() === null, 'quan l’han llegit tots, fora de la targeta');

  bloc('18. Topall de ' + AVIS_PANEL_MAX + ' avisos');
  nouEstat(); ME = 'pol';
  for (let i = 1; i <= 8; i++) avis({ id: 'z' + i, author: 'cristina', body: 'avís ' + i, readBy: ['cristina'], t: T2(i) });
  Q = buildAvisosPanel();
  if (Q) {
    igual(Q.querySelectorAll('article.avis-item').length, AVIS_PANEL_MAX, AVIS_PANEL_MAX + ' avisos');
    igual(Q.querySelector('.hpanel-count').textContent, '8', 'el comptador diu els 8 de debò');
    const ultim = Q.querySelector('button.avis-item');
    igual(ultim.textContent, 'i 3 avisos més', 'i la línia final');
    obertures = []; ultim.onclick();
    igual(obertures, ['avisos'], 'que obre la secció');
  }
  nouEstat();
  for (let i = 1; i <= 6; i++) avis({ id: 'w' + i, author: 'cristina', body: 'a', readBy: ['cristina'], t: T2(i) });
  igual(buildAvisosPanel().querySelector('button.avis-item').textContent, 'i 1 avís més', 'singular');

  bloc('19. Els avisos NO es dupliquen a Novetats');
  nouEstat(); ME = 'pol';
  avis({ id: 'd1', author: 'cristina', body: 'un avís', readBy: ['cristina'] });
  STATE.entries.push({ id: 'd2', section: 'general', author: 'cristina', title: 'Una entrada',
    body: 'cos', readBy: ['cristina'], date: nowISO(), createdAt: nowISO(), updatedAt: nowISO() });
  igual(novItems().map(n => n.id), ['d2'], 'Novetats només porta l’entrada normal');
  cal(buildAvisosPanel() !== null, 'i l’avís va a la seva targeta');
  STATE.entries[0].readBy = ['cristina', 'pol'];
  STATE.comments['d1'] = [{ id: 'c9', author: 'mireia', text: 'ep', createdAt: nowISO(), seenBy: ['mireia'] }];
  igual(novItems().filter(n => n.id === 'd1').length, 0, 'ni els comentaris d’un avís');
  cal(buildAvisosPanel() !== null, 'però la targeta sí que els recull');

  bloc('20. La resta de Novetats no es toca');
  nouEstat(); ME = 'pol';
  STATE.entries.push({ id: 'g1', section: 'general', author: 'cristina', title: 'T', body: 'c',
    readBy: ['cristina', 'pol'], date: nowISO(), createdAt: nowISO(), updatedAt: nowISO() });
  STATE.comments['g1'] = [{ id: 'c8', author: 'mireia', text: 'hola', createdAt: nowISO(), seenBy: ['mireia'] }];
  const nov = novItems();
  igual(nov.length, 1, 'hi surt');
  igual(nov[0].kind, 'comment', 'com a targeta de comentari');

  bloc('21. El bento NO té cap rajola d’avisos');
  nouEstat(); ME = 'pol';
  avis({ id: 'w0', author: 'cristina', body: 'un avís per llegir', readBy: ['cristina'] });
  STATE.comments['w0'] = [{ id: 'c1', author: 'mireia', text: 'ep', createdAt: nowISO(), seenBy: ['mireia'] }];
  renderBentoReal();
  const totes = [...$('#bento').querySelectorAll('.tile')];
  igual(totes.filter(t => t.querySelector('h3').textContent === 'Avisos').length, 0,
    'ni amb avisos per llegir i comentaris nous');
  igual($('#bento').querySelectorAll('.tile.wide').length, 0, 'cap banda wide');
  cal(totes.length >= 10, 'la resta de rajoles hi són (' + totes.length + ')');
  igual(totes.filter(t => t.classList.contains('big')).map(t => t.querySelector('h3').textContent),
    ['Aspectes generals', 'Tasques', 'Calendari'], 'les tres grans, igual que abans');
  igual($('#bento').querySelectorAll('.tile-pill').length, 2, 'i les dues píndoles');

  bloc('22. El bloc es mostra i s’amaga sol');
  nouEstat(); ME = 'pol';
  renderAvisosHome();
  igual($('#avisBlock').style.display, 'none', 'sense avisos, el bloc no es veu');
  igual($('#avisWrap').children.length, 0, 'i queda buit');
  avis({ id: 'v9', author: 'cristina', body: 'hola', readBy: ['cristina'] });
  renderAvisosHome();
  cal($('#avisBlock').style.display !== 'none', 'amb un avís, es veu');
  igual($('#avisWrap').querySelectorAll('.avis-panel').length, 1, 'amb UNA sola targeta');
  await api.entryRead('v9');
  renderAvisosHome();
  igual($('#avisBlock').style.display, 'none', 'i en llegir-lo, torna a amagar-se');

  T.acaba();
}
main();
