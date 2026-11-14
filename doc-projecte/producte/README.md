# doc-projecte/producte/ — Roundcube

> Ací viuen els artefactes del pipeline de producte (no en converses de xat): problem statement,
> PRD amb els seus RF-XX, pla confirmat, specs de pantalla, plans de proves i informes de revisió. Guardar-los ací
> és el que fa la cadena auditable mesos després i permet que cada fase cite l'anterior en lloc de
> reconstruir-la.

Els documents que el descobriment demana (la normativa del procés, els exemples de com es fa hui)
no van a la carpeta d'una faena: van a `doc-projecte/fonts/`, que és del projecte (vegeu el seu
README).

**Format**: dos nivells. Una aplicació no s'especifica sencera abans de començar: es construïx per
faenes, i cada faena té la seua carpeta, amb data i nom curt. El que abasta tot el projecte va a
`projecte/`:

```
doc-projecte/producte/
├── projecte/                     el que abasta totes les faenes
│   ├── problema.md               (ua-descobriment-producte)
│   ├── prd.md                    (ua-requisits-producte: RF-01…RF-NN de totes les faenes)
│   ├── proposta-<tema>.md        (les que no canvien cap faena concreta)
│   └── revisio/                  (la revisió del problema i del PRD)
├── 2026-07-sollicitud/           una faena
│   ├── pla.md                    (ua-planificador: cita els RF del PRD del projecte)
│   ├── proposta-<tema>.md        (les que obrin o canvien entregues d'esta faena)
│   ├── specs/                    (ua-producte-flux: flux.md · ua-especificacio-pantalla: <pantalla>.md)
│   ├── proves/                   (ua-proves-persona: <nom>.md · fulls de proves <nom>.sessio-<AAAA-MM-DD>.*)
│   ├── revisio/                  (gen-html-plan: <artefacte>.html, .packed.html i .resposta-<AAAA-MM-DD>.md)
│   └── informes/                 (ua-review / ua-ux-review)
└── 2026-10-aprovacio/            la faena següent
```

**El PRD és un per projecte, i és viu.** Els `RF-XX` d'una PR no són mai ambigus perquè només n'hi
ha una numeració. Els RF d'una faena que encara no s'ha triat ocupen una línia (què i prioritat);
els criteris d'acceptació s'escriuen quan la faena es tria, abans del seu `pla.md`. El que es
descobrix en una faena es porta al PRD amb una entrada a `## Canvis`, i en tancar-la, la PR revisa
els documents que el Context Delta del pla diu. Una faena porta `prd.md` propi només si és una àrea
prou separada per a tindre'l (una altra convocatòria, un altre servei), i llavors la seua
numeració continua la del projecte. Un projecte d'una sola faena pot deixar-ho tot a la carpeta
de la faena, com abans: els scripts del kit entenen les dos formes.

**Què és vigent i què és historial.** Vigents: `PROJECTE.md`, `DECISIONS.md`, `projecte/prd.md` i
el codi. La carpeta d'una faena tancada (pla, specs, proves, informes) és historial: explica per
què es va fer així, però no diu com és l'aplicació hui.

Cada informe de revisió és un fitxer: `informes/<AAAA-MM-DD>-review-<pantalla>.md` (`ua-review`)
o `informes/<AAAA-MM-DD>-ux-<pantalla>.md` (`ua-ux-review`). Un informe nou no sobreescriu
l'anterior: la segona auditoria d'un redisseny es compara amb la primera.

Quan un esborrany es confirma en una pàgina de revisió (`ua-planificador`, `ua-producte-flux` o
`ua-especificacio-pantalla` amb 3 o més decisions, un altre revisor o pantalles per vore), la
pàgina i la resposta es guarden a `revisio/` i es versionen. L'`.md` continua sent la font: la
fase següent el llig a ell, mai la pàgina. Abans del commit, mira la llista de fitxers que
`pack.mjs` diu que ha incrustat dins del `.packed.html`.

Cada pantalla, o cada RF sense pantalla que una persona pot comprovar, té el seu pla de proves a
`proves/<nom>.md` (`<nom>` és el de l'spec o l'identificador del RF). En acabar-la, i en cada
volta després d'una correcció, `ua-proves-persona` genera el full de proves: la pàgina amb les
proves que ha de fer una persona, una cada vegada. Es guarda al costat del pla com a
`<nom>.sessio-<AAAA-MM-DD>.html` i `.packed.html`; la resposta enganxada,
`<nom>.sessio-<AAAA-MM-DD>.md`, és la font, i les captures que baixa qui prova van a la carpeta
`<nom>.sessio-<AAAA-MM-DD>/`. Es demana també amb `/ua-skills:full-proves <nom>`.

No cal la cadena sencera per a cada faena: només els artefactes de les fases que s'han aplicat
(`ua-planificador` decidix quines calen).
