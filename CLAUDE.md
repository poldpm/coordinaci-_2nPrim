# Coordinació 2n — context del projecte (per a Claude Code)

> Llegeix aquest fitxer sencer abans de tocar res. Conté tot el context, les
> convencions i el flux de desplegament. **Tota la interfície i les converses
> són en català.**

## 1. Què és
PWA per coordinar els **tres tutors de 2n de primària** de l'Escola Vedruna
Escorial (Vic). És una eina interna feta a mida: comparteixen informació,
tasques, calendari, programació d'assignatures, correus a enviar, la carpeta
viatgera (deures), etc. L'usuari principal (Pol) fa de desenvolupador i usuari
alhora.

**Prioritats de disseny (per ordre):** que sigui *molt ràpida* (els mestres
tenen poc temps), fàcil d'usar i de configurar, i sobretot **fiable en la
coordinació entre perfils** (carregar/editar/esborrar no pot fallar mai).

## 2. Persones i marca
- **Pol** → 2nC → indigo `#5A6FE0` (var `--pol`)
- **Cristina** → 2nA → rosa `#D5638E` (var `--cristina`)
- **Mireia** → 2nB → ambre `#EE9B4C` (var `--mireia`)

Marca: teal/cian `#0F6C86` + groc. Tipografies **Fredoka** (títols) i **Nunito**
(text). Motiu d'identitat = **tres pals arrodonits** (indigo/rosa/ambre). El
**favicon** són 3 franges verticals; la **icona d'app** són els 3 pals sobre teal.
Els mestres no-tutors s'anomenen SEMPRE **"especialistes"** (mai "no-tutors").

## 3. Arquitectura i stack
- **Frontend:** un únic fitxer `index.html` (HTML + CSS + JS, **sense frameworks**,
  sense build). Es serveix per **GitHub Pages**.
- **Backend:** **Google Apps Script** (Web App). Des del 16-09-2026 l'estat viu a
  **ScriptProperties**, en JSON **comprimit (gzip+base64)** i partit en trossos de 8,5 KB
  (`db_0..db_n`, `db_n`, `rev`). El full `DB` de **Google Sheets** és la **còpia de seguretat**:
  s'hi escriu com a molt cada 10 min (`db_copia_t`) o a mà amb `copiaDeSeguretatAra()`.
  Motiu: llegir i reescriure el full costava 4-8 s per escriptura amb pics de 20-30 s (Google
  llençava la resposta: 404 «No s'ha pogut obrir el fitxer»). Estat real: 56 KB → 17 KB
  comprimit (3,4% de la quota de 500 KB). Cada escriptura fa 2 operacions d'emmagatzematge
  (quota de compte gratuït: 50.000/dia). Seguretat: la compressió només s'usa si la ida i
  tornada és idèntica; si falla, es desa al full. Si en ESCRIURE les dades no es poden llegir,
  es respon reintentable (mai es continua amb la còpia del full, que pot anar 10 min enrere).
  **Recuperar des del full:** executar `copiaDeSeguretatAra` NO; per tornar al full, esborrar la
  propietat `db_n` (Configuració del projecte → Propietats de l'script) i la propera lectura
  agafarà el full. Concurrència protegida amb **`LockService`** (només per escriure).
- **FIREBASE (Firestore) — MIGRAT el 16-09-2026 (verificat: idèntic a la còpia d’abans). Font de veritat de les dades.** Projecte `coordinapp-26-27`
  (mateix compte de Google). Motiu: Apps Script tenia latències de 1 a 30 s que no depenien del
  codi (mesurat). Amb Firestore: desar ~0,8-1,3 s i l'altre dispositiu ho veu en ~1 s (mesurat).
  - **Col·lecció `coord`** (producció) · **`coord_proves`** (proves; en `localhost`/`127.0.0.1` l'app
    usa SEMPRE aquesta). Documents: `entries, tasks, subthemes(+sembrat), avaluacio, programacio,
    correus, comments, reptes, altres` (la resta de claus) → cadascun `{j: JSON, v: comptador, t, by}`;
    `alumnes` `{j:{students,flags}}` (l'escriu Apps Script); `meta {migrat:true}`.
  - **Mode:** `TRANSPORT` = `'firebase'` si existeix `meta.migrat` (o `localStorage.coord_transport`),
    si no `'appsscript'`. Abans de migrar la web nova funciona exactament com abans.
  - **Escriure:** la cua `PENDING` i els lots NO canvien; cada lot és UNA `runTransaction`
    (`fbEnviaLot`) que llegeix els 9 documents, aplica `fbApply` i desa només els que canvien.
    `fbApply` és una **còpia generada** d'`_apply`/`_arribaTard`/`_conservaLlegits` del backend:
    **si toques `_apply` al .gs, executa `node scripts/gen_fb_apply.js`** (no editar el bloc a mà).
    ⚠️ **El perill va en les DUES direccions.** El generador **sobreescriu** `fbApply` amb el que
    digui el `.gs`: si el `.gs` va endarrerit, li **esborra casos a `index.html`** i aquella funció
    deixa de desar-se *en silenci* (el backend respon «Acció desconeguda», que el client marca com
    a error permanent). Va passar de debò: el 08-10-2026 el `.gs` li faltaven **10 casos**
    (`autCamps`, `autSet` de les autoritzacions, i els 8 de llibres i grups), perquè l'app roda
    sobre Firebase i funciona encara que el `.gs` vagi enrere. **Abans d'executar el generador,
    comprova que els dos costats tenen els mateixos casos** (§12). Si has editat `fbApply` a mà
    (perquè el `.gs` no és al repositori), enganxa el mateix tros al `.gs` com més aviat millor.
    **Estat: verificat en sincronia el 08-10-2026, 51 casos als dos costats, i Web App
    redesplegat.**
  - **Llegir:** `onSnapshot` de la col·lecció (`fbEscolta`), sense sondeig. Una foto amb `v` menor
    que el que acabem de desar (`FB.minV`) s'ignora.
  - **Apps Script després de migrar** (propietat `FIREBASE_MIGRAT=1`): comandes igual; `getState`
    llegeix de Firebase (`migrat:true`); qualsevol escriptura respon `MIGRAT_FIREBASE` reintentable
    (l'app antiga la guarda a la cua; l'app nova recarrega i passa a Firebase). Entra a Firestore per
    REST com a usuari anònim (token de renovació a la propietat `FB_REFRESH`).
    Funcions a mà: `migraAFirebase()` (UN cop; s'atura si Firebase ja té dades i verifica la còpia
    element a element), `crearTriggersFirebase()` (còpia al full `DB` cada 30 min, amb `DB_anterior`
    del dia abans; alumnes cada hora), `copiaFirebaseAlFull()`, `alumnesAFirebase()`.
    Recordatoris: `_estatActual()`.
  - **Regles de Firestore:** lectura/escriptura a `coord/{doc}` (i `coord_proves/{doc}` mentre calgui)
    amb `request.auth != null` (inici de sessió anònim). La config web de Firebase és pública per disseny.
  - **Service worker:** la llibreria de Firebase (gstatic, versió fixa) va cau-primer.
  - **QA 16-09-2026 (post-migració), corregit:** (1) `aplicaLocal` ara és `fbApply` (la còpia a mà
    s'havia desfasat: 24/45 accions no coincidien, p. ex. programació a la clau «undefined»);
    (2) **s'aplica un sol cop**: cada acció de la cua porta `op` i el document `fets` (3 dies) evita
    que un lot reenviat després d'una resposta perduda sumi dues vegades (`estocSuma`);
    (3) `fbLlegeix` espera si llegeix un `v` menor que el que ja hem desat (la lectura just després
    de desar podia tornar la versió d'abans → llista d'absents incompleta); (4) sense avís de
    «servidor» en una arrencada lenta amb connexió; (5) comptadors de 🎒 amb `stLlegeix` (CLASSE|NOM).
- **PWA:** `manifest.webmanifest` + icones a `img/`. Instal·lable al mòbil.

Config al principi de `index.html` (objecte `CONFIG`):
- `WEB_APP_URL` → URL del desplegament d'Apps Script (és pública; ja surt al
  frontend desplegat).
- `SECRET` → `2nPrim!vedruna`, el **mateix text** a `index.html` i a `Codi_AppsScript.gs`.
  No és una contrasenya (el frontend és públic), però evita que qualsevol que només
  tingui l'URL del Web App hi escrigui. Si es canvia, s'ha de canviar als dos costats
  i tornar a desplegar les dues coses.
- `DEMO_MODE = !CONFIG.WEB_APP_URL` → fals en producció.
- `STORE_KEY = 'coordinacio_2n_demo_v17'` → clau de la còpia local (localStorage).

## 4. Fitxers del repositori
```
index.html               ← tot el frontend (l'app)
sw.js                    ← service worker (cau: HTML xarxa-primer, assets cau-primer). Va a GitHub.
manifest.webmanifest     ← PWA
.nojekyll                ← perquè GitHub Pages no "processi" res
img/                     ← favicons + icones (3 pals) + logo.webp (hero, extern, ~182 KB)
fitxes/                  ← 36 PDF imprimibles del Racó dels reptes (Fitxa_<CODI>_BN.pdf)
scripts/                 ← eines de desenvolupament (NO van dins l'app):
                           gen_fb_apply.js (copia _apply del .gs a index.html, §3)
                           gen_prog_seed.js · gen_reptes_seed.js · gen_nfc_doc.js (§8, §9)
                           validate.sh · prova_navegador.js (prova en Chromium real, §12)
Codi_AppsScript.gs       ← BACKEND. NO va MAI a GitHub (veure §10). Local + Apps Script.
CLAUDE.md                ← aquest fitxer
.gitignore               ← exclou Codi_AppsScript.gs, node_modules/ i .qa/ de git
```

## 5. Model de dades (`STATE`)
`STATE` es desa sencer al full `DB` com a JSON. Claus:
```
entries[]        // aspectes generals, calendari, comandes… {id, section, title, body, author, eventDate?, time?, readBy?…}
tasks[]          // {id, title, owner('pol'|'cristina'|'mireia'|'general'), status('pendent'|'acabada'), …}
subthemes[]      // projectes/excursions/activitats {id, section, name, …}
avaluacio{}      // frases d'avaluació per trimestre
programacio{}    // programació setmanal + carpeta viatgera (veure §8)
correus[]        // {id, title, body, date, sent:{tutor:true}, author, createdAt}
emailReminders{} // opt-in del correu recordatori: { tutor: true }
cvLliurat{}      // qui ha entregat la carpeta viatgera: { dataISO_del_cicle: { 'Nom alumne': true } }
comments{}       // comentaris per entrada (estil Google): { entryId: [ {id, author, text, createdAt, resolved, resolvedBy, replies:[{id,author,text,createdAt}]} ] } — veure §9
llibres{}        // llibres que s'emporten a casa, per CICLES: { titols:[{id,nom}],
                 //   cicles:[{id, nom, dona:dataISO, recull:dataISO, alumnes:{'CLASSE|Nom':{llibre:llibreId, tornat:dataISO}}}] } — veure §9
grups{}          // gestió de grups: { etiquetes:[{id,nom}], marques:{'CLASSE|Nom':{etiqId:true}}, notes:{'CLASSE|Nom':text},
                 //                   noms:{'CLASSE|Nom':'Nom corregit'}, conjunts:[{id,nom,creat,by,classes[],grups:[{id,nom,membres[]}]}] } — veure §9
```
`normalizeState()` garanteix que totes les claus existeixen.

## 6. Seccions (constant `SECTIONS` a index.html)
`general`(entries), `tasques`(tasks), `calendari`(agenda), `projectes`/
`excursions`/`activitats`(subthemes), `programacio`(programacio),
`correus`(correus, `customHero`), `enllacos`(links), `avaluacio`(avaluacio,
`customHero`), `comandes`(entries, `customHero`), `eines`(eines, `customHero`),
`grups`(grups, `customHero`, `size:'pill'`), `avisos`(entries, `inBento:false`).

**Mides de rajola** (`size`, graella de 12 columnes):
- `big` = span 4 → `general`, `tasques`, `calendari` (una fila de 12 justa).
- `reg` = span 3 → les 8 restants (dues files de 4 justes).
- `pill` = `programacio` i `grups`, botons allargats al final. `renderBento` les posa
  TOTES dins d'UN sol `.tile-pill-wrap` perquè quedin de costat; abans cada una tenia el
  seu wrap de `span 12` i quedaven l'una sota l'altra.
- **`inBento:false`** → **només `avisos`**: la secció existeix i s'hi entra, però NO es
  pinta cap rajola. Té la seva targeta de banda a banda a la portada i el botó de la
  barra de dalt; una rajola hauria dit la mateixa cosa una tercera vegada. Hi va haver
  una `size:'wide'` (banda vermella a tota l'amplada a dalt del bento) i es va treure
  (08-10-2026): la informació ja era als altres dos llocs.

**Regla capçalera:** `openSection` pinta una capçalera per defecte **excepte** si
la secció té `customHero:true`. Si un `render*` es fa la seva pròpia capçalera
(`buildSecHero`), la secció HA de tenir `customHero:true` (si no, surten DUES
capçaleres — bug real que ja va passar). `programacio` NO té customHero (usa la
per defecte); `correus/comandes/eines/avaluacio` SÍ.

## 7. Sincronització i fiabilitat (nucli — llegir bé)
- **Optimista:** les mutacions actualitzen `STATE` localment i criden
  `persist(action, payload)`. `safeSave()` desa una còpia a localStorage a
  l'instant.
- **`request(action, payload)`:** POST a `WEB_APP_URL` amb **timeout de 25s**
  (AbortController).
- **Cua de reintents `PENDING`:** si falla la xarxa, la mutació s'encua a
  localStorage i es reintenta (en ordre) a `flushPending()` — abans de cada pull,
  en tornar el focus i a l'event `online`. **Cap edició/esborrat es perd.**
  `request()` marca l'error com a **`.retryable`** (sense xarxa, timeout, servidor
  ocupat o resposta que no és JSON) o **`.fatal`** (el backend diu explícitament que
  l'acció no és vàlida). **Res no s'esborra mai:** una acció `.fatal` s'aparta
  després de `PENDING_MAX_TRIES` intents perquè no encalli la resta, però es
  conserva i es reintenta a la següent obertura (`tries` es reseteja al boot).
  ⚠️ Història: primer una acció rebutjada encallava la cua i deixava el dispositiu
  **sense sincronitzar per sempre**; després es va "arreglar" descartant-la, i això
  **feia perdre canvis** quan el backend petava per contenció del lock (retornava
  HTML, no JSON). Cap de les dues coses pot tornar a passar.
- **Enviament per LOTS (`batch`):** `persist()` només encua; `enviaCua()` agrupa fins a 40
  accions en UNA petició (`batch`) → al servidor, una lectura i una desada. Marcar 20 alumnes
  eren 20 execucions de ~5 s; ara n'és una. Cada operació té el seu resultat (una de dolenta
  no tomba les altres). Si falla la xarxa o Google llença la resposta (404 «No s'ha pogut obrir
  el fitxer», passa quan una execució passa dels ~30 s), el lot sencer torna a la cua i es
  reintenta sol amb espera creixent (3→30 s). Totes les accions són idempotents, així que
  reenviar un lot que sí que s'havia desat no duplica res. Si el servidor és antic i respon
  «Acció desconeguda: batch» (ve marcat com a REINTENTABLE pel seu doPost), `_senseBatch` passa
  a enviar un per un.
- ⚠️ **Bug greu arreglat (16-09-2026):** `persist` marcava l'acció com a `sending` i la desava així
  a la cua; si l'app es tancava a mig enviar, en tornar-la a obrir aquella acció quedava «en vol»
  per sempre: no s'enviava MAI i `reaplicaPendents` la tornava a pintar a cada sincronització.
  Aquell dispositiu veia coses que els altres no. Ara l'arrencada posa `sending=false` a tot.
- **Revisió atòmica:** `getState` porta `rev` DINS la resposta (`prenRev(s)` la treu de l'estat).
  Abans es demanava en una petició a part DESPRÉS de l'estat: si algú escrivia entremig, el
  dispositiu apuntava la revisió nova amb dades velles i no veia el canvi fins al refresc dels
  5 min. El servidor llegeix la revisió ABANS que les dades.
- **Lectures sense torn i des de memòria cau:** `getState` no demana `LockService`; llegeix
  `CacheService` (`_loadStateRapid`) si l'etiqueta de revisió coincideix, i si no, el full. Només
  `_saveState` (dins del torn) escriu la cau. Si una lectura enxampa el full a mig desar, `_loadState`
  avisa i el client ho reintenta.
- **Revisió (`getRev`) — llegir surt molt barat:** cada desada puja un comptador
  (`_tocaRev` a ScriptProperties). La comprovació periòdica pregunta **només el comptador**
  (mil·lisegons, no toca cap full) i només baixa l'estat sencer si ha canviat, o cada 5 min.
  ⚠️ Mesurat el 12-09-2026: un `getState` trigava **14 s** per a 50 KB; amb tres dispositius
  cada 20 s el servidor no parava mai i les escriptures morien per temps esgotat
  («signal is aborted without reason»). La llista d'alumnes també es cacheja 5 min
  (`_loadStudentsCache`) i l'espera de torn de les escriptures va de 20 s a 8 s.
- **Ritme adaptatiu:** 15 s quan passen coses; si no en passen, s'estira ×1,5 fins a un
  topall de 30 s (abans 2 min: massa per a dos ordinadors l'un al costat de l'altre). Tornar a l'app, escriure o rebre un
  canvi ho torna a posar a 20 s (`window._syncDesperta`). `pull()` retorna si hi ha hagut
  canvis. Motiu: Apps Script té latències molt irregulars (mesurat de 1 a 18 s per a la
  MATEIXA crida trivial) i cada petició és una execució sencera al servidor.
- **`startCloudSync()`:** fa `getState` **a tota l'app** (abans només a la
  portada → si eres dins d'una secció no s'actualitzava mai i calia tancar i tornar
  a obrir). També en `focus`, en **`visibilitychange`** (al mòbil el `focus` sovint
  no arriba) i en tornar la connexió. **Només re-renderitza si l'estat ha canviat**
  (compara `JSON.stringify`, var `_lastSig`). Si hi ha canvis locals pendents sense
  enviar, **NO** sobreescriu l'estat, i tampoc si hi ha una escriptura en curs
  (`_inflight`).
  El repintat el fa `repaintAfterSync()`: a la portada `refreshHome()`; dins d'una
  secció, la repinta conservant el scroll, **excepte si `sectionBusy()`** (modal
  obert, `EDITING`, un compositor obert o un camp amb el focus) — llavors només
  actualitza les dades i ja es veurà en navegar, per no esborrar mai res a mig
  escriure.
- **Indicador visible:** mentre queden accions a `PENDING` surt una píndola
  «↻ N sense desar» (`updateSyncBadge`); clicant-la es força l'enviament i un pull.
- **Auto-actualització:** el service worker es consulta en tornar a l'app i cada
  15 min; quan n'entra una versió nova, `provaRecarregar()` recarrega **si no
  s'està escrivint res ni queden canvis pendents**. Sense això, una PWA oberta
  dies seguits es quedava amb codi antic i no rebia cap arreglament.
- **Escriptures endarrerides:** una cua que s'envia molt més tard porta una còpia ANTIGA de
  l'element. `_arribaTard(vell,nou)` compara `updatedAt` i **descarta** el que arriba tard;
  `_conservaLlegits(vell,nou)` fa la unió de `readBy` si no és una edició deliberada (que es
  reconeix per `editedBy` + `updatedAt` més nou, i sí que ha de tornar a sortir a Novetats).
  ⚠️ Bug real (10-09-2026): en Pol marcava totes les novetats de la Mireia com a llegides i li
  tornaven a sortir, perquè el mòbil d'ella enviava més tard un `updateEntry` amb el `readBy`
  antic i esborrava el seu nom.
- **Backend:** `_handle` aplica cada acció amb `LockService` (serialitza
  escriptures concurrents). Si no obté el torn en 12s retorna
  `{error, retry:true}` (mai una excepció), i `doPost`/`doGet` **sempre** retornen
  JSON: si petessin, Apps Script retorna una pàgina HTML i el client no la sap
  llegir. Les **altes són idempotents** (upsert per `id`) →
  un reintent no duplica.
- **Login instantani:** a l'arrencada entra des de la còpia local abans d'esperar
  la xarxa (sense parpelleig).
- **Enrere del mòbil:** "trampa" d'historial (`armBack`/`popstate`) → dins una
  secció, l'enrere torna a l'inici en comptes de tancar l'app.

Limitació coneguda (rara): si DOS tutors editen la llista de tasques de la
MATEIXA setmana+assignatura EXACTAMENT alhora, l'últim que desa pot trepitjar
l'altre (les tasques es desen com a array sencer). La resta (marcar fet, esborrar,
correus, calendari…) és a prova de xocs. Es pot blindar fent el "fet" per tasca
granular si algun dia cal.

## 8. Programació (la part més gran)
Secció `programacio`. Assignatures a `PROG_SUBJECTS`: **mates** `#2D9CDB`,
**català** `#EB5757`, **medi** `#27AE60`, i **carpeta** (viatgera) `#8B6F47`.

**Calendari real 2026-27:** `COURSE_START='2026-09-08'`, `COURSE_END='2027-06-18'`.
`progBuildWeeks()` genera les setmanes (dilluns) i marca:
- **Festius** oficials (`PROG_FESTIUS`): Diada 11 set, Festa Nacional 12 oct,
  Immaculada 8 des. Cada entrada pot portar `kind:'lliure'|'local'` (per defecte
  festiu). Del **calendari oficial de l'escola** (2026-27) ja hi ha els **dies de
  lliure disposició de Vic** (2 nov, 7 des, 8 feb, 30 abr, 14 maig) i la **festa
  local** (17 maig). `progWeekWarn(w)` etiqueta cada dia amb el seu emoji (⛔ festiu /
  🎈 lliure disposició / 📍 festa local) i el text ja porta l'emoji (els renderitzadors
  no n'afegeixen cap). Són dies solts → **no canvien** el nombre de setmanes (segueixen 39).
- **Vacances** (`PROG_VACANCES`, calendari OFICIAL): Nadal **22 des→6 gen** (torn el 7),
  Setmana Santa 22→29 març (torn el 30). Les setmanes 100% vacances no compten → **39
  setmanes lectives**. L'etiqueta "✂️ Setmana reduïda" (a `PROG_REDUIDES`, S16/S17)
  mostra els dies lectius **calculats del calendari** (`5-vacDays-festius`), no un número fix:
  S16=1 dia (dl 21), S17=2 dies (torn el 7 gen).
- **Tardes no lectives** (`PROG_TARDES`, mig dia, NO treuen dia lectiu): Mercat del Ram
  19 març (S27) i últim dia de curs 21 juny (s'ensenya a S39, fora de la graella).
  `progWeekTardes(w)` → etiqueta 🌓.
- **Sortides** (`PROG_ACTIVITATS`): Colònies, Teatre anglès, Sentits, Agents
  cívics, RobotiC, MEV, Laboratori Lectura, Catalunya Miniatura (FLIC/pessebres/
  natació EXCLOSOS). Es mostren com a etiqueta 📌 a la seva setmana.

**Vista setmanal:** pestanyes d'assignatura + barra de progrés ("X/39 programades")
+ selector **"Aquesta setmana / Totes les setmanes"** + navegador de setmana
(se situa sol a la setmana d'avui). Cada setmana: **llista de tasques marcables**
(`prog-items`) on cada tasca té els **3 punts per tutor** (`done:{tutor:true}`,
qui ho ha fet), enllaç opcional, i notes. Reprogramació: **"↪ Passa el pendent a
la setmana següent"** (arrossega les no fetes), **"↪ Setmana sencera no feta"**
(desplaça tot endavant saltant vacances), **"↩ Recupera una setmana"**.
**Vista general:** totes les setmanes amb resum, comptador fetes/total, bafarada
de notes clicable (popup), enllaç (cadena), 3 punts per tutor (clic = marca
totes), festius ⛔ i sortides 📌, buides atenuades.

**Persistència programació:** `api.progSetCell(subject, key, {items,notes,link,title})`,
`api.progSetDone(...)`, `api.progSetSubject(subject, map)` (per als desplaçaments).
Backend: casos `progSetCell` (camps condicionals, no s'esborren entre ells),
`progSetDone`, `progSetSubject`.

### Programació anual 2026-27 (sembra incrustada)
Les dades reals de Català, Mates i Medi viuen a `dades/programacio_2n_2026-2027.json`
(font de veritat) i s'incrusten a `index.html` com a constants generades:
`PROG_SEED` (català/mates per dilluns), `PROG_MEDI_PROJ` (3 projectes),
`PROG_REDUIDES` (S16/S17, **tal com ho marca el JSON**, no calculat).
Regenerar: `node scripts/gen_prog_seed.js dades/programacio_2n_2026-2027.json <sortida>`
i substituir el bloc a `index.html`.
- **No hi ha botó d'importació.** `progItemsView(subject,key)` mostra els ítems desats i,
  si no n'hi ha, la sembra. Quan algú toca un punt o un text, la cel·la es desa sencera
  (**materialització mandrosa**). `progMaterializeSeed(subject)` es crida **abans** de
  qualsevol reprogramació (carry/shift), si no la sembra reapareixeria a la setmana buidada.
- **Ítem ampliat:** `{id, t, done{}, c}` + `PROG_ITEM_EXTRA` = `k`(tipus), `pag`, `llib`,
  `doc`(dictat), `un`, `pgs`, `tema`, `p`(pendent), `s`(sessions), `mat`, `nota`.
  L'`id` ve del JSON i és la clau estable → `progNormItem` els conserva i la vista setmanal
  ja NO els perd (abans sí: bug arreglat).
- `completada` del JSON → es mapa al model de l'app `done:{tutor:true}` (3 punts per tutor).
- **Medi té dues vistes** (`MEDI_VIEW`): *Projectes* (per defecte, `renderMediProjectes`,
  claus `proj-cos|proj-temps|proj-ciutat` dins `programacio.medi`) i *Setmanes* (la de sempre).
  Les claus de projecte i les de dilluns conviuen; `progComputeShift` ja preserva les no-data.
- **Pendents (no inventar res):** les 39 tasques `comunica` (sense pàgina) i les 4 activitats
  de *La ciutat* amb `sessions:null` porten `p:1` → etiqueta "⏳ a concretar".

### Carpeta viatgera (dins Programació, pestanya "Carpeta viatgera")
Deures quinzenals que es donen els **DILLUNS** (canviat el 16-09-2026; abans dimecres).
`CV_START='2026-09-14'`; cada **14 dies** (`_cvGrid()`): si el dilluns és de vacances no hi ha
cicle; si és festiu o de lliure disposició es dona el primer dia lectiu de la setmana
(12 oct → dt 13; 7-8 des → dc 9) → **18 cicles**. Es **recull** el dilluns següent
(`cvCollectOf`, comptant des del dilluns de la setmana), o el primer dia lectiu si no ho és.
`cvMigraDilluns()` (a l'arrencada) mou les dades desades amb dates de dimecres al cicle de la
mateixa setmana; és idempotent. Model: reaprofita `programacio`
amb `subject='carpeta'` i `key=dataISO_de_dona`. Cada cicle té: **títol**
(ex. "Carpeta Viatgera 1 · La tardor"), **deures** (llista amb 3 punts per tutor),
**enllaç al Google Doc** (a Drive). Dues vistes: **"Aquest cicle" / "Tots els
cicles"** (`CV_VIEW`), navegador de cicle (`CV_IDX`).
**Qui l'ha entregada:** dins de cada cicle, botó 🎒 que desplega la llista d'alumnes
per classe (pestanyes; per defecte la del tutor) per marcar qui l'ha tornada.
Model: `STATE.cvLliurat[dataDelCicle][nom]=true` (§5) — granular i idempotent, així
els tres poden marcar alhora. `api.cvLliurat(key,alumne,on)` → backend `cvLliurat`.
Funcions: `cvLliuratBlock` / `cvLliuratsDe`; estat obert: `CV_LLIURAT_OPEN`, `CV_CLASS`.

**Avisos a la portada** (`buildCarpetaPanel` + `cvUpcoming`):
- Si la carpeta d'AQUESTA setmana està **buida** → avisa des del **dilluns**
  ("Prepara la carpeta d'aquesta setmana"). Les setmanes futures no molesten.
- El dia que toca: **"Donar la carpeta"** / **"Recollir la carpeta"** (només el dia).
- El títol del cicle surt a l'avís i al selector.

**Pendent obert (proposat, no fet):** connectar la carpeta de Drive (com fa
`Comandes`) perquè l'app **auto-enllaci o creï** el Google Doc de cada cicle amb
nom estandarditzat.

## 9. Altres funcions
- **El racó dels reptes** (dins `eines`, `EINA='reptes'`): control de les caixes de
  treball autònom. **110 caixes-nivell** reals del curs 2026-27: Mates 20 caixes/62
  nivells (2 ⭐ reptes extra: M-06 Meitats i quarts, M-12 Simetria) i Català 16/48.
  Font de veritat: `dades/reptes_caixes_2026-2027.json` (extret de `Guia_de_les_caixes.pdf`).
  Regenerar la sembra: `node scripts/gen_reptes_seed.js` i substituir `REPTES_SEED` a
  `index.html`; el full d'etiquetes: `node scripts/gen_nfc_doc.js` (**no** va dins l'app).
  - **Dos tipus d'entrada dins `caixes`** (⚠️ important):
    - **TEMA** `{id:'M-06', tipus:'tema', codi, materia, tema, nom, d, fitxa, estoc, low, eval}`
      → aquí hi viuen les **còpies** i la **fitxa imprimible**, perquè *la fitxa és la
      mateixa per als 3 nivells de la caixa* (una fitxa per alumne i nivell fet).
    - **NIVELL** `{id:'mat-t06-n2', codi:'M-06', materia, tema, nivell(1-3=★..★★★, 4=⭐ extra),
      num(llista de la paret), nom(caixa), nn(nom del nivell), d(què fa el nen)}` → per a
      l'NFC i el seguiment. **No** té estoc propi.
    - `reptTemaDe(x)` resol sempre al tema; `reptQueden`/`reptLow` compten les fitxes
      gastades com els registres de **tots** els nivells d'aquell tema.
    `REPTES_SEED_V` = versió de la llista: si puja, `reptesLoad()` resembra
    **conservant registres i estoc**.
  - **Fitxes imprimibles:** 36 PDF a `fitxes/Fitxa_<CODI>_BN.pdf` (A4 apaïsat, 2 fitxes
    per full, B/N). El botó 🖨️ de la targeta de tema (i l'avís de la portada) demana
    quantes còpies faràs, les suma a l'estoc i obre el PDF.
  - **NFC:** cada caixa té la URL `?repte=<id>`; a l'arrencada `PENDING_REPTE` +
    `reptApplyPending()` (amb retard, perquè el parany de `popstate` no ho trepitgi)
    obre la pantalla d'escaneig d'aquella caixa.
  - **Vistes:** *Caixes* (agrupades per codi/tema, targeta clicable), *Per alumne*
    (cerca pel nom → gestió: checkbox a les "en curs" + passar-les a fet), *Evolució*
    (estadístiques, ★/★★/★★★, alumnes per nombre de caixes, barres per matèria).
  - **Estat:** viu a **`STATE.reptes = {caixes, registres, v}`** → **sincronitzat** entre
    els tres tutors (Google Sheets), com la resta. `REPTES` és un *getter* que apunta
    sempre a `STATE.reptes` (si fos una còpia, el sync de 20s el deixaria desfasat).
    Registre = `{id, caixa, alumne, estat:'fet'|'curs', val, by, at}`. Comptador de
    còpies = `estoc − registres`; avís a ≤3 → panell a la portada (`buildReptesPanel`,
    clic = popup de còpies impreses).
  - **API/backend:** `reptSetCaixes` (sembra; **no** entra a la cua de reintents perquè
    és regenerable), `reptCaixaUpsert`, `reptCaixaSet` (patch: estoc/low/eval),
    `reptCaixaDelete`, `reptRegUpsert`, `reptRegDelete`. **`reptRegUpsert` és idempotent
    per `id` I per `caixa+alumne`** → dos tutors marcant el mateix nen no dupliquen.
  - `reptesLoad()` s'executa **després** d'`api.init()`; `reptMigraLocal()` puja un sol
    cop els registres que hi hagués al dispositiu (flag `coord_reptes_migrat`).
- **Comentaris a les entrades** (estil Google): cada targeta renderitzada per
  `entryCard` (Aspectes generals + subtemes) porta un **botó al costat, FORA de la
  targeta** (`entryRow` → `.comment-rail`) que desplega un **panell de comentaris**.
  Es pot **escriure** un comentari, **respondre** en fil, **marcar com a completat**
  (resolt, s'agrupa a "Completats") i **esborrar** comentaris/respostes. Estat obert
  del panell: `OPEN_COMMENTS` (Set en memòria). Model: `STATE.comments[entryId]=[fils]`
  (§5), desacoblat de l'entrada per no trepitjar-la en editar. Funcions:
  `entryRow/commentPanel/commentThread/commentBubble/threadComposer`.
  `api.commentAdd/commentReply/commentResolve/commentDelete/commentReplyDelete`.
  Backend: casos homònims (upsert idempotent per `id`); `deleteEntry` neteja els
  comentaris de l'entrada. ⚠️ Aquests casos són **NOUS a `doPost`** → cal **nou
  desplegament del Web App** (§11) perquè el frontend els vegi.
  **Novetats a la portada:** cada comentari/resposta té `seenBy[]` (qui l'ha vist).
  `novItems()` genera una targeta `kind:'comment'` per cada entrada amb comentaris
  no vistos per ME (i no escrits per ME). Es marquen vistos en obrir el panell,
  clicar la targeta o "Llegida" (`api.commentSeen(entryId)` → backend `commentSeen`,
  unió idempotent per tutor). El botó lateral mostra un punt groc si n'hi ha de nous.
- **Correus** (secció `correus`): gestor d'enviaments. Cada correu: **assumpte**,
  **cos**, **dia d'enviament** (opcional), i **3 botons "Enviat" per tutor**.
  Botó **copiar el cos** (envien per **Clickedu**, NO Gmail → no hi ha botó Gmail).
  A la portada, panell **"Correus per enviar"** (els que a mi em falta enviar).
  `api.correuUpsert/correuDelete/correuSent`.
- **Perfil** (topbar, bombolla amb **engranatge**): popup per **canviar de perfil**
  i **activar el correu recordatori (8:00)** per tutor (`api.setEmailReminder`,
  desa a `STATE.emailReminders`).
- **Autoritzacions d'una sortida** (dins `excursions`, botó al costat de «Pícnics», estat
  `AUT_SUB`/`AUT_CONFIG`/`AUT_CLASS`): marcatge alumne per alumne, amb **caselles pròpies de cada
  sortida** (p. ex. Autorització, Dret de veu, Dret d'imatge, Pagament, o les que es vulguin).
  Model: `STATE.autoritzacions[subthemeId] = {camps:[{id,nom}], marques:{'CLASSE|Nom':{campId:true}}}`.
  `camps` es desa sencer (`api.autSetCamps` → `autCamps`); les marques són **granulars i idempotents**
  (`api.autSet` → `autSet`), així els tres tutors poden marcar alhora. Casos `autCamps`/`autSet` al
  `doPost`: ✅ al `.gs` i Web App redesplegat (08-10-2026) — van estar al web però NO al `.gs` des
  del 28-09 fins al 08-10 (§3: per què això és perillós). Per defecte hi ha una sola
  casella, «Autorització»; `AUT_PRESETS` són les propostes ràpides. Funcions: `renderAutoritzacions`,
  `autDades/autCamps/autTe/autCompta/autInicials` (abreviatura de columna, ignora «de/d'/la…»:
  Dret de veu → DV, Dret d'imatge → DI) i `autTextQueFalta` (botó «Copia qui falta»).
  Les pestanyes de classe compten els alumnes que tenen **totes** les caselles.
- **Registre llibres a casa** (dins `eines`, `EINA='llibres'`): els llibres de l'escola que els
  nens i nenes s'emporten a casa per llegir. ⚠️ **Funciona per CICLES, no és una graella de
  tothom × tots els llibres** (així estava plantejat al principi i era un error): no tots
  s'emporten els 11 llibres; cada nen en té UN, tots se l'emporten el MATEIX dia i el tornen el
  MATEIX dia, i quan l'ha tornat ja se li pot assignar un altre al cicle següent. Com a molt en
  llegiran 3 en tot el curs. **Qui no el torna ha de seguir sortint a l'avís.**
  Model: `STATE.llibres = {titols:[{id,nom}], cicles:[{id, nom, dona, recull, alumnes}]}`, on
  `dona`/`recull` són dates ISO i `alumnes` va per clau composta `CLASSE|NOM` (`stKey`) →
  `{llibre:'l03', tornat:'2026-10-02'}`. `titols` i la **meta del cicle** (nom i dates) es desen
  senceres (`api.llibTitols` → `llibTitols`; `api.llibCicleSet(id,patch)` → `llibCicleSet`, upsert
  per `id` que **fusiona** el patch, així dos tutors que toquin camps diferents no es trepitgen);
  el que té cada alumne és **granular i idempotent** (`api.llibAlumne(cicleId, clau, patch)` →
  `llibAlumne`, un camp o dos per alumne, `null` esborra el camp) → els tres tutors poden repartir
  i marcar alhora. Esborrar un cicle: `api.llibCicleDelete` → `llibCicleDelete`.
  **11 llibres sembrats** a `LLIB_SEED` (ids estables `l01..l11`): Tumbili, Història d'una orella,
  Llista d'aniversari, Plou, Mal a la mà mal al peu, En Ton i la Neus, Titelles fades i follets,
  Anem a la masia, Ai Terri Terri..., Ha nascut en Marçal, La Festa Major. Com la programació, és
  **sembra mandrosa**: `llibTitols()` torna la llista desada i, si encara no s'ha tocat mai, la
  sembra; la primera edició la materialitza. Treure un títol **no** toca els cicles que ja el
  tinguin assignat (`llibTitol` d'un id que ja no hi és diu «(llibre tret de la llista)»).
  **La vista** és UNA de sola (ja no calen tres): selector de cicle a dalt (amb «falten N» /
  «tots tornats» / «sense repartir»), els dos comptadors (Repartits X/total · Tornats X/repartits),
  les dates, pestanyes de classe amb `(tornats/repartits)` i, a sota, una fila per alumne amb el
  **botó del llibre** (`llibTriaLlibre`, modal que marca els que ja ha tingut en ALTRES cicles i
  el que té ara, i permet treure'l) i la casella ✅ de tornat (desactivada si no té llibre).
  Marcar tornat **no repinta la secció**: actualitza els comptadors i la pestanya a mà, per no
  perdre el punt on ets.
  **«Reparteix els N que falten»**: `llibReparteix(cicle, classe)` dona un llibre a qui no en té,
  **sense repetir-li cap que ja hagi tingut en un altre cicle** (`llibJaTingut`) i repartint les
  còpies el més igualades possible dins la classe. **No toca els que ja en tenen** i no surt si no
  falta ningú. Si ja els ha tingut tots, repeteix (val més això que deixar-lo sense).
  **Avís a la portada** (`buildLlibresPanel`, dins `renderDash`), amb tres motius per ordre:
  (1) **vençut** — ja tocava recollir-los i en falten → insisteix cada dia, amb els dies de retard;
  (2) **toca** — avui és el dia de donar-los o de recollir-los; (3) **per repartir** — el dia de
  donar-los ja ha arribat i encara queda gent sense llibre, **només mentre el cicle és viu** (si ja
  ha passat el dia de recollir no té sentit repartir-ne més). Si no es compleix cap, no surt res.
  Només de **la meva classe** (`TUTOR_CLASS[ME]`): cadascú reclama els seus. Si la lletra no es
  troba a `STATE.students` (§13: pendent de confirmar 2nA/B/C), ensenya **totes** les classes, ho
  diu al títol i posa el xip de classe a cada fila. Topall de `LLIB_PANEL_MAX`=6 files + «i N
  alumnes més». Cada fila porta la casella ✓ per marcar-lo **tornat sense sortir de la portada**
  (crida `refreshHome()`, no `renderDash()`: si no, la rajola de la portada es quedava amb el
  número vell — el mateix bug que va sortir als avisos). El clic obre l'eina **al cicle i la classe
  bons**; `LLIB_NAV` fa el mateix paper que `PROG_NAV`.
  **El cicle «d'ara»** (`llibCicleActual`) és el primer que encara té llibres sense tornar i, si
  tots estan tancats, l'últim. Així un llibre que no torna mai no deixa que el cicle vell
  desaparegui de la vista.
  Funcions: `renderLlibres` + `renderLlibres{Buit,Cicle,Config}`, `llibCicleNou`, `llibTriaLlibre`,
  `llibDades/llibTitols/llibTitol/llibClasses/llibAvui/llibDies/llibFmtDia/llibCicles/llibCicle/
  llibCicleActual/llibAlu/llibFalten/llibComptaCicle/llibJaTingut/llibDiesDeRetard/llibTextFalten/
  llibReparteix`. Estat: `LLIB_CICLE`, `LLIB_CLASS`, `LLIB_CONFIG`, `LLIB_NAV`.
  ⚠️ `llibAvui()` fa servir l'hora **LOCAL**: amb `toISOString()` a la nit la data sortia del dia
  abans. Casos `llibTitols`, `llibCicleSet`, `llibAlumne` i `llibCicleDelete` al `doPost`: cal el
  `.gs` actualitzat i **un desplegament nou del Web App** (§11). El `llibSet` d'abans ja no hi és;
  les dades velles de `llibres.marques` segueixen a Firestore però ja no es llegeixen.
- **Gestió de grups** (secció pròpia `grups`, píndola al costat de Programació): tres coses.
  Model: `STATE.grups = {etiquetes, marques, notes, noms, conjunts}` (§5).
  1. **Marques a tenir en compte en fer els grups.** Etiquetes sembrades a `GRUP_ETIQ_SEED`:
     **PI** i **Conducta** (ids estables `pi`/`conducta`), i se'n poden afegir de lliures
     («Què marquem»). Més una **nota lliure per alumne** per a tot allò que no és una casella.
     `etiquetes` es desa sencer (`api.grupEtiquetes`); `marques` i `notes` són **granulars i
     idempotents** per alumne (`api.grupMarca` / `api.grupNota`), clau `CLASSE|NOM`.
     Treure una etiqueta **no** esborra les marques (si la tornes a posar, hi són).
  2. **Noms: capa de CORRECCIONS, no una còpia de la llista.** ⚠️ Important: la llista
     d'alumnes la mana el **full** i Apps Script la torna a pujar **cada hora**
     (`alumnesAFirebase`), per això `STATE.students` NO s'escriu des de l'app
     (`FB_NO_DESAR`). `STATE.grups.noms['CLASSE|NOM'] = 'Nom corregit'` diu només **com es
     mostra**: la clau no canvia mai, així la correcció sobreviu la sincronització i **cap
     registre queda orfe** (llibres, autoritzacions, reptes i carpeta viatgera van lligats a
     la clau original). `stMostra(classe, nom)` és l'ÚNIC lloc que decideix com es pinta un
     nom; `stMostraNom(nom)` resol la classe sol (per al generador i els reptes, que
     treballen amb noms solts). Ja s'aplica a: Gestió de grups, carpeta viatgera, pícnics,
     autoritzacions, llibres (les 3 vistes + l'avís de la portada), assistència, reptes,
     generador de grups, i els textos per copiar (`autTextQueFalta`, `llibTextPendents`,
     `buildAbsentText`/`buildAbsentBody`). Botó **«Copia la llista de 2nX»**
     (`grupTextLlista`) → els noms corregits, un per línia, per enganxar-los al full i
     deixar-ho definitiu.
  3. **Repartiments** (`conjunts`): grups desats amb nom. Es poden crear a mà (surten 4 grups
     buits), reanomenar el repartiment i cada grup, **moure alumnes amb un desplegable**,
     afegir/treure grups (els seus membres tornen al pool), triar **quines classes** hi entren
     (treure una classe treu també els seus membres, si no quedarien alumnes fantasma),
     **«Reparteix-los»** (posa els que queden al grup amb menys gent) i copiar-ho tot.
     Cada fila de membre ensenya les seves marques i la nota.
  **Generador automàtic:** es queda a `eines` (`EINA='grups'`). Des d'aquí hi ha un botó per
  anar-hi, i des d'allà **«Desa'ls a Gestió de grups»** (`grupDesaDelGenerador`).
  `generateGroups` ara fa servir `grupMarcatsPlans()` = les marques del full (`STATE.flags`,
  que segueixen valent) **+** les d'aquí → els alumnes marcats es reparteixen de debò.
  ⚠️ El generador treballa amb **noms solts**: amb dos homònims de classes diferents (una
  Anna Puig a 2nA i una altra a 2nC) el nom sol no diu de qui es tracta. `grupResolClau(nom,
  etiquetaSeccio, gastats)` ho resol per ordre: el sufix «(2nB)», la classe de la secció, i
  si no, la primera classe amb aquest nom que encara no s'hagi fet servir en aquest
  repartiment (bug real: sense això, desar els grups de 2nC assignava l'Anna de 2nA i deixava
  la de 2nC sense grup).
  ⚠️ `etiquetes` i cada `conjunt` es desen **sencers**: si dos tutors retoquen el MATEIX
  repartiment exactament alhora, l'últim que desa es queda (com la programació, §7). Les
  marques, les notes i els noms són granulars → això no els passa.
  Funcions: `renderGestioGrups` + `renderGrups{Alumnes,EtiqConfig,Conjunts,Conjunt}`,
  `grupDades/grupEtiq/grupClasses/grupTe/grupNotaDe/grupCompta/grupTeAlgunaCosa/grupTextLlista/
  grupConjunts/grupConjuntDe/grupMembresTots/grupPool/grupParteix/grupFmtData/grupMarcatsPlans/
  grupResolClau/grupDesaDelGenerador`. Estat: `GRUPS_VIEW`, `GRUPS_CLASS`, `GRUPS_CONJ`,
  `GRUPS_ETIQ_CFG`, i `GRUPS_NAV` (el mateix paper que `PROG_NAV`/`LLIB_NAV`).
  Casos `grupEtiquetes`, `grupMarca`, `grupNota`, `grupNom`, `grupConjuntUpsert` i
  `grupConjuntDelete` al `doPost`: ✅ al `.gs` i Web App redesplegat (08-10-2026).
- **Avisos ràpids** (botó de la barra de dalt, al costat del perfil: bafarada amb alerta,
  `#avisBtn`): escriure una nota ràpida que les altres dues veuen a la portada, i que poden
  **comentar** o **marcar com a llegida**.
  **No hi ha model nou:** són **`entries` amb `section:'avisos'`** (`AVIS_SEC`). Això ho hereta
  tot del que ja funciona i està provat: `readBy` = «alerta llegida», els comentaris en fil
  (`STATE.comments[entryId]` + el rail d'`entryRow`), `deleteEntry` que neteja els comentaris,
  l'edició, la cerca i la cua de reintents. Es pinta amb `renderEntries`, que ja porta tot
  això: **zero codi de pintat nou per a la secció**.
  **On es veuen (dos llocs, no tres):**
  1. **La targeta de la portada** (`buildAvisosPanel`, dins `#avisBlock`/`#avisWrap`): de
     **banda a banda** i **SOTA** les columnes de tasques, carpeta i llibres (`#dashCols`),
     just abans de Novetats. To **vermell** (`--avis` `#C9442F`, ratlla de 5 px a l'esquerra
     i fons degradat) perquè destaqui. Hi surten els que (a) jo no he llegit, (b) tenen
     comentaris que no he vist, o (c) són **meus** i encara no els ha llegit tothom — així
     l'autor veu si cal insistir («falta Mireia i Cristina» / «llegit per tothom»).
     **Cada avís (`avisItem`) porta a dins:** qui l'ha escrit i quan, el xip d'estat, el
     **text sencer a tota l'amplada** (clicable: obre l'avís amb els comentaris; tallat a 8
     línies amb `-webkit-line-clamp`), els **fils de comentaris** (els dos últims, amb enllaç
     a la resta) i **els seus dos botons**: «✓ Marca'l com a llegit» (vermell ple, lletra
     blanca, 4,83 de contrast) i «💬 Contesta (N)». Topall `AVIS_PANEL_MAX`=5 + «i N avisos
     més». Al capdamunt, «+ Escriu-ne un» (`obreAvisRapid`).
     **Contestar sense sortir de la portada** (`avisComposer`): el compositor s'obre dins de
     la mateixa targeta i desa amb `api.commentAdd` — és el **mateix fil** que el panell de
     comentaris de dins de la secció. Contestar un avís també el marca com a llegit.
     ⚠️ `renderAvisosHome(focusComp)` **no repinta si el focus és dins del compositor** (una
     sincronització s'enduria el que s'està escrivint); i `AVIS_DRAFT` guarda l'esborrany a
     cada tecla, així un repintat sense focus el torna a posar. `AVIS_REPLY` diu quin avís el
     té obert.
  2. **El botó de la barra de dalt** (`#avisBtn`): **obre la pàgina d'avisos**
     (`openSection('avisos')`), amb tots els que s'han escrit i els seus comentaris. El
     comptador `.avis-badge` i el punt `.t-alerta` ja diuen si hi ha res per llegir o
     comentaris nous.
  ⚠️ **No hi ha rajola al bento** (`inBento:false`, §6). N'hi va haver una de `size:'wide'`
  (banda vermella a dalt de tot) i es va treure el 08-10-2026: dient-ho a la targeta i al
  botó, una tercera vegada només feia soroll. Amb ella van marxar el `metaLabel` dels avisos
  i el CSS de `.tile.wide`.
  **Escriure'n un:** `obreAvisRapid()` → modal d'UNA caixa de text (res de títol ni enllaç: ha
  de ser ràpid). ⌘/Ctrl+Enter publica. Es desa amb `readBy:[ME]` → per a mi ja està llegit i
  les altres dues el veuen com a nou. El modal porta a sota un enllaç per veure'ls tots.
  **Número vs. alerta de color** (`avisNoLlegits` / `avisComentarisNous`): el **comptador**
  (`.avis-badge` del botó) compta només els avisos **per llegir**; els **comentaris nous** són
  un **punt de color** (`.t-alerta`) a la icona, perquè són una cosa diferent i no han
  d'inflar el número. Si hi ha les dues coses, es veu el número (ja crida prou) i el `title`
  ho diu tot. `updateAvisBadge` es crida des de `refreshHome` i des de `repaintAfterSync`,
  perquè el botó també s'actualitzi **dins d'una secció**.
  ⚠️ **Els avisos NO entren a `novItems()`** (ni ells ni els seus comentaris): tenen la seva
  targeta, que és més visible i porta qui els ha llegit. Si hi entressin, la mateixa cosa
  sortiria **dues vegades** a la portada.
  ⚠️ `.avis-pill` porta el `margin-left:auto` que abans tenia `.topbar .me`: amb dos
  `margin-left:auto` el buit es reparteix entre tots dos i els dos botons quedarien separats.
  ⚠️ La regla de la targeta és `.hpanel.avis-panel` i no `.avis-panel` a seques: `.hpanel` ve
  més avall al full i, amb la mateixa especificitat, li guanyava la vora i el fons (la ratlla
  vermella no es veia).
  Funcions: `avisosTots/avisNoLlegit/avisQuiFalta/avisActius/avisPendentsMeus/updateAvisBadge/
  obreAvisRapid/renderAvisosHome/buildAvisosPanel/avisItem/avisComposer/obreAvisAmbComentaris`.
  Estat: `AVIS_REPLY`, `AVIS_DRAFT`. Variables de color: `--avis`, `--avis-ink`.
  **No cal cap acció nova al backend:** fa servir `addEntry`, `entryRead`, `commentSeen` i la
  resta, que ja hi són. **No cal redesplegar el Web App per això.**
- **Comandes**: llegeix una carpeta de Drive; estat enviat a Direcció/Administració.
- **Correu de pícnics** (dins Excursions): obre Gmail amb la llista i la data.

## 10. Recordatoris diaris (Apps Script — PRIVAT, fora de la web)
Al final de `Codi_AppsScript.gs`. **Res d'això surt a la web ni a GitHub.**
- **`recordatoriTelegram()`** → 7:00, missatge de **Telegram només per a Pol**
  amb els seus pendents (només si en té). **El token NO és al codi:** viu a les
  Propietats de l'script (`TG_TOKEN` i `TG_CHAT_ID`), i `_tgToken()`/`_tgChat()` el
  llegeixen d'allà. `configuraTelegram()` serveix per desar-lo-hi un sol cop.
  ⚠️ Tot i això, aquest fitxer **NO ha d'anar mai a un repo públic** (i el de
  Coordinació 2n ho és): hi ha el `chat_id`, les adreces de la Cristina i la Mireia
  (`REMINDER_EMAILS`) i els IDs de les carpetes del Drive. El `.gitignore` ho evita.
- **`recordatoriEmails()`** → 8:00, **correu** a Cristina/Mireia (adreces a
  `REMINDER_EMAILS`) **només si han activat l'opció a l'app** (`emailReminders`)
  **i** tenen pendents.
- **`crearTriggersRecordatori()`** → executar UN cop per programar els dos
  disparadors (7:00 i 8:00). Zona horària del projecte: **Europe/Madrid**.
- **`provaRecordatoriTelegram()`** → prova SEGURA: envia només al Telegram de Pol,
  **cap correu**.

## 11. Desplegament (IMPORTANT)
Dos destins separats:
1. **Web → GitHub Pages:** pujar `index.html`, `sw.js`, `manifest.webmanifest`,
   `.nojekyll` i `img/`. **MAI `Codi_AppsScript.gs`.** GitHub Pages: *Deploy from
   a branch* → `main` / root. ⚠️ Si canvies imatges/assets de `sw.js`, apuja la
   versió de `CACHE` (`coord-2n-v1`→v2) perquè els clients agafin els nous.
2. **Backend → Apps Script:** enganxar `Codi_AppsScript.gs` a l'editor.
   - Si has canviat **accions de `doPost`** (casos del `switch`) → cal **NOU
     desplegament del Web App** (Implementar → Gestionar implementacions → versió
     nova) perquè el frontend les vegi.
   - Si només toques **triggers/recordatoris** → NO cal redesplegar; només tornar
     a executar `crearTriggersRecordatori` si cal.

**Memòria cau al mòbil:** després de pujar, obrir amb `?v=N` o desinstal·lar/
reinstal·lar la PWA per veure els canvis.

## 12. Convencions i flux de treball
- **Idioma:** tot en **català** (UI, missatges, comentaris de cara a l'usuari).
- **Especialistes**, mai "no-tutors".
- **Tota la informació es desa al Google Sheets.** localStorage només per a la
  còpia optimista i la cua `PENDING`. Mai com a magatzem principal.
- **Sense frameworks**, sense build. Un sol `index.html`.
- **Validació obligatòria a cada canvi** (fes-ho sempre):
  ```bash
  # Frontend: extreu els <script> sense src i comprova sintaxi
  python3 - <<'PY'
  import re; html=open('index.html',encoding='utf-8').read()
  open('/tmp/app.js','w').write('\n;\n'.join(re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>',html,re.S)))
  PY
  node --check /tmp/app.js
  # Backend:
  cp Codi_AppsScript.gs /tmp/chk.js && node --check /tmp/chk.js
  ```
- **Comprovar que el backend i el web diuen el mateix** (abans d'executar
  `gen_fb_apply.js`, i sempre que hagis tocat accions). Compara els `case` dels dos
  costats; ha de sortir «(cap)» a les dues llistes:
  ```bash
  python3 -I - <<'PY'
  import re
  gs=open('Codi_AppsScript.gs',encoding='utf-8').read()
  html=open('index.html',encoding='utf-8').read()
  tall=lambda t,a,b:(lambda i:t[i:t.index(b,i)])(t.index(a))
  cas=lambda t:set(re.findall(r"case '([A-Za-z]+)':",t))
  a=cas(tall(gs,'function _apply(','function _loadStudents('))
  b=cas(tall(html,'function fbApply(','/* === PORT DEL BACKEND: fi === */'))
  print('falten al .gs :', sorted(b-a) or '(cap)')
  print('sobren al .gs :', sorted(a-b) or '(cap)')
  PY
  ```
  La prova definitiva: executar `node scripts/gen_fb_apply.js` i comprovar que
  `git diff --quiet index.html` no detecta cap canvi.
- **Prova en navegador de debò** (`scripts/prova_navegador.js`): obre `index.html` en un
  Chromium real servit des de `127.0.0.1` i hi clica a sobre (portada, avisos, llibres,
  gestió de grups). És l'única prova que veu **CSS i mides**, i per això val la pena
  passar-la quan toques res de la portada o de la presentació:
  ```bash
  npm i playwright-core && npx playwright install chromium   # un sol cop
  node scripts/prova_navegador.js                            # captures a .qa/
  # si ja hi ha un Chromium al sistema (o la versió no lliga amb la de playwright-core):
  CHROMIUM=/ruta/al/chrome node scripts/prova_navegador.js
  ```
  Segur per disseny: a `127.0.0.1` l'app fa servir **`coord_proves`** (§3), mai la de
  producció, i el script a més **talla tota la sortida a internet** i sembra una còpia
  local. ⚠️ `node_modules/` i `package*.json` estan al `.gitignore`: la dependència és
  **només** d'aquesta prova i el projecte segueix sense build.
  Ja ha trobat dos bugs que les proves de taula no podien veure: la banda d'avisos es
  quedava amb el comptador vell en marcar-ne un de llegit (es repintava `renderDash` i no
  el bento), i les files de nota buides de Gestió de grups es veien igualment
  (`display:flex` guanya a `[hidden]{display:none}`).
- Cada canvi: edició petita i incremental, validar, i (si escau) provar la lògica
  de dates amb un mini-script de node abans de donar-ho per bo.

## 13. Pendent / futur (idees ja parlades)
- **Drive per a la carpeta viatgera:** auto-llistar/crear els Google Docs de cada
  cicle (com Comandes).
- **Calendari de l'escola:** ✅ FET del tot segons el calendari OFICIAL 2026-27
  (lliure disposició, festa local, Nadal 22 des→7 gen, tardes no lectives 19 març i
  21 juny). El curs segueix acabant el **18 juny** a la programació (39 setmanes); el
  21 juny és l'últim dia administratiu (tarda no lectiva), es mostra com a nota a S39,
  no com a 40a setmana. Pendent: confirmar la lletra de classe (2nA/B/C).
- **Omplir la programació** amb els continguts reals quan es tinguin.
- (Opcional) fer el "fet" de tasques granular per eliminar el xoc rar de §7.

---
### Com continuar amb Claude Code
1. Obre aquesta carpeta com a projecte.
2. Fes els canvis a `index.html` (frontend) i/o `Codi_AppsScript.gs` (backend).
3. Valida (§12). 
4. Puja el web a GitHub (sense el `.gs`) i, si cal, redesplega el backend (§11).
El `.gitignore` ja evita que el `.gs` s'apugi a git per error.

## Sincronització amb GitHub: automàtica, sempre

En Pol treballa des de diversos ordinadors (la torre, portàtils, el mòbil).
GitHub és l'única còpia que veuen tots. Per tant, **sense que ho demani**:

- **En començar** qualsevol conversa: `git pull` abans de tocar res. Si hi ha
  canvis locals sense desar o un conflicte, atura't i explica-li-ho.
- **En acabar cada canvi** (fet i comprovat): commit amb un missatge clar en
  català i `git push`. No cal preguntar-ho.
- ⚠ Si el repositori publica una web (GitHub Pages), **el push la publica**:
  famílies i mestres la veuen al moment. Push només quan el canvi està acabat
  i verificat, mai a mig fer.
- Si el pull o el push fallen, digues-ho clarament: si no, el canvi es queda
  en un sol ordinador i en Pol no ho sabrà.
