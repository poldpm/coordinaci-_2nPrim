#!/usr/bin/env bash
# Passa-ho TOT: sintaxi, sincronia amb el backend, les proves de taula i,
# si hi ha un Chromium a mà, la prova en navegador de debò.
#
#   bash scripts/prova.sh
#
# Les proves de taula volen jsdom i la de navegador vol playwright-core:
#   npm i jsdom playwright-core && npx playwright install chromium
# Si ja hi ha un Chromium al sistema:  CHROMIUM=/ruta/al/chrome bash scripts/prova.sh
set -u
cd "$(dirname "$0")/.."
MAL=0
titol(){ printf '\n\033[1m── %s ──\033[0m\n' "$1"; }
passa(){ if "$@"; then :; else MAL=$((MAL+1)); fi; }

titol "Sintaxi"
passa bash scripts/validate.sh

titol "El backend i el web diuen el mateix"
if [ -f Codi_AppsScript.gs ]; then
  node -e '
    const fs=require("fs");
    const tall=(t,a,b)=>{const i=t.indexOf(a); return t.slice(i, t.indexOf(b,i));};
    const cas=t=>new Set([...t.matchAll(/case .([A-Za-z]+).:/g)].map(m=>m[1]));
    const gs=fs.readFileSync("Codi_AppsScript.gs","utf8"), html=fs.readFileSync("index.html","utf8");
    const a=cas(tall(gs,"function _apply(","function _loadStudents("));
    const b=cas(tall(html,"function fbApply(","/* === PORT DEL BACKEND: fi === */"));
    const falten=[...b].filter(x=>!a.has(x)), sobren=[...a].filter(x=>!b.has(x));
    console.log("falten al .gs :", falten.length?falten.sort().join(", "):"(cap)");
    console.log("sobren al .gs :", sobren.length?sobren.sort().join(", "):"(cap)");
    console.log("casos         :", a.size, "al .gs ·", b.size, "al web");
    process.exit(falten.length||sobren.length ? 1 : 0);
  ' || MAL=$((MAL+1))
else
  echo "⚠️  El .gs no és en aquesta còpia (és fora de git, per disseny)."
  echo "    Si has tocat accions del doPost, passa aquesta comprovació on el tinguis."
fi

titol "Proves de taula"
for p in scripts/prova_llibres.js scripts/prova_grups.js scripts/prova_avisos.js; do
  node "$p" | tail -1 || MAL=$((MAL+1))
done

titol "Prova en navegador"
if node -e 'require("playwright-core")' 2>/dev/null; then
  node scripts/prova_navegador.js | tail -2 || MAL=$((MAL+1))
else
  echo "⚠️  Sense playwright-core: s'omet. (npm i playwright-core && npx playwright install chromium)"
fi

printf '\n'
if [ "$MAL" -eq 0 ]; then echo "✅ Tot correcte"; else echo "❌ $MAL blocs amb errors"; fi
exit "$MAL"
