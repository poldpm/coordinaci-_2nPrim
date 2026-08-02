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
- **Backend:** **Google Apps Script** (Web App) + **Google Sheets**. Tot l'estat
  es desa com un **blob JSON** a la pestanya `DB` del full (partit en trosses per
  files si creix). Concurrència protegida amb **`LockService`**.
- **PWA:** `manifest.webmanifest` + icones a `img/`. Instal·lable al mòbil.

Config al principi de `index.html` (objecte `CONFIG`):
- `WEB_APP_URL` → URL del desplegament d'Apps Script (és pública; ja surt al
  frontend desplegat).
- `SECRET` → buit (sense secret compartit).
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
Codi_AppsScript.gs       ← BACKEND. NO va MAI a GitHub (veure §10). Local + Apps Script.
CLAUDE.md                ← aquest fitxer
.gitignore               ← exclou Codi_AppsScript.gs de git
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
comments{}       // comentaris per entrada (estil Google): { entryId: [ {id, author, text, createdAt, resolved, resolvedBy, replies:[{id,author,text,createdAt}]} ] } — veure §9
```
`normalizeState()` garanteix que totes les claus existeixen.

## 6. Seccions (constant `SECTIONS` a index.html)
`general`(entries), `tasques`(tasks), `calendari`(agenda), `projectes`/
`excursions`/`activitats`(subthemes), `programacio`(programacio),
`correus`(correus, `customHero`), `enllacos`(links), `avaluacio`(avaluacio,
`customHero`), `comandes`(entries, `customHero`), `eines`(eines, `customHero`).

**Regla capçalera:** `openSection` pinta una capçalera per defecte **excepte** si
la secció té `customHero:true`. Si un `render*` es fa la seva pròpia capçalera
(`buildSecHero`), la secció HA de tenir `customHero:true` (si no, surten DUES
capçaleres — bug real que ja va passar). `programacio` NO té customHero (usa la
per defecte); `correus/comandes/eines/avaluacio` SÍ.

## 7. Sincronització i fiabilitat (nucli — llegir bé)
- **Optimista:** les mutacions actualitzen `STATE` localment i criden
  `persist(action, payload)`. `safeSave()` desa una còpia a localStorage a
  l'instant.
- **`request(action, payload)`:** POST a `WEB_APP_URL` amb **timeout de 15s**
  (AbortController).
- **Cua de reintents `PENDING`:** si falla la xarxa, la mutació s'encua a
  localStorage i es reintenta (en ordre) a `flushPending()` — abans de cada pull,
  en tornar el focus i a l'event `online`. **Cap edició/esborrat es perd.**
- **`startCloudSync()`:** cada 20s (només si s'està a la portada) fa `getState`.
  **Només re-renderitza si l'estat ha canviat** (compara `JSON.stringify`, var
  `_lastSig`). Si hi ha canvis locals pendents sense enviar, **NO** sobreescriu
  l'estat.
- **Backend:** `_handle` aplica cada acció amb `LockService` (serialitza
  escriptures concurrents). Les **altes són idempotents** (upsert per `id`) →
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
Deures quinzenals que es donen els **dimecres**. `CV_START='2026-09-16'`; es dona
cada **14 dies** (`_cvGrid()`, salta vacances → **18 cicles**); es **recull** el
dimecres següent (`cvCollectOf` = +7 dies). Model: reaprofita `programacio`
amb `subject='carpeta'` i `key=dataISO_de_dona`. Cada cicle té: **títol**
(ex. "Carpeta Viatgera 1 · La tardor"), **deures** (llista amb 3 punts per tutor),
**enllaç al Google Doc** (a Drive). Dues vistes: **"Aquest cicle" / "Tots els
cicles"** (`CV_VIEW`), navegador de cicle (`CV_IDX`).
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
- **Comandes**: llegeix una carpeta de Drive; estat enviat a Direcció/Administració.
- **Correu de pícnics** (dins Excursions): obre Gmail amb la llista i la data.

## 10. Recordatoris diaris (Apps Script — PRIVAT, fora de la web)
Al final de `Codi_AppsScript.gs`. **Res d'això surt a la web ni a GitHub.**
- **`recordatoriTelegram()`** → 7:00, missatge de **Telegram només per a Pol**
  amb els seus pendents (només si en té). Token i chat_id **al codi** (decisió de
  Pol). ⚠️ El token és sensible: aquest fitxer NO ha d'anar mai a un repo públic.
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
