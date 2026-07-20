# Coordinació 2n

App interna de coordinació dels 3 tutors de 2n de primària (Escola Vedruna
Escorial, Vic). PWA d'un sol fitxer (`index.html`) servida per GitHub Pages, amb
backend a Google Apps Script + Google Sheets.

➡️ **Llegeix `CLAUDE.md`** per tot el context, l'arquitectura, les convencions i
el flux de desplegament.

## Estructura
- `index.html` — tot el frontend (l'app).
- `Codi_AppsScript.gs` — backend (va a Apps Script, **NO a GitHub**).
- `manifest.webmanifest`, `.nojekyll`, `img/` — PWA i icones.
- `scripts/validate.sh` — comprova la sintaxi de frontend i backend.

## Desplegar
- **Web:** puja a GitHub `index.html`, `manifest.webmanifest`, `.nojekyll`, `img/`.
- **Backend:** enganxa `Codi_AppsScript.gs` a Apps Script (nou desplegament del
  Web App si canvies accions de `doPost`).
