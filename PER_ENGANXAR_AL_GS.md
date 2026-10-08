# El tros que falta a `Codi_AppsScript.gs`

## Per què no et dono el fitxer sencer

`Codi_AppsScript.gs` **no és en aquest repositori**: el `.gitignore` l'exclou perquè hi tens
el token de Telegram (§10 del `CLAUDE.md`). **No l'he vist mai**, així que no et puc donar el
fitxer complet sense inventar-me la resta. El que hi ha aquí és **exactament el que falta**:
els 8 casos nous de les tres millores (llibres, gestió de grups) i les línies de
`normalizeState`.

Per això tampoc he pogut executar `node scripts/gen_fb_apply.js`, que és el que normalment
copia `_apply` del `.gs` al bloc `fbApply` d'`index.html`. He editat aquell bloc **a mà** i he
comprovat amb un script que el que aplica la pantalla i el que aplicaria el servidor donen un
estat **idèntic** (i que reenviar el lot dues vegades no canvia res). Però perquè els dos
costats no quedin desincronitzats —i perquè la propera vegada que generis `fbApply` no
s'esborrin aquests casos— has d'enganxar això al `.gs`.

## Fa falta per fer servir les millores?

**No.** L'app està migrada a Firebase (§3) i les escriptures les aplica `fbApply` des
d'`index.html`, que ja porta els 8 casos. **Tot funciona ara mateix amb la web ja pujada.**
El `.gs` cal per a dues coses:

1. Que `gen_fb_apply.js` no esborri aquests casos la propera vegada que el facis servir.
2. Que l'app segueixi funcionant si algun dia es torna a `TRANSPORT='appsscript'`.

Els **avisos ràpids** (l'última millora) no hi surten: fan servir `addEntry`, `entryRead` i
`commentSeen`, que ja hi són. No necessiten res de nou.

---

## 1. Els 8 casos — dins de `_apply`

Obre `Codi_AppsScript.gs`, busca `function _apply(state, action, payload)` i, **dins del seu
`switch`**, enganxa aquest bloc sencer just **abans** del `case 'cvLliurat':`.

```js
    /* ---- Registre de llibres a casa ----
       `titols` és la llista de llibres (es desa sencera: només l'edita qui la personalitza).
       `marques` és granular per alumne i llibre → els tres tutors poden marcar alhora.
       Cada llibre d'un alumne guarda {e: data que se l'emporta, r: data que el torna}. */
    case 'llibTitols': {
      state.llibres = state.llibres || {titols:[], marques:{}};
      state.llibres.titols = payload.titols || [];
      state.llibres.marques = state.llibres.marques || {};
      break;
    }
    case 'llibSet': {
      state.llibres = state.llibres || {titols:[], marques:{}};
      state.llibres.titols = state.llibres.titols || [];
      state.llibres.marques = state.llibres.marques || {};
      var lm = state.llibres.marques[payload.alumne] = state.llibres.marques[payload.alumne] || {};
      var lb = lm[payload.llibre] = lm[payload.llibre] || {};
      if(payload.data) lb[payload.camp] = payload.data;
      else {
        delete lb[payload.camp];
        if(!Object.keys(lb).length) delete lm[payload.llibre];
        if(!Object.keys(lm).length) delete state.llibres.marques[payload.alumne];
      }
      break;
    }
    /* ---- Gestió de grups ----
       `etiquetes` (PI, Conducta, les que calguin) i cada `conjunt` de grups es desen
       sencers; `marques`, `notes` i `noms` són granulars per alumne, així els tres
       tutors poden marcar alhora. `noms` és una capa de CORRECCIONS a sobre de la
       llista del full: no canvia cap clau, només com es mostra el nom. */
    case 'grupEtiquetes': {
      state.grups = state.grups || {etiquetes:[], marques:{}, notes:{}, noms:{}, conjunts:[]};
      state.grups.etiquetes = payload.etiquetes || [];
      break;
    }
    case 'grupMarca': {
      state.grups = state.grups || {etiquetes:[], marques:{}, notes:{}, noms:{}, conjunts:[]};
      state.grups.marques = state.grups.marques || {};
      var gm = state.grups.marques[payload.alumne] = state.grups.marques[payload.alumne] || {};
      if(payload.on) gm[payload.etiqueta] = true;
      else {
        delete gm[payload.etiqueta];
        if(!Object.keys(gm).length) delete state.grups.marques[payload.alumne];
      }
      break;
    }
    case 'grupNota': {
      state.grups = state.grups || {etiquetes:[], marques:{}, notes:{}, noms:{}, conjunts:[]};
      state.grups.notes = state.grups.notes || {};
      if(payload.text) state.grups.notes[payload.alumne] = payload.text;
      else delete state.grups.notes[payload.alumne];
      break;
    }
    case 'grupNom': {
      state.grups = state.grups || {etiquetes:[], marques:{}, notes:{}, noms:{}, conjunts:[]};
      state.grups.noms = state.grups.noms || {};
      if(payload.nom) state.grups.noms[payload.alumne] = payload.nom;
      else delete state.grups.noms[payload.alumne];
      break;
    }
    case 'grupConjuntUpsert': {   // idempotent per id
      state.grups = state.grups || {etiquetes:[], marques:{}, notes:{}, noms:{}, conjunts:[]};
      state.grups.conjunts = state.grups.conjunts || [];
      var gc = payload.conjunt, gl = state.grups.conjunts, gi = -1;
      for(var g0=0;g0<gl.length;g0++){ if(gl[g0].id===gc.id){ gi=g0; break; } }
      if(gi>=0) gl[gi]=gc; else gl.push(gc);
      break;
    }
    case 'grupConjuntDelete': {
      state.grups = state.grups || {etiquetes:[], marques:{}, notes:{}, noms:{}, conjunts:[]};
      state.grups.conjunts = (state.grups.conjunts||[]).filter(function(x){ return x.id!==payload.id; });
      break;
    }
```

## 2. Les claus noves — al `normalizeState` del servidor

Si al `.gs` hi tens una funció que garanteix que les claus de l'estat existeixen (l'equivalent
de `normalizeState`), afegeix-hi també això:

```js
  if(!state.llibres) state.llibres = {titols:[], marques:{}};
  state.llibres.titols = state.llibres.titols || [];
  state.llibres.marques = state.llibres.marques || {};
  if(!state.grups) state.grups = {etiquetes:[], marques:{}, notes:{}, noms:{}, conjunts:[]};
  state.grups.etiquetes = state.grups.etiquetes || [];
  state.grups.marques = state.grups.marques || {};
  state.grups.notes = state.grups.notes || {};
  state.grups.noms = state.grups.noms || {};
  state.grups.conjunts = state.grups.conjunts || [];
```

## 3. Desplega'l

Són **accions noves de `doPost`**, així que cal **nou desplegament del Web App** (§11):
Implementar → Gestionar implementacions → versió nova.

## 4. Comprova que ha quedat bé

```bash
cp Codi_AppsScript.gs /tmp/chk.js && node --check /tmp/chk.js   # sintaxi
node scripts/gen_fb_apply.js                                    # ha de deixar index.html IGUAL
git diff --stat index.html                                      # si surt buit, els dos costats coincideixen
```

Si `gen_fb_apply.js` et canvia `index.html`, és que el tros del `.gs` no és idèntic al que hi
ha al bloc `fbApply`: mira el diff abans de donar-ho per bo.

---

## ⚠️ Una cosa que NO has de fer

**No toquis `alumnesAFirebase()`.** La correcció de noms de la Gestió de grups **no** reescriu
la llista d'alumnes: és una capa a sobre (`STATE.grups.noms`), justament perquè el full
segueixi manant i la pujada de cada hora no esborri res. Si algú ho «millorés» fent que l'app
pugés els noms al full, la pujada automàtica i les claus dels registres (llibres,
autoritzacions, reptes, carpeta viatgera) entrarien en conflicte.

Si vols fer les correccions definitives, el botó **«Copia la llista de 2nX»** de l'app et dona
els noms ja corregits per enganxar-los a la columna del full.
