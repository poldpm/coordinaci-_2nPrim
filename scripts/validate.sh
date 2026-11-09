#!/usr/bin/env bash
# Valida la sintaxi del frontend (JS dins index.html) i del backend (.gs).
# Només depèn de Node (sense python3). Node ha d'estar al PATH.
set -e
cd "$(dirname "$0")/.."
TMP="${TEMP:-/tmp}"

# Extreu els <script> sense src d'index.html i comprova la sintaxi.
node -e '
const fs=require("fs");
const html=fs.readFileSync("index.html","utf8");
const re=/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m, parts=[];
while((m=re.exec(html))) parts.push(m[1]);
fs.writeFileSync(process.argv[1], parts.join("\n;\n"));
' "$TMP/app.js"
node --check "$TMP/app.js" && echo "✅ Frontend OK"

# El .gs viu fora de git (§10): en una còpia nova del repositori no hi és, i això
# no és cap error. Només es comprova si el tens.
if [ -f Codi_AppsScript.gs ]; then
  cp Codi_AppsScript.gs "$TMP/chk.js" && node --check "$TMP/chk.js" && echo "✅ Backend OK"
else
  echo "⚠️  Backend: Codi_AppsScript.gs no és en aquesta còpia (és fora de git, per disseny)"
fi
