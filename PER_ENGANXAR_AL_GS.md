# Tros per enganxar a `Codi_AppsScript.gs`

`Codi_AppsScript.gs` **no és en aquest repositori** (el `.gitignore` l'exclou, §10: hi ha
el token de Telegram). Per això no he pogut executar `node scripts/gen_fb_apply.js`, que és
el que normalment copia `_apply` del `.gs` al bloc `fbApply` d'`index.html`.

He editat el bloc d'`index.html` **a mà** i he comprovat amb un script que el que aplica
la pantalla i el que aplicaria el servidor donen un estat **idèntic**. Però perquè els dos
costats no quedin desincronitzats (i perquè la propera vegada que generis `fbApply` no
s'esborrin aquests dos casos), **has d'enganxar aquest tros al `.gs`**.

## Què has de fer

1. Obre `Codi_AppsScript.gs` al teu ordinador.
2. Dins de `function _apply(state, action, payload)`, busca el `case 'cvLliurat':`.
3. Enganxa aquests dos casos **just abans** d'aquell `case`.
4. Puja el `.gs` a l'editor d'Apps Script.
5. **Nou desplegament del Web App** (Implementar → Gestionar implementacions → versió nova):
   són **accions noves de `doPost`** (§11).

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
```

## I aquests sis, per a la Gestió de grups

Enganxa'ls també dins de `_apply`, just abans dels dos de `llibTitols`/`llibSet`:

```js
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

⚠️ **No toquis `alumnesAFirebase()`.** La correcció de noms de l'app NO reescriu la llista
d'alumnes: és una capa a sobre (`STATE.grups.noms`), justament perquè el full segueixi
manant i la pujada de cada hora no esborri res. Si algun dia vols fer les correccions
definitives, el botó «Copia la llista de 2nX» de l'app et dona els noms per enganxar al full.

## Si també hi tens un `normalizeState` equivalent al servidor

Afegeix-hi la clau nova, com les altres:

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

## Comprova que ha quedat bé

```bash
cp Codi_AppsScript.gs /tmp/chk.js && node --check /tmp/chk.js
node scripts/gen_fb_apply.js      # ha de deixar index.html IGUAL que ara
git diff --stat index.html        # si surt buit, els dos costats coincideixen
```

Si `gen_fb_apply.js` et canvia `index.html`, és que el tros del `.gs` no és idèntic al
que hi ha ara al bloc; mira el diff abans de donar-ho per bo.

## Fa falta això per fer-ho servir?

**No.** L'app està migrada a Firebase (§3), i amb Firebase les escriptures les aplica
`fbApply` des d'`index.html` — que ja porta els dos casos. L'eina funciona en pujar
la web. El `.gs` cal per a dues coses:

- que `gen_fb_apply.js` no esborri aquests casos la propera vegada;
- que l'app segueixi funcionant si algun dia es torna a `TRANSPORT='appsscript'`.
