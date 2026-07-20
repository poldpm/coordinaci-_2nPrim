const fs=require("fs");
const html=fs.readFileSync("index.html","utf8");
const a=html.indexOf("const COURSE_START=");
const m="const PROG_WEEKS_ARR = progBuildWeeks();";
eval(html.slice(a, html.indexOf(m)+m.length)+"; globalThis.W=PROG_WEEKS_ARR;");
const J=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const teaching=W.filter(w=>!w.isVac);
const mondayOf=n=>teaching[n-1].monday;

function mapSetmanal(a){
  const out={};
  a.setmanes.forEach(s=>{
    out[mondayOf(s.setmana)] = s.tasques.map(t=>{
      const it={id:t.id, t:t.text, k:t.tipus};
      if(t.pagina!=null) it.pag=t.pagina;
      if(t.llibre) it.llib=t.llibre;
      if(t.document_dictat) it.doc=t.document_dictat;
      if(t.unitat) it.un=t.unitat;
      if(t.pagines) it.pgs=t.pagines;
      if(t.tema) it.tema=t.tema;
      if(t.tipus==="comunica") it.p=1;
      return it;
    });
  });
  return out;
}
const seed={ catala:mapSetmanal(J.assignatures.catala), mates:mapSetmanal(J.assignatures.matematiques) };

// Setmanes reduïdes: TAL COM ho diu el JSON (no calculat) -> dilluns: dies_lectius
const red={};
J.calendari.setmanes.filter(s=>s.reduida).forEach(s=>{ red[mondayOf(s.num)]=s.dies_lectius; });

const KEYS={"El cos humà":"proj-cos","El pas del temps":"proj-temps","La ciutat":"proj-ciutat"};
const medi=J.assignatures.medi.projectes.map(p=>({
  key:KEYS[p.nom], nom:p.nom, tri:p.trimestre,
  ini:p.finestra.inici, fi:p.finestra.final, ref:p.finestra.referencia_document,
  pla:p.plantejament||[],
  items:p.sessions.map(s=>{
    const it={id:s.id, t:s.activitat};
    if(s.sessions!=null) it.s=s.sessions; else it.p=1;
    if(s.material) it.mat=s.material;
    if(s.nota) it.nota=s.nota;
    return it;
  })
}));

const out="/* Programació anual 2026-27 (generada des de programacio_2n_2026-2027.json) */\n"
        + "const PROG_SEED="+JSON.stringify(seed)+";\n"
        + "const PROG_MEDI_PROJ="+JSON.stringify(medi)+";\n"
        + "const PROG_REDUIDES="+JSON.stringify(red)+";\n"
        + "const PROG_MEDI_SESS_SETM="+J.assignatures.medi.sessions_per_setmana+";\n";
fs.writeFileSync(process.argv[3], out, "utf8");
console.log("Mida:",(out.length/1024).toFixed(1),"KB");
console.log("reduides:",JSON.stringify(red));
console.log("catala:",Object.keys(seed.catala).length,"setmanes /",Object.values(seed.catala).reduce((n,x)=>n+x.length,0),"tasques");
console.log("mates :",Object.keys(seed.mates).length,"setmanes /",Object.values(seed.mates).reduce((n,x)=>n+x.length,0),"tasques");
console.log("medi  :",medi.map(p=>p.key+" "+p.ini+"→"+p.fi+" ("+p.items.length+")").join(" | "));
