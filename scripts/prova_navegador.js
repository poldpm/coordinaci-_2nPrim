/* ============================================================================
   PROVA D'EXTREM A EXTREM — l'app de debò, en un navegador de debò
   ============================================================================
   Obre `index.html` en un Chromium real servit des de 127.0.0.1 i hi clica a
   sobre: la portada, els avisos, els llibres i la gestió de grups.

   Per què cal, si ja hi ha les altres proves:
   les proves de taula (jsdom) no veuen CSS ni mides. Aquesta ha trobat coses
   que aquelles no podien veure — per exemple que les files de nota buides es
   veien igualment (`display:flex` guanyava a `[hidden]`), o que marcar un avís
   com a llegit deixava la banda de la portada amb el comptador vell.

   SEGURETAT: 127.0.0.1 → l'app fa servir SEMPRE la col·lecció `coord_proves`
   (§3), mai la de producció. A més, aquí es talla tota la sortida a internet:
   la prova corre contra una còpia local sembrada, sense tocar res de fora.

   ÚS:
     npm i playwright-core          (un sol cop; i `npx playwright install chromium`)
     node scripts/prova_navegador.js
   (si et diu que no troba el Chromium: CHROMIUM=/ruta/al/chrome node scripts/prova_navegador.js)

   Les captures queden a `.qa/` (que el .gitignore ja exclou).
   ============================================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ARREL = path.join(__dirname, '..');
const QA = path.join(ARREL, '.qa');
const PORT = Number(process.env.PORT_PROVA || 8777);

let chromium;
try { ({ chromium } = require('playwright-core')); }
catch (e) {
  console.error('Falta playwright-core. Instal·la’l amb:\n  npm i playwright-core\n  npx playwright install chromium');
  process.exit(2);
}

const TIPUS = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.webmanifest':'application/manifest+json',
  '.png':'image/png', '.svg':'image/svg+xml', '.webp':'image/webp', '.json':'application/json', '.pdf':'application/pdf' };

const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ARREL, p);
  if (!f.startsWith(ARREL) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': TIPUS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

/* ---- L'escenari: dades realistes a la còpia local ---- */
const ara = new Date().toISOString();
const fa = n => { const d = new Date(Date.now() - n*864e5); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
const ESTAT = {
  entries: [
    { id:'av1', section:'avisos', author:'cristina', title:'', body:'Demà la sortida surt a les 9, no a les 9.30',
      rich:false, url:'', date:ara, createdAt:ara, updatedAt:ara, readBy:['cristina'] },
    { id:'av2', section:'avisos', author:'mireia', title:'', body:'He deixat les fotocòpies de mates a consergeria',
      rich:false, url:'', date:ara, createdAt:ara, updatedAt:ara, readBy:['mireia'] },
    { id:'e1', section:'general', author:'cristina', title:'Acord de claustre', body:'Cos de prova',
      rich:false, url:'', date:ara, createdAt:ara, updatedAt:ara, readBy:['cristina'] },
  ],
  tasks: [ { id:'t1', title:'Portar els permisos a direcció', owner:'pol', status:'pendent',
    author:'pol', date:ara, createdAt:ara, updatedAt:ara, readBy:['pol'] } ],
  subthemes: [], avaluacio:{}, programacio:{}, correus:[], emailReminders:{}, comments:{}, cvLliurat:{},
  autoritzacions:{},
  students: { '2nA':['Anna Puig','Bru Soler'], '2nB':['Cesc Mir'], '2nC':['Dídac Roca','Emma Vila','Anna Puig'] },
  flags: {},
  llibres: { titols: [], cicles: [
    /* un cicle que s'havia de recollir fa 6 dies i encara en falten dos (§9) */
    { id:'lc1', nom:'Llibres 1 · La tardor', dona: fa(20), recull: fa(6), alumnes: {
      '2nC|Dídac Roca': { llibre:'l01' },                   // no l'ha tornat → s'ha de reclamar
      '2nC|Emma Vila':  { llibre:'l02', tornat: fa(6) },    // tornat el dia que tocava
      '2nC|Anna Puig':  { llibre:'l03' },                   // tampoc
      '2nA|Bru Soler':  { llibre:'l04' },                   // d'una altra classe: no és cosa meva
    } },
  ] },
  grups: { etiquetes: [], marques: { '2nC|Dídac Roca': { pi:true } },
    notes: { '2nC|Emma Vila': 'No la posis amb en Dídac' },
    noms: { '2nC|Anna Puig': 'Anna P.' },               // nom corregit (§9)
    conjunts: [ { id:'c1', nom:'Grups de treball 1r trimestre', creat:ara, by:'pol', classes:['2nC'],
      grups:[ {id:'g1', nom:'Els dracs', membres:['2nC|Dídac Roca']}, {id:'g2', nom:'Grup 2', membres:[]} ] } ] },
  reptes: { caixes:[], registres:[], v:0 },
};
const CLAU = 'coordinacio_2n_demo_v17';   // STORE_KEY d'index.html

let ok = 0, mal = 0;
const cal = (c, q) => { if (c) { ok++; console.log('   ok  ' + q); } else { mal++; console.log('   XX  ' + q); } };
const igual = (a, b, q) => { const x=JSON.stringify(a), y=JSON.stringify(b);
  if (x===y) { ok++; console.log('   ok  ' + q); } else { mal++; console.log('   XX  ' + q + '\n          tenim: '+x+'\n          volem: '+y); } };

(async () => {
  fs.mkdirSync(QA, { recursive: true });
  await new Promise(r => servidor.listen(PORT, '127.0.0.1', r));

  /* Normalment playwright ja troba el Chromium que ha instal·lat. Amb la variable
     CHROMIUM se li pot dir quin vols (útil en servidors on ja n'hi ha un).
     --no-sandbox només cal quan es corre com a root (contenidors). */
  const args = (process.getuid && process.getuid() === 0) ? ['--no-sandbox'] : [];
  const opcions = { args };
  if (process.env.CHROMIUM) opcions.executablePath = process.env.CHROMIUM;
  let browser;
  try { browser = await chromium.launch(opcions); }
  catch (e) {
    console.error('No s’ha pogut obrir el Chromium: ' + e.message +
      '\nProva:  npx playwright install chromium' +
      '\n(o indica’n un amb  CHROMIUM=/ruta/al/chrome node scripts/prova_navegador.js)');
    servidor.close(); process.exit(2);
  }
  const ctx = await browser.newContext({ viewport:{width:1280, height:1000} });

  /* Res de sortida a internet: així no espera cap temps d'espera de Firebase */
  await ctx.route('**', route =>
    route.request().url().startsWith('http://127.0.0.1:' + PORT) ? route.continue() : route.abort());

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text();
    if (!/Failed to load resource|net::ERR|ERR_FAILED|service worker|ServiceWorker/i.test(t)) errors.push('console: ' + t); } });

  await page.addInitScript(([estat, clau]) => {
    // només la primera vegada: addInitScript corre a cada navegació i, en recarregar,
    // tornaria a sembrar l'estat original per sobre del que s'acaba de provar
    if (!localStorage.getItem(clau)) localStorage.setItem(clau, JSON.stringify(estat));
    localStorage.setItem('coord_me', 'pol');
  }, [ESTAT, CLAU]);

  const url = 'http://127.0.0.1:' + PORT + '/index.html';
  await page.goto(url, { waitUntil:'domcontentloaded' });
  await page.waitForSelector('#bento .tile', { timeout: 20000 });
  await page.waitForTimeout(1200);

  console.log('\n1. Arrenca i entra amb el perfil desat');
  cal(await page.locator('#app').isVisible(), 'l’app es veu (no s’ha quedat a la pantalla d’entrada)');
  cal((await page.locator('#meName').textContent()).trim() === 'Pol', 'ha entrat com a Pol');
  cal(await page.locator('#bento .tile').count() >= 11, 'la portada té les rajoles ('+(await page.locator('#bento .tile').count())+')');
  console.log('\n2. El bento NO té cap rajola d’avisos');
  igual(await page.locator('#bento .tile.wide').count(), 0, 'cap banda vermella');
  igual(await page.locator('#bento .tile').filter({ hasText:'Avisos' }).count(), 0,
    'ni cap rajola d’Avisos, tot i haver-hi 2 avisos per llegir');

  console.log('\n2b. La icona (bombolla plena amb el ! retallat)');
  const ico = page.locator('#avisBtn .icon path');
  igual(await ico.count(), 1, 'un sol path');
  igual(await ico.getAttribute('fill-rule'), 'evenodd', 'amb evenodd (el ! es retalla, no es pinta a sobre)');
  igual(await ico.evaluate(el => getComputedStyle(el).fill !== 'none'), true, 'i és PLENA');
  igual(((await ico.getAttribute('d')).match(/[Mm]/g) || []).length, 3, 'tres subcamins: bombolla + barra + punt');

  console.log('\n3. Les dues píndoles, de costat');
  const pind = page.locator('#bento .tile-pill');
  igual(await pind.count(), 2, 'hi ha 2 píndoles');
  const p1 = await pind.nth(0).boundingBox(), p2 = await pind.nth(1).boundingBox();
  cal(Math.abs(p1.y - p2.y) < 4, 'a la MATEIXA fila');
  cal(p2.x > p1.x + p1.width - 2, 'una al costat de l’altra, no encavalcades');
  igual([await pind.nth(0).textContent(), await pind.nth(1).textContent()], ['Programació','Gestió de grups'], 'Programació i Gestió de grups');

  console.log('\n4. El botó d’avisos de la barra de dalt');
  const btn = page.locator('#avisBtn');
  cal(await btn.isVisible(), 'es veu');
  igual((await btn.locator('.avis-badge').textContent()).trim(), '2', 'amb el comptador a 2');
  const cb = await btn.boundingBox(), cm = await page.locator('#meBtn').boundingBox();
  cal(cb.x < cm.x && (cm.x - (cb.x + cb.width)) < 24, 'just al costat del perfil ('+Math.round(cm.x-(cb.x+cb.width))+' px)');

  console.log('\n5. La targeta d’avisos: banda a banda i SOTA les columnes');
  const pan = page.locator('.avis-panel');
  igual(await pan.count(), 1, 'hi és');
  const cp = await pan.boundingBox();
  const ccols = await page.locator('#dashCols').boundingBox();
  cal(Math.abs(cp.width - ccols.width) < 2, 'ocupa tota l’amplada ('+Math.round(cp.width)+' de '+Math.round(ccols.width)+' px)');
  cal(cp.y > ccols.y + ccols.height - 4, 'i va SOTA les columnes de tasques i calendari');
  cal(cp.y < (await page.locator('#bento').boundingBox()).y, 'però per sobre de «Les nostres àrees»');
  const bgp = await pan.evaluate(el => getComputedStyle(el).borderLeftColor);
  igual(bgp, 'rgb(201, 68, 47)', 'amb la ratlla vermella de l’esquerra');
  igual(await pan.locator('.avis-item').count(), 2, '2 avisos');
  cal(/Demà la sortida/.test(await pan.locator('.avis-item').first().textContent()), 'amb el text de l’avís');
  igual(await pan.locator('.hpanel-count').textContent(), '2', 'i el comptador a 2');

  console.log('\n5b. Els botons, a dins de la targeta');
  const it0 = pan.locator('.avis-item').first();
  igual(await it0.locator('.avis-acts .btn').count(), 2, 'dos botons per avís');
  cal(/Marca.l com a llegit/.test(await it0.locator('.avis-llegit').textContent()), 'un de «marca’l com a llegit»');
  cal(/Contesta/.test(await it0.locator('.avis-contesta').textContent()), 'i un de «contesta»');
  igual(await it0.locator('.avis-llegit').evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)',
    'el de llegit, vermell ple amb lletra blanca (4,83 de contrast)');
  await page.locator('#home').screenshot({ path: path.join(QA, 'portada-amb-avisos.png') });

  console.log('\n6. Contestar sense sortir de la portada');
  await it0.locator('.avis-contesta').click();
  await page.waitForTimeout(400);
  igual(await pan.locator('.avis-comp').count(), 1, 's’obre el compositor a dins de la targeta');
  cal(await pan.locator('.avis-comp textarea').evaluate(el => el === document.activeElement),
    'amb el focus ja posat');
  await pan.locator('.avis-comp textarea').fill('Doncs jo marxo a les 8.45');
  /* una sincronització mentre s'escriu no s'ho ha d'emportar */
  await page.evaluate(() => refreshHome());
  await page.waitForTimeout(300);
  igual(await pan.locator('.avis-comp textarea').inputValue(), 'Doncs jo marxo a les 8.45',
    'un repintat amb el focus a dins NO esborra el que s’escriu');
  await pan.locator('.avis-comp .btn-primary').click();
  await page.waitForTimeout(800);
  cal(await page.evaluate(c => {
    const s = JSON.parse(localStorage.getItem(c));
    return ((s.comments || {}).av1 || []).some(t => t.text === 'Doncs jo marxo a les 8.45' && t.author === 'pol');
  }, CLAU), 'el comentari ha quedat desat');
  igual(await page.locator('.avis-panel .avis-comp').count(), 0, 'i el compositor es tanca');
  cal(await page.evaluate(c => {
    const s = JSON.parse(localStorage.getItem(c));
    return (s.entries.find(e => e.id === 'av1').readBy || []).includes('pol');
  }, CLAU), 'contestar-lo també l’ha marcat com a llegit');
  igual((await page.locator('#avisBtn .avis-badge').textContent()).trim(), '1', 'el botó de dalt baixa a 1');

  console.log('\n7. Marcar l’altre com a llegit');
  const it1 = page.locator('.avis-panel .avis-item').filter({ hasText:'fotocòpies' });
  await it1.locator('.avis-llegit').click();
  await page.waitForTimeout(700);
  igual(await page.locator('#avisBtn .avis-badge').count(), 0, 'ja no queda cap avís per llegir');

  console.log('\n7b. La targeta NO és permanent');
  await page.evaluate(c => {
    const s = JSON.parse(localStorage.getItem(c));
    s.entries.filter(e => e.section === 'avisos').forEach(e => { e.readBy = ['pol','cristina','mireia']; });
    localStorage.setItem(c, JSON.stringify(s));
    // la cua encara porta els canvis sense enviar (aquí no hi ha xarxa) i reaplicaPendents
    // els tornaria a posar amb el readBy original: la buidem com si ja s'hagués enviat
    localStorage.setItem('coord_pending', '[]');
  }, CLAU);
  await page.reload({ waitUntil:'domcontentloaded' });
  await page.waitForSelector('#bento .tile', { timeout: 20000 });
  await page.waitForTimeout(1000);
  igual(await page.locator('.avis-panel').count(), 0, 'amb tot llegit, la targeta DESAPAREIX');
  igual(await page.locator('#avisBlock').evaluate(el => getComputedStyle(el).display), 'none', 'i el bloc s’amaga');
  cal(await page.locator('#avisBtn').isVisible(), 'però el botó de dalt hi segueix (per veure l’històric)');
  igual(await page.locator('#avisBtn .avis-badge').count(), 0, 'sense comptador');
  cal(await page.locator('#bento .tile').count() >= 10, 'la resta de la portada, intacta');

  console.log('\n7c. El botó de dalt obre la pàgina d’avisos');
  await page.locator('#avisBtn').click();
  await page.waitForTimeout(700);
  cal(/Avisos/.test(await page.locator('.sec-hero').textContent()), 'obre la secció d’avisos');
  cal(await page.locator('#section .entry-card, #section .entry-row').count() >= 2,
    'amb tots els avisos que s’han escrit');
  await page.locator('#homeBtn').click();
  await page.waitForTimeout(600);


  console.log('\n8. Llibres per tornar (avís de la portada)');
  const pll = page.locator('.hpanel').filter({ hasText:'Llibres per tornar' });
  igual(await pll.count(), 1, 'el panell hi és');
  const txtLl = await pll.textContent();
  cal(/Dídac Roca/.test(txtLl), 'amb en Dídac, que no l’ha tornat');
  cal(/Anna P\./.test(txtLl), 'i l’Anna, amb el nom CORREGIT');
  cal(!/Emma Vila/.test(txtLl), 'i NO l’Emma, que sí que l’ha tornat');
  cal(!/Bru Soler/.test(txtLl), 'ni en Bru, que és de 2nA (cadascú reclama els seus)');
  cal(/6 dies tard/.test(txtLl), 'diu els dies de retard');
  igual(await pll.locator('.hpanel-count').textContent(), '2', 'el comptador diu 2');
  /* marcar-ne un de tornat des de la portada */
  await pll.locator('.hrow').first().locator('.hbox').click();
  await page.waitForTimeout(700);
  igual(await page.locator('.hpanel').filter({ hasText:'Llibres per tornar' })
    .locator('.hpanel-count').textContent(), '1', 'el comptador baixa a 1 sense sortir de la portada');

  console.log('\n9. L’eina de llibres');
  await page.locator('#bento .tile').filter({ hasText:'Eines' }).click();
  await page.waitForTimeout(500);
  await page.locator('.subtheme-card').filter({ hasText:'Registre llibres a casa' }).click();
  await page.waitForTimeout(500);
  igual(await page.locator('.llib-ciclesel option').count(), 1, 'un cicle al selector');
  cal(/falten 2/.test(await page.locator('.llib-ciclesel').textContent()), 'i diu que en falten 2');
  igual(await page.locator('.att-tab').count(), 3, 'les 3 pestanyes de classe');
  cal(/^2nC \(2\/3\)/.test(await page.locator('.att-tab.on').textContent()), 'per defecte la del tutor (2nC), 2 de 3 tornats');
  igual(await page.locator('.aut-fila').count(), 3, 'els 3 alumnes de 2nC');
  igual(await page.locator('.llib-pick').count(), 3, 'cada un amb el seu botó de llibre');
  cal(/Tumbili/.test(await page.locator('.llib-pick').first().textContent()), 'en Dídac té el Tumbili');
  igual(await page.locator('.aut-resum span').allTextContents(), ['4/6', '2/4'], 'repartits 4/6, tornats 2/4');
  /* canviar-li el llibre amb el modal de tria */
  await page.locator('.llib-pick').first().click();
  await page.waitForTimeout(400);
  igual(await page.locator('.llib-tria-op').count(), 11, 'el modal ensenya els 11 títols');
  igual(await page.locator('.llib-tria-op.on').count(), 1, 'el que té ara surt marcat');
  await page.locator('.llib-tria-op').nth(5).click();
  await page.waitForTimeout(800);
  cal(/En Ton i la Neus/.test(await page.locator('.llib-pick').first().textContent()), 'li canvia el llibre');
  /* marcar tornada la que encara no l'ha tornat */
  const filaA = page.locator('.aut-fila').filter({ hasText:'Anna P.' });
  igual(await filaA.count(), 1, 'l’Anna hi és, amb el nom corregit');
  await filaA.locator('.llib-check').click();
  await page.waitForTimeout(600);
  igual(await page.locator('.aut-resum span').allTextContents(), ['4/6', '3/4'], 'el comptador de tornats puja');
  cal(/^2nC \(3\/3\)/.test(await page.locator('.att-tab.on').textContent()), 'i la pestanya de classe també');
  await page.locator('#section').screenshot({ path: path.join(QA, 'llibres-cicle.png') });

  console.log('\n10. Gestió de grups');
  await page.locator('#homeBtn').click();
  await page.waitForTimeout(500);
  await page.locator('.tile-pill').filter({ hasText:'Gestió de grups' }).click();
  await page.waitForTimeout(600);
  cal(/Gestió de grups/.test(await page.locator('.sec-hero').textContent()), 'obre la secció');
  igual(await page.locator('.aut-fila:not(.aut-cap)').count(), 3, 'els 3 alumnes de 2nC');
  const noms = await page.locator('.gg-nom').allTextContents();
  cal(noms.includes('Anna P.'), 'surt el nom CORREGIT «Anna P.»: ' + noms.join(' / '));
  const filaD = page.locator('.aut-fila:not(.aut-cap)').filter({ hasText:'Dídac' });
  igual(await filaD.locator('.aut-check.on').count(), 1, 'en Dídac té la marca de PI');
  const subs = await page.locator('.gg-fila-sub').allTextContents();
  cal(subs.some(t => /No la posis amb en Dídac/.test(t)), 'la nota de l’Emma es veu');
  igual(await page.locator('.gg-fila-sub:visible').count(), 1, 'i NOMÉS la de qui en té (bug real: abans es veien totes)');
  await filaD.locator('.aut-check').nth(1).click();
  await page.waitForTimeout(600);
  igual(await filaD.locator('.aut-check.on').count(), 2, 'marcar «Conducta» funciona');
  cal(await page.evaluate(c => {
    const s = JSON.parse(localStorage.getItem(c));
    return !!(s.grups.marques['2nC|Dídac Roca'] || {}).conducta;
  }, CLAU), 'i queda desat');

  console.log('\n11. Un repartiment: moure un alumne');
  await page.locator('.prog-segbtn').filter({ hasText:'Repartiments' }).click();
  await page.waitForTimeout(500);
  igual(await page.locator('.gg-conj-card').count(), 1, 'hi ha el repartiment desat');
  await page.locator('.gg-conj-card').click();
  await page.waitForTimeout(600);
  igual(await page.locator('.gg-grup').count(), 2, '2 grups');
  cal(/Els dracs/.test(await page.locator('.gg-grup-cap input').first().inputValue()), 'el grup es diu «Els dracs»');
  igual(await page.locator('.gg-pool .gg-membre').count(), 2, '2 alumnes sense grup');
  await page.locator('.gg-pool .gg-membre').filter({ hasText:'Emma' }).locator('select').selectOption({ label:'Grup 2' });
  await page.waitForTimeout(800);
  cal(await page.evaluate(c => {
    const s = JSON.parse(localStorage.getItem(c));
    return ((s.grups.conjunts[0].grups.find(x => x.id === 'g2') || {}).membres || []).includes('2nC|Emma Vila');
  }, CLAU), 'l’Emma ha passat al Grup 2 i s’ha desat');

  console.log('\n12. Res no ha petat');
  await page.locator('#homeBtn').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(QA, 'portada.png') });
  igual(errors, [], 'cap error de JavaScript a la consola');

  await browser.close();
  servidor.close();
  console.log('\nCaptures a ' + path.relative(process.cwd(), QA) + path.sep);
  console.log(mal ? '\n❌ ' + mal + ' FALLADES (' + (ok+mal) + ' comprovacions)'
                  : '\n✅ tot correcte (' + ok + ' comprovacions)');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('La prova ha petat: ' + e.message); try{ servidor.close(); }catch(_){} process.exit(1); });
