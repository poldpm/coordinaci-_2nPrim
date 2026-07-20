# Integració a l'app de Coordinació de 2n — Guia per a Claude Code

Aquest paquet conté la **programació anual de 2n (curs 2026-2027)** de Català, Matemàtiques i Medi, llesta per integrar a l'apartat **Programació** de l'app de coordinació.

## Fitxers del paquet

| Fitxer | Què és | Ús |
|--------|--------|-----|
| `programacio_2n_2026-2027.json` | **Totes les dades estructurades** (font de veritat per importar) | El que ha de llegir/importar l'app |
| `Programacio_2n_Vedruna_2026-2027.md` | Català + Matemàtiques, format humà (checklists) | Referència / revisió |
| `Programacio_MEDI_2n_2026-2027.md` | Medi per projectes i sessions, format humà | Referència / revisió |

> **Instrucció per a Claude Code:** fes servir el **JSON** com a font de dades. Els `.md` són només per llegir-ho en humà; no els parsegis.

---

## Objectiu de la integració

A l'apartat **Programació** de l'app, per a cada assignatura:
- **Català i Matemàtiques** van **per setmanes** (39 setmanes lectives). Cada setmana és una **llista de tasques marcables** (checkboxes).
- **Medi** va **per projectes i sessions** (2 sessions/setmana), no per setmanes. Cada projecte té una **finestra de dates** i una **llista d'activitats marcables** amb el nombre de sessions.

Cada tasca ja porta un **`id` estable** i un camp **`completada: false`**, pensats perquè l'app hi guardi l'estat del checkbox.

---

## Esquema del JSON

```
{
  "curs", "escola", "nivell", "linies",
  "calendari": {
    "inici", "final",
    "vacances": [ { "nom", "inici", "final" } ],
    "festius":  [ { "data", "nom" } ],
    "setmanes_lectives": 39,
    "setmanes": [ { "num", "inici", "final", "dies_lectius", "etiqueta", "reduida", "festius":[...] } ]
  },
  "assignatures": {
    "catala": {
      "nom", "format": "setmanal", "materials":[...], "avis",
      "setmanes": [ { "setmana", "etiqueta", "tasques": [ TASCA ] } ],
      "dictats":  [ { "num", "document", "norma", "es_fa":["S1","S3"] } ]
    },
    "matematiques": {
      "nom", "format": "setmanal", "materials":[...], "avis",
      "setmanes": [ { "setmana", "etiqueta", "tasques": [ TASCA ] } ]
    },
    "medi": {
      "nom", "avis", "format": "projectes_sessions", "sessions_per_setmana": 2,
      "projectes": [ {
        "nom", "trimestre",
        "finestra": { "inici", "final", "referencia_document" },
        "plantejament": [ "..." ],
        "sessions": [ { "id", "activitat", "sessions": <int|null>, "material": <str|null>, "nota"? } ]
      } ]
    }
  }
}
```

### TASCA (Català / Matemàtiques)
```
{
  "id":        "cat-S1-dictat",     // identificador estable i únic
  "tipus":     "comunica|explicar|lectura|dictat|llibre_mates",
  "text":      "text a mostrar al checkbox",
  "completada": false,              // estat del checkbox
  // camps extra segons el tipus:
  "llibre", "pagina"                // (lectura)
  "document_dictat"                 // (dictat) → nom del fitxer a la carpeta Drive 'dictats'
  "unitat", "pagines", "tema"       // (llibre_mates)
}
```

### Convencions de `tipus`
- **catala** → `comunica` (unitat + concepte del llibre), `explicar` (gramàtica/ortografia a explicar), `lectura` (conte d'*El temps era temps 2* amb pàgina), `dictat` (referència al full de dictat de Drive).
- **matematiques** → `llibre_mates` (pàgines + unitat + tema de *Més Món Matemàtic 2*), `explicar`.

---

## Notes importants (perquè l'app ho mostri bé)

1. **Setmanes reduïdes:** `reduida: true` a S16 i S17 (Nadal). Poden marcar-se visualment diferent; no porten dictat.
2. **Setmanes sense dictat:** a Català, algunes setmanes no tenen tasca de `dictat` (és a posta). El dictat es fa **la setmana en què s'explica la seva norma**.
3. **Dictats:** el camp `document_dictat` coincideix amb el **nom del fitxer** a la carpeta de Drive *dictats* (p. ex. `Dictat 7 · La b i la v`). Si l'app pot enllaçar a Drive, useu aquest nom.
4. **Pendent Català:** les tasques `comunica` **no porten pàgina** (el llibre digital és per activitats). Quan es tinguin els rangs de pàgina del llibre en paper, s'afegiran al `text` i, si es vol, a un camp `pagines`.
5. **Medi – finestres:** cada projecte comença/acaba segons `finestra` (mapatge dels talls del document: *El cos humà* → desembre; *El pas del temps* → Setmana Santa; *La ciutat* → final de curs).
6. **Medi – 'La ciutat':** diverses activitats tenen `sessions: null` (**a concretar**); l'app pot mostrar-les com a pendents de definir.

---

## Suggeriment de prompt per a Claude Code

> «Tens `programacio_2n_2026-2027.json` amb la programació anual de 2n. Integra-la a l'apartat **Programació** de l'app de coordinació: per a Català i Matemàtiques, crea 39 setmanes amb les seves tasques marcables (usa `id` com a clau i `completada` per l'estat); per a Medi, crea els 3 projectes amb la seva finestra de dates i les activitats/sessions marcables. Respecta els `tipus` de tasca i els camps extra. No inventis dades; el que falti (pàgines de Comunica, sessions de 'La ciutat') deixa-ho com a pendent.»
