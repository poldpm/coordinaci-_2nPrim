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

## Si també hi tens un `normalizeState` equivalent al servidor

Afegeix-hi la clau nova, com les altres:

```js
  if(!state.llibres) state.llibres = {titols:[], marques:{}};
  state.llibres.titols = state.llibres.titols || [];
  state.llibres.marques = state.llibres.marques || {};
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
