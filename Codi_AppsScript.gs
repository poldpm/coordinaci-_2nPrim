/*** ============================================================
 *   COORDINACIÓ 2n — Backend (Google Apps Script)
 *   Guarda TOT l'estat de l'app com a JSON dins d'una pestanya
 *   del full de càlcul (partit en trossos per no tenir límit).
 *   No l'has de tocar mai encara que ampliem funcions de l'app.
 *   ============================================================ */

const SHEET_NAME = 'DB';     // pestanya on es guarda tot
const SECRET     = '';       // ← posa un text secret (el MATEIX que a CONFIG.SECRET de l'app). Buit = sense secret.
const CHUNK      = 40000;    // mida màxima per cel·la

/* ---- COMANDES (carpeta del Drive + plantilla de Google Docs) ---- */
const COMANDES_FOLDER_ID  = '1I6W41eKUWQFrfBG71yZ8IR3fQj9Ch5At';
const COMANDA_TEMPLATE_ID = '1U1kvy8rud6LNl4cg9kL_8dw0DlGcTCoINBK6l-t3lw4';
const MESOS_CA = ['gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre'];

function _sheet(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if(!sh) sh = ss.insertSheet(SHEET_NAME);
  return sh;
}
function _empty(){ return {entries:[], tasks:[], subthemes:[], avaluacio:{}, programacio:{}, correus:[], emailReminders:{}}; }

function _loadState(){
  const sh = _sheet();
  const last = sh.getLastRow();
  if(last < 1) return _empty();
  const json = sh.getRange(1,1,last,1).getValues().map(r=>r[0]).join('');
  if(!json) return _empty();
  try { return JSON.parse(json); } catch(e){ return _empty(); }
}
function _saveState(state){
  const sh = _sheet();
  const json = JSON.stringify(state);
  const chunks = [];
  for(let i=0; i<json.length; i+=CHUNK) chunks.push([json.substr(i, CHUNK)]);
  sh.clearContents();
  if(chunks.length) sh.getRange(1,1,chunks.length,1).setValues(chunks);
}
function _apply(state, action, payload){
  state.entries   = state.entries   || [];
  state.tasks     = state.tasks     || [];
  state.subthemes = state.subthemes || [];
  state.avaluacio = state.avaluacio || {};
  state.comandaStatus = state.comandaStatus || {};
  state.programacio = state.programacio || {};
  state.correus = state.correus || [];
  state.emailReminders = state.emailReminders || {};
  switch(action){
    case 'getState': break;
    case 'addEntry':      state.entries.unshift(payload); break;
    case 'updateEntry':   { const i=state.entries.findIndex(x=>x.id===payload.id); if(i>-1) state.entries[i]=payload; else state.entries.unshift(payload); break; }
    case 'deleteEntry':   state.entries = state.entries.filter(x=>x.id!==payload.id); break;
    case 'addTask':       state.tasks.unshift(payload); break;
    case 'updateTask':    { const i=state.tasks.findIndex(x=>x.id===payload.id); if(i>-1) state.tasks[i]=payload; else state.tasks.unshift(payload); break; }
    case 'deleteTask':    state.tasks = state.tasks.filter(x=>x.id!==payload.id); break;
    case 'addSubtheme':   state.subthemes.push(payload); break;
    case 'deleteSubtheme':state.subthemes = state.subthemes.filter(x=>x.id!==payload.id);
                          state.entries   = state.entries.filter(e=>e.subtheme!==payload.id); break;
    case 'setSubthemes':  state.subthemes = payload || []; break;
    case 'avUpsertLevel': {
      const tri = payload.tri, subj = payload.subj, level = payload.level;
      state.avaluacio[tri] = state.avaluacio[tri] || {};
      const arr = state.avaluacio[tri][subj] = state.avaluacio[tri][subj] || [];
      const i = arr.findIndex(function(x){ return x.id === level.id; });
      if(i > -1) arr[i] = level; else arr.push(level);
      break;
    }
    case 'avDeleteLevel': {
      const tri = payload.tri, subj = payload.subj;
      if(state.avaluacio[tri] && state.avaluacio[tri][subj])
        state.avaluacio[tri][subj] = state.avaluacio[tri][subj].filter(function(x){ return x.id !== payload.id; });
      break;
    }
    case 'setAvaluacio':  state.avaluacio = payload || {}; break;
    case 'saveAvaluacio': state.avaluacio = payload || {}; break;
    case 'attToggle': {
      state.attendance = state.attendance || {absents:{}, done:{}};
      state.attendance.absents = state.attendance.absents || {};
      if(payload.absent) state.attendance.absents[payload.name] = true; else delete state.attendance.absents[payload.name];
      break;
    }
    case 'attDone': {
      state.attendance = state.attendance || {absents:{}, done:{}};
      state.attendance.done = state.attendance.done || {};
      if(payload.done) state.attendance.done[payload.cls] = true; else delete state.attendance.done[payload.cls];
      break;
    }
    case 'attReset': state.attendance = {absents:{}, done:{}}; break;
    case 'picnicToggle': {
      state.picnics = state.picnics || {};
      state.picnics[payload.sub] = state.picnics[payload.sub] || {};
      if(payload.on) state.picnics[payload.sub][payload.name] = true; else delete state.picnics[payload.sub][payload.name];
      break;
    }
    case 'comandaStatus': {
      state.comandaStatus = state.comandaStatus || {};
      state.comandaStatus[payload.id] = state.comandaStatus[payload.id] || {};
      if(payload.on) state.comandaStatus[payload.id][payload.target] = true;
      else delete state.comandaStatus[payload.id][payload.target];
      break;
    }
    case 'progSetCell': {
      var ps = payload.subject, pw = String(payload.week);
      state.programacio[ps] = state.programacio[ps] || {};
      var pcell = state.programacio[ps][pw] = state.programacio[ps][pw] || {};
      if(payload.data){
        if(payload.data.items !== undefined) pcell.items = payload.data.items;
        if(payload.data.pla !== undefined) pcell.pla = payload.data.pla;
        pcell.notes = payload.data.notes || '';
        pcell.link = payload.data.link || '';
      }
      break;
    }
    case 'progSetDone': {
      var qs = payload.subject, qw = String(payload.week);
      state.programacio[qs] = state.programacio[qs] || {};
      var qcell = state.programacio[qs][qw] = state.programacio[qs][qw] || {};
      qcell.done = qcell.done || {};
      if(payload.on) qcell.done[payload.tutor] = true;
      else delete qcell.done[payload.tutor];
      break;
    }
    case 'progSetSubject': {
      state.programacio[payload.subject] = payload.map || {};
      break;
    }
    case 'correuUpsert': {
      var cc = payload.correu; state.correus = state.correus || [];
      var ci = -1; for(var k=0;k<state.correus.length;k++){ if(state.correus[k].id===cc.id){ ci=k; break; } }
      if(ci>=0){ cc.sent = cc.sent || state.correus[ci].sent || {}; state.correus[ci]=cc; }
      else { cc.sent = cc.sent || {}; state.correus.push(cc); }
      break;
    }
    case 'correuDelete': {
      state.correus = (state.correus||[]).filter(function(x){ return x.id!==payload.id; });
      break;
    }
    case 'correuSent': {
      state.correus = state.correus || [];
      for(var ck=0;ck<state.correus.length;ck++){ if(state.correus[ck].id===payload.id){
        state.correus[ck].sent = state.correus[ck].sent || {};
        if(payload.on) state.correus[ck].sent[payload.tutor]=true; else delete state.correus[ck].sent[payload.tutor];
        break; } }
      break;
    }
    case 'setEmailReminder': {
      state.emailReminders = state.emailReminders || {};
      if(payload.on) state.emailReminders[payload.tutor]=true; else delete state.emailReminders[payload.tutor];
      break;
    }
    default: throw new Error('Acció desconeguda: ' + action);
  }
  return state;
}
function _loadStudents(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Alumnes');
  const students = {}, flags = {};
  if(!sh) return {students: students, flags: flags};
  const last = sh.getLastRow();
  if(last < 2) return {students: students, flags: flags};       // només capçaleres o buit
  const rows = sh.getRange(2, 1, last - 1, 3).getValues();       // columnes: Nom | Classe | PI
  rows.forEach(function(r){
    const name = (r[0] || '').toString().trim();
    const cls  = (r[1] || '').toString().trim() || 'Sense classe';
    const pi   = (r[2] || '').toString().trim();
    if(!name) return;
    (students[cls] = students[cls] || []).push(name);
    if(pi) flags[name] = true;                                   // una X (o qualsevol cosa) a la columna PI
  });
  return {students: students, flags: flags};
}
function _handle(body){
  if(SECRET && body.secret !== SECRET) return {error:'No autoritzat'};
  // Comandes: viuen a la carpeta del Drive, NO al full. No toquen la base de dades.
  if(body.action === 'listComandes')  return _listComandes();
  if(body.action === 'createComanda') return _createComanda(body.payload || {});
  if(body.action === 'readComanda')   return _readComanda((body.payload && body.payload.id) || '');
  if(body.action === 'updateComanda') return _updateComanda(body.payload || {});
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try{
    let state = _loadState();
    if(body.action && body.action !== 'getState'){
      state = _apply(state, body.action, body.payload);
      _saveState(state);
      return {ok:true};
    }
    const st = _loadStudents();      // llista + marques (columna PI) des de la pestanya "Alumnes"
    state.students = st.students;
    state.flags = st.flags;
    return state;
  } finally {
    lock.releaseLock();
  }
}
/* ---- COMANDES ------------------------------------------------ */
function _parseDate(s){
  if(s && /^\d{4}-\d{2}-\d{2}$/.test(s)){ const p=s.split('-'); return new Date(+p[0], (+p[1])-1, +p[2]); }
  return new Date();
}
function _listComandes(){
  try{
    const folder = DriveApp.getFolderById(COMANDES_FOLDER_ID);
    const it = folder.getFiles();
    const out = [];
    while(it.hasNext()){
      const f = it.next();
      if(f.getId() === COMANDA_TEMPLATE_ID) continue;   // amaga la plantilla de la llista
      if(f.isTrashed && f.isTrashed()) continue;
      out.push({ id:f.getId(), name:f.getName(), url:f.getUrl(), date:f.getDateCreated().toISOString() });
    }
    out.sort(function(a,b){ return b.date.localeCompare(a.date); });  // més recents a dalt
    return { comandes: out };
  }catch(err){
    return { error: 'No s\'ha pogut llegir la carpeta: ' + err };
  }
}
function _createComanda(p){
  try{
    const items = (p.items || []).filter(function(it){ return (it.material || '').toString().trim(); });
    if(!items.length) return { error: 'Cal com a mínim un material.' };

    const d       = _parseDate(p.date);
    const mes     = MESOS_CA[d.getMonth()];
    const any     = d.getFullYear();
    const name    = '2n Comanda material de ' + mes + ' ' + any;
    const dataStr = d.getDate() + ' de ' + mes + ' de ' + any;

    const folder = DriveApp.getFolderById(COMANDES_FOLDER_ID);
    const copy   = DriveApp.getFileById(COMANDA_TEMPLATE_ID).makeCopy(name, folder);
    const doc    = DocumentApp.openById(copy.getId());
    const body   = doc.getBody();

    // 1) Data que s'efectua la comanda  (el paràgraf que comença per "Data que s")
    for(let i=0; i<body.getNumChildren(); i++){
      const c = body.getChild(i);
      if(c.getType() === DocumentApp.ElementType.PARAGRAPH){
        const t = c.asParagraph().getText();
        if(t.indexOf('Data que s') === 0 || t.indexOf('efectua la comanda') > -1){
          c.asParagraph().appendText(' ' + dataStr);
          break;
        }
      }
    }

    const tables = body.getTables();

    // 2) Taula de MATERIAL SOL·LICITAT
    let mat = null;
    for(let i=0; i<tables.length; i++){
      if(tables[i].getNumRows() > 0 && tables[i].getCell(0,0).getText().toUpperCase().indexOf('MATERIAL') > -1){ mat = tables[i]; break; }
    }
    if(mat){
      for(let i=0; i<items.length; i++){
        const material = (items[i].material || '').toString().trim();
        const qty      = (items[i].qty || '').toString().trim();
        let row;
        if(1 + i < mat.getNumRows()){           // reaprofita les files buides de la plantilla
          row = mat.getRow(1 + i);
          row.getCell(0).setText(material);
          if(row.getNumCells() > 1) row.getCell(1).setText(qty);
        } else {                                 // o n'afegeix de noves
          row = mat.appendTableRow();
          row.appendTableCell(material);
          row.appendTableCell(qty);
          row.appendTableCell('');               // columna "Entregat (Data)" buida
        }
      }
      // treu les files buides que sobrin de la plantilla (capçalera = fila 0)
      for(let r = mat.getNumRows() - 1; r > items.length; r--) mat.removeRow(r);
    }

    // 3) Observacions (dins la taula que comença per "Observacions")
    const obs = (p.observacions || '').toString().trim();
    if(obs){
      for(let i=0; i<tables.length; i++){
        if(tables[i].getNumRows() > 0 && tables[i].getCell(0,0).getText().toLowerCase().indexOf('observacions') > -1){
          tables[i].getCell(0,0).appendParagraph(obs);
          break;
        }
      }
    }

    doc.saveAndClose();
    return { ok:true, comanda:{ id:copy.getId(), name:name, url:copy.getUrl(), date:copy.getDateCreated().toISOString() } };
  }catch(err){
    return { error: 'No s\'ha pogut crear la comanda: ' + err };
  }
}

function _catalanToISO(txt){
  if(!txt) return '';
  const m = txt.match(/(\d{1,2})\s+de\s+(.+?)\s+de\s+(\d{4})/i);
  if(!m) return '';
  const day = parseInt(m[1], 10);
  const mi  = MESOS_CA.indexOf(m[2].toLowerCase().trim());
  if(mi < 0) return '';
  return m[3] + '-' + (mi+1<10?'0':'') + (mi+1) + '-' + (day<10?'0':'') + day;
}

function _readComanda(id){
  try{
    if(!id) return { error:'Falta l\'identificador.' };
    const doc  = DocumentApp.openById(id);
    const body = doc.getBody();
    const file = DriveApp.getFileById(id);

    // data
    let dateText = '';
    for(let i=0; i<body.getNumChildren(); i++){
      const c = body.getChild(i);
      if(c.getType() === DocumentApp.ElementType.PARAGRAPH){
        const t = c.asParagraph().getText();
        const idx = t.indexOf('comanda:');
        if(idx > -1){ dateText = t.substring(idx + 'comanda:'.length).trim(); break; }
      }
    }

    const tables = body.getTables();

    // material
    const items = [];
    for(let i=0; i<tables.length; i++){
      if(tables[i].getNumRows() > 0 && tables[i].getCell(0,0).getText().toUpperCase().indexOf('MATERIAL') > -1){
        const mt = tables[i];
        for(let r=1; r<mt.getNumRows(); r++){
          const row = mt.getRow(r);
          const mat = row.getCell(0).getText().trim();
          const qty = row.getNumCells() > 1 ? row.getCell(1).getText().trim() : '';
          if(mat || qty) items.push({ material:mat, qty:qty });
        }
        break;
      }
    }

    // observacions
    let obs = '';
    for(let i=0; i<tables.length; i++){
      if(tables[i].getNumRows() > 0 && tables[i].getCell(0,0).getText().toLowerCase().indexOf('observacions') > -1){
        obs = tables[i].getCell(0,0).getText().replace(/^\s*observacions\s*:?\s*/i, '').trim();
        break;
      }
    }

    return { ok:true, comanda:{ id:id, name:file.getName(), url:file.getUrl(), date:_catalanToISO(dateText), dateText:dateText, items:items, observacions:obs } };
  }catch(err){
    return { error: 'No s\'ha pogut llegir la comanda: ' + err };
  }
}

function _updateComanda(p){
  try{
    if(!p.id) return { error:'Falta l\'identificador de la comanda.' };
    const items   = (p.items || []).filter(function(it){ return (it.material || '').toString().trim(); });
    const d       = _parseDate(p.date);
    const mes     = MESOS_CA[d.getMonth()];
    const any     = d.getFullYear();
    const dataStr = d.getDate() + ' de ' + mes + ' de ' + any;

    const doc  = DocumentApp.openById(p.id);
    const body = doc.getBody();

    // 1) Data — la substitueix (no l'acumula)
    for(let i=0; i<body.getNumChildren(); i++){
      const c = body.getChild(i);
      if(c.getType() === DocumentApp.ElementType.PARAGRAPH){
        const t = c.asParagraph().getText();
        const idx = t.indexOf('comanda:');
        if(idx > -1){ c.asParagraph().setText(t.substring(0, idx + 'comanda:'.length) + ' ' + dataStr); break; }
      }
    }

    const tables = body.getTables();

    // 2) Material — reconcilia per posició (preserva la columna "Entregat")
    let mat = null;
    for(let i=0; i<tables.length; i++){
      if(tables[i].getNumRows() > 0 && tables[i].getCell(0,0).getText().toUpperCase().indexOf('MATERIAL') > -1){ mat = tables[i]; break; }
    }
    if(mat){
      const n = items.length;
      while(mat.getNumRows() - 1 < n){
        const rr = mat.appendTableRow(); rr.appendTableCell(''); rr.appendTableCell(''); rr.appendTableCell('');
      }
      for(let i=0; i<n; i++){
        const row = mat.getRow(1 + i);
        row.getCell(0).setText((items[i].material || '').toString().trim());
        if(row.getNumCells() > 1) row.getCell(1).setText((items[i].qty || '').toString().trim());
      }
      for(let r = mat.getNumRows() - 1; r > Math.max(n, 1); r--) mat.removeRow(r);
      if(n === 0){ const r1 = mat.getRow(1); r1.getCell(0).setText(''); if(r1.getNumCells()>1) r1.getCell(1).setText(''); }
    }

    // 3) Observacions — les substitueix (conserva l'etiqueta)
    const obs = (p.observacions || '').toString().trim();
    for(let i=0; i<tables.length; i++){
      if(tables[i].getNumRows() > 0 && tables[i].getCell(0,0).getText().toLowerCase().indexOf('observacions') > -1){
        const cell = tables[i].getCell(0,0);
        for(let k = cell.getNumChildren() - 1; k >= 1; k--) cell.removeChild(cell.getChild(k));
        if(obs) cell.appendParagraph(obs);
        break;
      }
    }

    doc.saveAndClose();

    // 4) Reanomena NOMÉS si el nom encara segueix el patró automàtic (respecta noms personalitzats)
    const file = DriveApp.getFileById(p.id);
    const curName = file.getName();
    const newName = '2n Comanda material de ' + mes + ' ' + any;
    if(/^2n Comanda material de .+ \d{4}$/.test(curName) && curName !== newName) file.setName(newName);

    return { ok:true, comanda:{ id:p.id, name:file.getName(), url:file.getUrl(), date:(p.date || '') } };
  }catch(err){
    return { error: 'No s\'ha pogut desar la comanda: ' + err };
  }
}

function _json(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function doPost(e){
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch(err){ body = {}; }
  return _json(_handle(body));
}
function doGet(e){
  const secret = (e && e.parameter && e.parameter.secret) || '';
  return _json(_handle({action:'getState', secret:secret}));
}

/* Opcional: executa'l un cop des de l'editor per crear la pestanya DB i autoritzar permisos. */
function setup(){
  const sh = _sheet();
  if(sh.getLastRow() < 1) _saveState(_empty());
}

/* Executa'l un cop des de l'editor per AUTORITZAR els permisos nous de Drive/Docs
   i comprovar que llegeix la carpeta de comandes. Mira el registre (Ctrl+Enter). */
function provaComandes(){
  const r = _listComandes();
  Logger.log(JSON.stringify(r, null, 2));
}

/* ================================================================
   RECORDATORIS DIARIS
   - Pol: per TELEGRAM a les 7:00 (privat; no surt a la web ni a GitHub)
   - Cristina i Mireia: per CORREU a les 8:00, NOMÉS si han activat
     l'opció a l'app i NOMÉS si tenen alguna cosa pendent.
   ================================================================ */

// Bot de Telegram — PRIVAT, només per a Pol
const TG_TOKEN   = '8977298451:AAGENn86ocbbwvqp5t2g84objOpGI-onDdk';
const TG_CHAT_ID = '437482860';

// Adreces de correu de les mestres (l'enviament depèn que ho activin a l'app)
const REMINDER_EMAILS = {
  pol:      '',                                 // Pol ho rep per Telegram
  cristina: 'cristinamataro@escorialvic.cat',
  mireia:   'mireiaduran@escorialvic.cat'
};
const TUTOR_NOMS = { pol:'Pol', cristina:'Cristina', mireia:'Mireia' };

function _todayISO_(){
  const tz = Session.getScriptTimeZone() || 'Europe/Madrid';
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
}
function _pendingFor_(state, tutor){
  const tasks   = (state.tasks||[]).filter(function(t){ return (t.owner===tutor || t.owner==='general') && t.status!=='acabada'; });
  const correus = (state.correus||[]).filter(function(c){ return !(c.sent && c.sent[tutor]); });
  const today   = _todayISO_();
  const events  = (state.entries||[]).filter(function(e){ return e.section==='calendari' && e.eventDate===today; });
  return { tasks:tasks, correus:correus, events:events };
}
function _hasPending_(p){ return (p.tasks.length + p.correus.length + p.events.length) > 0; }
function _summaryText_(p, nom){
  const L = [];
  L.push('\u2600\uFE0F Bon dia, ' + nom + '! Això tens pendent a Coordinació 2n:');
  L.push('');
  if(p.events.length){
    L.push('\uD83D\uDCC5 Avui:');
    p.events.forEach(function(e){ L.push('  \u2022 ' + (e.title||'(sense títol)') + (e.time? ' ('+e.time+')':'')); });
    L.push('');
  }
  if(p.tasks.length){
    L.push('\u2705 Tasques pendents (' + p.tasks.length + '):');
    p.tasks.forEach(function(t){ L.push('  \u2022 ' + (t.title||'(sense títol)')); });
    L.push('');
  }
  if(p.correus.length){
    L.push('\u2709\uFE0F Correus per enviar (' + p.correus.length + '):');
    p.correus.forEach(function(c){ L.push('  \u2022 ' + (c.title||'(sense assumpte)') + (c.date? ' \u2014 enviar el '+c.date : '')); });
    L.push('');
  }
  return L.join('\n').trim();
}
function _sendTelegram_(text){
  if(!TG_TOKEN || !TG_CHAT_ID) return;
  UrlFetchApp.fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
    method:'post',
    payload:{ chat_id: TG_CHAT_ID, text: text, disable_web_page_preview:'true' },
    muteHttpExceptions:true
  });
}

/* 7:00 — Telegram per a Pol (només si té pendents) */
function recordatoriTelegram(){
  const state = _loadState();
  const p = _pendingFor_(state, 'pol');
  if(!_hasPending_(p)) return;              // si no hi ha res, no molesta
  _sendTelegram_(_summaryText_(p, TUTOR_NOMS.pol));
}

/* 8:00 — Email per a les mestres que HO HAGIN ACTIVAT i tinguin pendents */
function recordatoriEmails(){
  const state = _loadState();
  const opt = state.emailReminders || {};
  Object.keys(REMINDER_EMAILS).forEach(function(tutor){
    const email = REMINDER_EMAILS[tutor];
    if(!email) return;
    if(!opt[tutor]) return;                 // no ha activat l'opció → no s'envia
    const p = _pendingFor_(state, tutor);
    if(!_hasPending_(p)) return;            // sense pendents → no s'envia
    MailApp.sendEmail(email, 'Coordinació 2n · resum del dia', _summaryText_(p, TUTOR_NOMS[tutor]||tutor));
  });
}

/* EXECUTA AIXÒ UN SOL COP: programa Telegram (7:00) i correus (8:00) */
function crearTriggersRecordatori(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    var f=t.getHandlerFunction();
    if(f==='recordatoriTelegram' || f==='recordatoriEmails' || f==='recordatoriDiari') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('recordatoriTelegram').timeBased().atHour(7).nearMinute(0).everyDays(1).create();
  ScriptApp.newTrigger('recordatoriEmails').timeBased().atHour(8).nearMinute(0).everyDays(1).create();
  Logger.log('Programat: Telegram 7:00 i correus 8:00');
}

/* PROVA SEGURA: envia NOMÉS al teu Telegram. NO envia cap correu a ningú. */
function provaRecordatoriTelegram(){
  const state = _loadState();
  const p = _pendingFor_(state, 'pol');
  const txt = _hasPending_(p) ? _summaryText_(p, TUTOR_NOMS.pol) : 'Prova OK \u2705 (ara mateix no tens res pendent).';
  _sendTelegram_(txt);
  Logger.log('Prova enviada NOMÉS al teu Telegram. Cap correu enviat.');
}
