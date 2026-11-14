# Versió de ci-plantilla

versio: 1.71.0
data: 2026-11-14

Esta carpeta arriba als projectes consumidors per **còpia estàtica** (README § Com adoptar-ho):
sense un número de versió, una correcció ací no es pot rastrejar fins a les còpies -mateixa
troballa UI-1 de l'auditoria del pipeline que ja es va resoldre per al kit
d'`/exporta-modul` amb `vendor/VERSION.md`, aplicada ara a esta plantilla.

**Regla de bump** (el `docmap.json` d'este repositori l'aplica: qualsevol canvi dins de
`ci-plantilla/` exigix tocar este fitxer al mateix PR):

- **patch**: correcció d'un script sense canviar opcions ni eixida.
- **minor**: check nou, opció nova, o canvi d'eixida compatible.
- **major**: canvi que exigix reconfigurar el job de CI o el `docmap.json` dels consumidors.

**Comprovar el desfasament des d'un projecte consumidor**:
`node kit-si-ua/ci-plantilla/comprova-desfasament.js --cataleg <ruta-al-clon-de-skills-si-ua>`

## Historial

- **1.71.0 — 2026-11-14** — **Minor**: `valida-skill.js` bloqueja una clau del frontmatter amb «: » o « #» sense cometes. Eixe valor no és YAML vàlid, l'eina no llig el frontmatter i mostra el títol en lloc de la `description`, sense cap disparador: `ua-i18n-valencia`, `ua-dotnet-api`, `ua-docs-vitepress` i `handoff` no s'activaven per això. Dos casos nous.
- **1.70.2 — 2026-11-14** — **Patch**: `proves/executa-proves.js` diu «no s'ha pogut executar bash … no trobe bash al PATH» quan el procés del cas no arrenca, en lloc de `codi de sortida null` i la llista de fragments que falten. Passava en llançar `npm test` des de PowerShell sense `Git\bin` al PATH. Cap cas canvia.
- **1.70.1 — 2026-11-13** — **Patch**: el comentari de `skillmap.exemple.json` ja no posa tota la cadena de producte entre els skills que l'agent no pot carregar: `ua-planificador`, `ua-especificacio-pantalla` i `ua-proves-persona` ja s'activen sols. Cap canvi en les regles.
- **1.70.0 — 2026-11-13** — **Minor**: `valida-skill.js` avisa d'un `ua-*`/`gen-*` entre backticks o en un enllaç que no té carpeta al catàleg (skill retirat o mal escrit), al `SKILL.md` i a les `references/` de cada skill i, amb `--all`, als documents publicats (`README.md`, onboarding, `ESTANDARDS.md`, `SEGURETAT.md`, `kit-si-ua/**`, sense els `VERSION.md`). Calla si la línia ja diu que està retirat, i davant dels agents, els plugins i els noms que no són skills. Dos casos nous.
- **1.69.0 — 2026-11-13** — **Minor**: `comprova-desfasament.js` avisa si un hook de `.claude/settings*.json` es crida amb ruta relativa i sense `$CLAUDE_PROJECT_DIR` (`hooks-connectats.js` torna `relatius`). El cwd de Bash persistix entre ordes, i després d'un `cd` el hook no es troba i falla en silenci: a `ua-ds-fusio` (2026-08-11) la guarda de secrets i la de docmap no corrien. Els snippets del kit ja porten el `cd` des de `hooks-plantilla` 4.1.1; ara `proves/cadena-ci.js` falla si un snippet o el `settings.json` del taller el perd. Els quatre projectes adoptats estan bé.
- **1.68.0 — 2026-11-13** — **Minor**: `comprova-desfasament.js` avisa si el `skillmap.json` del projecte suggerix un skill `ua-*` o `gen-*` que el catàleg ja no té, o que l'agent no pot carregar (`disable-model-invocation`). El mapa és del projecte i no es refresca mai: `ua-ds-fusio` va suggerir `ua-dotnet-datatable` tres setmanes després de retirar-lo, i `cdp` encara suggerix `ua-dotnet-review` i `ua-review`. Només avisa, i no compta per a `--strict`. Quatre casos nous a `proves/casos/comprova-desfasament.js`.
- **1.67.2 — 2026-11-13** — **Patch**: `skillmap.exemple.json` ja no suggerix `ua-review` en la regla `frontend-vue`: té `disable-model-invocation` i l'agent no el pot carregar, així que el suggeriment no es podia seguir mai. Ara suggerix les peces (`ua-vue-uacloud`, `ua-ux-review`, `ua-accessibilitat-wcag`) i el missatge diu que es propose `/ua-skills:ua-review` a la persona. `proves/cadena-ci.js` falla si un mapa del catàleg nomena un skill que no existix o que només arranca una persona. Si el teu `skillmap.json` en suggerix algun, fes el mateix canvi.
- **1.67.1 — 2026-11-13** — **Patch**: `proves/cadena-ci.js` comprova que l'instal·lador copia tots els scripts de `ci-plantilla` que nomenen els hooks de `hooks-plantilla` i `kit-projecte/genera-kit.js`, i els que es requerixen entre ells; també falla si un hook nomena un script del catàleg (`valida-skill.js`). La llista de l'instal·lador va a mà i se n'havia oblidat dos vegades (2026-09-10 i la 1.60.1). Cap script canvia.
- **1.67.0 — 2026-11-13** — **Minor**: `proves/executa-proves.js` accepta `pendents` en un cas amb `git: true`: fitxers que es queden a l'arbre sense commitejar. Set casos nous a `proves/casos/guarda-shell.js` per a l'avís de git de `hooks-plantilla` 5.34.0 (quatre que avisen, tres que no).
- **1.66.0 — 2026-11-13** — **Minor**: `registre-disparadors.js` compta `guarda-shell` (`hooks-plantilla` 5.33.0) entre les xarxes: para un cas rar, i zero actuacions no és motiu per a retirar-lo. Casos nous a `proves/casos/guarda-shell.js` (cinc que bloqueja, deu que no).
- **1.65.0 — 2026-11-13** — **Minor**: `registre-disparadors.js completa-sessio <sessio> <transcripcio.jsonl>` afig al registre les invocacions que només són a la transcripció: les ordes que escriu la persona (`/handoff`, `/ua-skills:auditoria`), que no passen per l'eina `Skill` i el hook de PostToolUse no veu. Només afig la diferència (idempotent) i les marca `via: orde`; `exporta-sessio` conserva el camp. Les ordes de l'eina (`/model`, `/clear`) no compten: no porten cos expandit. `completa-projecte [dir]` fa el mateix per a totes les transcripcions del projecte (una màquina amb historial anterior al hook). Tres casos nous a `proves/cadena-hooks.js`. Mesurat en un projecte consumidor: 8 invocacions registrades contra 38 de reals.
- **1.64.0 — 2026-11-11** — **Minor**: `comprova-tracabilitat.js` diu el que no ha pogut llegir, en avís, en lloc de donar-ho per bo. Avisa de les línies del PRD que comencen definint un RF en un format que `llegixPrd` no reconeix (`- **RF-01 · Catàleg:**`, `### RF-01`), d'una spec que diu quins RF cobrix sense «**RF que cobrix**» i d'una taula «Entregues» amb files `E-NN` i cap llegida. Amb cap RF llegit ja no imprimix «✔ El PRD i les specs es corresponen». `producte.js` hi afig `noReconeguts`, `cobrixNoReconegut` i `filesAmbEntrega`. Quatre casos nous, que fallaven amb la 1.63.1. Detectat en un projecte consumidor amb deu RF, que eixia amb «0 RF» i en verd.
- **1.63.1 — 2026-11-10** — **Patch**: `producte.js` reconeix la «_Prova_:» que escriu la plantilla del PRD (el `\b` no val davant d'un `_`). Abans, els RF que la portaven avisaven en fals que «no tenen Prova». Cas nou a `proves/casos/comprova-tracabilitat.js`.
- **1.63.0 — 2026-11-09** — **Minor**: el PRD pot ser del projecte (`doc-projecte/producte/projecte/prd.md`) i el compartixen totes les carpetes de faena que no en porten (`producte.js`: `ambitsDe`, `prdDe`, `DIR_PROJECTE`; `faenesDe` desapareix). `comprova-tracabilitat.js` comprova cada PRD una vegada amb les specs i els `pla.md` de totes les seues faenes: un E-NN és únic dins del seu pla. `compta-factors.js` compta en cada faena només els RF que cita el seu `pla.md`. `exporta-entregues.js` passa al contracte `versio: 2`: cada PRD va una vegada a `prds`, i cada faena diu quin fa servir (`prd`). Encara no hi ha cap consumidor del JSON. Una faena amb `prd.md` propi funciona com abans.
- **1.62.1 — 2026-11-09** — **Patch**: `registre-disparadors.js` compta `revisa-prompt` entre les xarxes de seguretat, com ja deia el README de `hooks-plantilla`: amb 10 sessions sense cap bloqueig, l'informe diu «xarxa, cap actuació» i no «retirar?».
- **1.62.0 — 2026-11-09** — **Minor**: mòdul nou `hooks-connectats.js` (quins scripts de `.claude/hooks/` nomenen `.claude/settings.json` i `settings.local.json`, i amb quin nom s'anota cada script al registre). `comprova-desfasament.js` avisa d'un script del catàleg copiat que cap settings nomena (abans eixia com a «al dia») i d'una entrada que apunta a un script que no existix; no compten per a `--strict`. L'informe de `registre-disparadors.js` llista els hooks connectats que s'anoten i no tenen cap línia, amb 10 sessions al registre o més: «comprova que corren». `instal·la-ci.js` copia el mòdul. Set casos nous a `proves/casos/comprova-desfasament.js` i quatre a `registre-hooks.js`.
- **1.61.0 — 2026-11-08** — **Minor**: mòdul nou `patrons-dades-personals.js` (DNI i NIE amb la lletra de control correcta, i excepcions per als DNI d'exemple), la font única que carreguen els hooks `revisa-prompt.js` i `oculta-secrets-eixida.js` de `hooks-plantilla` 5.31.0. No és un check i no va a la CI; `instal·la-ci.js` el copia. Casos nous: `proves/casos/revisa-prompt.js` (deu) i dos d'`oculta-secrets-eixida.js`; `proves/cadena-hooks.js` comprova que el `sed` de `registra-error.sh` emmascara tot el que el mòdul detecta.
- **1.60.1 — 2026-11-08** — **Patch**: `instal·la-ci.js` copia `exporta-entregues.js` als projectes. Va nàixer a la 1.59.0 i la llista de l'instal·lador no el duia: un projecte que feia `--actualitza` no el rebia i l'hauria d'executar des del clon. Un cas nou a `cadena-ci.js`.
- **1.60.0 — 2026-11-08** — **Minor**: l'informe `calibratge.js` diu «interval» en lloc del terme anterior, i «no calibrat» en lloc de «no calibrada» (capçalera de la taula «Hores reals per fase i mida» i la nota de sota); la resta de l'eixida i de les opcions no canvia.
- **1.59.0 — 2026-11-07** — **Minor**: `producte.js` llig la taula «Entregues» del `pla.md` (`llegixEntregues`); `comprova-tracabilitat.js` en fa error si està mal formada (tipus que no és Disseny, Construcció ni Validació, construcció sense `RF-XX` ni «Motiu: …», `E-NN` repetit, RF inexistent o retirat); informe nou `exporta-entregues.js`, el JSON amb versió que la Cartera de Projectes rep per la CI (decisió de `cdp`, «Una sol·licitud per entrega, amb tipus»).
- **1.58.0 — 2026-11-05** — **Minor**: el job d'Azure d'`instal·la-ci.js` servix per a un servidor propi: `--pool <nom>` (per defecte `Default`) en lloc de `vmImage`, `persistCredentials: true`, Node de l'agent en lloc de `NodeTool@0`, i sense la secció `pr:`. Hi entren `comprova-descripcio-mr.js` i `comprova-origen-mr.js`, que amb el mòdul nou `context-pr.js` llegixen la PR d'Azure DevOps / TFS (branques de variables; descripció i etiquetes de l'API amb `SYSTEM_ACCESSTOKEN`). Si no la poden llegir, ho diuen. `azure` és l'opció per defecte en preguntar. **Correcció**: l'adopció no copiava estos dos checks, i el job de GitLab que els corre fallava. El refresc proposa el pas sencer, amb el seu `env`. Prova nova, `proves/cadena-ci.js`. **Encara no s'ha executat en un agent real.** Un job d'Azure ja generat no canvia sol: cal editar-lo.
- **1.57.0 — 2026-11-03** — **Minor**: `comprova-descripcio-mr.js` comprova la secció «Requisitos (RF)» de la descripció de la MR, en avís: si el projecte té un PRD amb RF i la descripció no la porta; els verbs que no són `Tanca`, `Avança`, `Reobri` o `Cap: <motiu>`; un `Cap` sense motiu; i un RF que no existix al PRD o està retirat. **No comprova** que un `Tanca` no tanque un RF que ja ho està (demana els trailers de `main`). Set casos nous. Origen: `cdp`, `proposta-progres.md`, decisions 2, 4, 6 i 7.
- **1.56.0 — 2026-10-30** — **Minor**: `comprova-antipatrons.js` avisa, en avís, quan un fitxer de test del diff acaba amb menys declaracions (`[Fact]`, `[Theory]`, `it(`, `test(`) de les que tenia: un test llevat, o el fitxer de test esborrat sencer, que fins ara cap passada veia (el skip només es mira a les línies afegides). Es compta el balanç entre línies llevades i afegides: moure o reescriure un test no avisa. Només amb diff. Ajuntar `[Fact]` en una `[Theory]` avisa sense que falte res: la resposta és dir-ho a la MR. Dos casos nous.
- **1.55.0 — 2026-10-27** — **Minor**: `registre-disparadors.js` anota també els hooks que avisen o bloquegen (`registraHook` i la CLI `hook <hook> <resultat> [sessio|-] [fitxer] [regla]`) i `--informe` hi afig la secció «Hooks que avisen o bloquegen»: sessions, actuacions, bypass i repeticions per hook, amb la lectura **retirar?**, **modificar?** o **estendre?** (mostra mínima de 10 sessions; les xarxes de seguretat mai reben «retirar?»). `--informe <fitxer.jsonl...>` llig les entregues de `--exporta` de diverses màquines. `exporta-sessio` conserva `hook` i `resultat`. La marca de «ja present en esta sessió» va al directori temporal del sistema: res de nou a gitignorar. Nou: `proves/casos/registre-hooks.js` (nou casos) i `proves/cadena-hooks.js` (els hooks reals de `hooks-plantilla` 5.28.0 escriuen la línia que toca), dins de `npm test`.
- **1.54.0 — 2026-10-27** — **Minor**: check nou `comprova-higiene.js`, en avís, als tres jobs (GitHub, GitLab, Azure). Sobre els fitxers canviats avisa d'un fitxer **nou** de més de 500 KB (`--maxkb`), d'un marcador de conflicte a principi de línia en qualsevol fitxer de text, i d'un `.claude/settings*.json`, `.mcp.json`, `docmap.json` o `skillmap.json` que no és JSON vàlid. Un fitxer que ja hi era i creix no avisa. `--dir` recorre l'arbre. Huit casos nous. **Adopció**: `instal·la-ci.js --actualitza` copia el script i afig el pas al job.
- **1.53.0 — 2026-10-27** — **Minor**: informe nou `calibratge.js`. Ajunta el «Calibratge» i el «Registre d'hores» del `pla.md` de totes les faenes: hores reals per fase i mida (entregues, interval, mediana; «no calibrat» per davall de tres entregues), el registre per fase i rol amb els trams «no anotades» a part, i les files del Calibratge que no són la suma del seu registre. Mai per persona. `producte.js` hi afig el lector (`llegixHores`, `faenesAmbPla`). No va a la CI; `instal·la-ci.js` el copia. Sis casos nous.
- **1.52.2 — 2026-10-26** — **Patch**: fitxer de casos nou, `proves/casos/canari.js`, per al hook
  `canari.js` de `hooks-plantilla/` 5.26.0 (tres negatius: sense paraula, per la transcripció i amb
  la paraula d'una altra sessió). Cap script ni opció canvia.
- **1.52.1 — 2026-10-24** — **Patch**: el README de `temps-sessio.js` diu que Claude Code esborra les transcripcions de més de 30 dies si no es puja `cleanupPeriodDays`, i que per això el Calibratge s'omple en el traspàs. Mesurat al taller: les transcripcions només arriben al 2026-09-24, i el projecte comença el 2026-07-09.
- **1.52.0 — 2026-10-24** — **Minor**: informe nou `temps-sessio.js`. Llig les transcripcions de Claude Code d'esta màquina i, per branca, dona en minuts l'agent actiu (menys les esperes d'`AskUserQuestion`, que van a banda), i els buits entre torns en dos trams (fins a 30 min i més de 30). Mateix contracte que `marques-de-temps.js`: cap camp `hores`, `aixo_no_son_hores` al JSON i «no mesurat» en lloc de zero. Avisa dels torns fora d'auto-mode, en què l'agent actiu inclou les esperes de permís. No va a la CI. Cinc casos nous. Mesurat sobre `cdp`: 220 dels 1.448 min de torns eren la persona contestant preguntes.
- **1.51.3 — 2026-10-24** — **Patch**: `comprova-tokens-hardcoded.js`, amb `--base/--head`, deixa fora els fitxers només reanomenats (`R100` de `git diff -M`: mateix contingut, ruta nova). No afigen cap línia, però el check els llegia sencers: la migració de `kit-projecte` 3.0.0 a `doc-projecte/` acusava 92 `px` inline de cinc vistes de revisió anteriors a la regla. Un fitxer reanomenat i tocat es continua revisant sencer, i `--dir` i `--fitxer` no canvien. Dos casos nous. Trobat migrant `cdp`.
- **1.51.2 — 2026-10-24** — **Patch**: `instal·la-ci.js` no arrancava (`SyntaxError`): el pas de `comprova-unicode-invisible.js` del job de GitHub (1.51.0) portava `${{ github.base_ref }}` sense escapar dins de la plantilla de text, i Node el llegia com una interpolació. Ara porta `\${{`, com els altres passos. Sense esta correcció, `--actualitza` fallava en qualsevol projecte, també en els que no gasten GitHub.
- **1.51.1 — 2026-10-23** — **Patch**: `skillmap.exemple.json` i `comprova-tokens-hardcoded.js` deixen de citar els skills retirats (ua-oracle-schema, ua-api-design, ua-vue-design-system, ua-dotnet-review i ua-dotnet-diagnostico): el `.cs` remet a `ua-dotnet-errores` + `ua-dotnet-seguridad`, la regla de `bd-schema/` desapareix i els tokens remeten a `ua-vue-uacloud`.
- **1.51.0 — 2026-10-22** — **Minor**: `comprova-unicode-invisible.js` (nou, en avís): caràcters
  Unicode que l'editor i el diff no mostren però que el model llig com a text (amplada zero,
  controls bidi, unió de paraules, un BOM enmig del text i _tag characters_) en els fitxers
  d'instruccions de l'agent: `CLAUDE.md`, `AGENTS.md`, `CONTEXT-IA.md`, `SKILL.md`, `.mcp.json` i
  tot `.claude/`. Diu fitxer, línia, columna i punt de codi, i acaba sempre en 0. Els patrons viuen
  al mòdul nou `patrons-unicode.js`, que també carrega `valida-skill.js` per a avisar-ne en els `.md`
  i `.yaml` de cada skill. Els rangs van en números, no en escapaments dins d'una regex: una eina
  que desescapa en escriure deixaria el caràcter real al fitxer (passat en fer-lo). Base mesurada:
  cap coincidència al catàleg ni al kit. `instal·la-ci.js` copia els dos fitxers i afig el pas als
  tres jobs. **Adopció**: `instal·la-ci.js --actualitza` i la línia nova al job.
- **1.50.0 — 2026-10-22** — **Minor**: el kit de documentació viu a `doc-projecte/` (`kit-projecte`
  3.0.0). Mòdul nou, `disseny-kit.js`, que decidix el disseny per projecte (hi ha `doc-projecte/` o
  no) i dona la ruta de cada fitxer del kit en els dos; el carreguen `valida-documentacio.js`,
  `comprova-desfasament.js` i `comprova-tracabilitat.js`, i `instal·la-ci.js` el copia.
  `valida-documentacio.js` diu quin disseny ha trobat, avisa de cada document que hi ha als dos
  llocs i exigix que **totes** les mencions de `CONTEXT-IA.md` dels punters anomenen la ruta real
  (abans bastava una: la prosa podia dir-la bé mentre l'`@import` apuntava a un lloc buit).
  `comprova-tracabilitat.js` mira `doc-projecte/producte/` per defecte i, si no hi és però hi ha
  `docs/producte/`, ho diu en lloc d'acabar en «res a comprovar»; `compta-factors.js` (de la
  1.49.0) resol la carpeta igual i avisa igual. `analitza-registre-errors.js`
  busca el registre a `doc-projecte/` i després a l'arrel. Un projecte sense migrar continua
  passant igual. Prova nova d'extrem a extrem, `proves/cadena-kit.js` (dins de `npm test`): genera
  el kit i hi passa per damunt tots els consumidors, en els dos dissenys. **Adopció**:
  `instal·la-ci.js --actualitza` **abans** de migrar el kit; una còpia anterior busca el kit només
  a l'arrel i, en un projecte migrat, falla el Nivell 1.
- **1.49.0 — 2026-10-22** — **Minor**: `compta-factors.js` (nou, informe, no check): els factors de càrrega de cada faena de `docs/producte/` per fase (disseny, programació, validació humana), la fitxa de partida de la secció «Estimació» del `pla.md` (`ua-planificador/references/estimacio.md`). Cap mida ni cap hora; el que el PRD no porta, «no consta». El lector del PRD i les specs passa de `comprova-tracabilitat.js` al mòdul `producte.js`, que comparteixen; el check no canvia d'eixida (els 14 casos, igual). `instal·la-ci.js` copia els dos fitxers nous. Pilot sobre `cdp`: una cel·la «Programador, analista» comptava com un rol més, i els RF d'una faena posterior es barrejaven amb la prioritat «Posterior»; corregit abans de publicar-lo. Cinc casos nous.
- **1.48.0 — 2026-10-19** — **Minor**: `comprova-tracabilitat.js` accepta `--base <ref> [--head]` i avisa de cada RF que les línies afegides del canvi citen sense que cap spec vigent de la base el cobrisca (l'spec va abans que el codi). Opt-in: sense `--base` no toca git. Els RF del `pla.md` en `- **Posterior**` compten com a faena posterior, també per a l'avís d'imprescindibles. Provat en sec sobre les 42 PR de `cdp`: 1 PR amb avís vertader (codi de l'adaptador sense spec) i cap fals positiu. Tres casos nous.
- **1.47.0 — 2026-10-19** — **Minor**: `comprova-antipatrons.js` avisa d'un test que el canvi
  desactiva (`[Fact(Skip =`, `[Ignore`, `it.skip`, `describe.skip`, `xit`...), naix en avís. Només
  les línies que el canvi afig: contra la base en una MR, contra `HEAD` amb `--fitxer`. Revisa també
  els fitxers de test, només per a este patró. Tanca a mitges el forat de
  `protegix-test-correccio.js` (hooks-plantilla README § Cobertura dels hooks): el test desactivat es
  veu vinga per on vinga; l'asserció afluixada, no. `comprova-descripcio-mr.js` no avisa d'una
  secció que acaba en `(opcional)`, per a les dos noves de la plantilla de MR.
- **1.46.0 — 2026-10-15** — **Minor**: check nou, `comprova-tracabilitat.js`, en avís. Creua el
  PRD i les specs de pantalla de cada faena de `docs/producte/`: RF citats que el PRD no definix o
  té retirats, la fila d'una tasca que cita un RF que la seua spec diu que no cobrix, criteris
  d'acceptació sense `_Prova_:`, i (avís) RF imprescindibles sense spec i RF sense prova.
  `--strict` fa bloquejar els errors. Sense `docs/producte/` acaba en 0. `instal·la-ci.js` el copia
  i l'afig als jobs de GitHub, GitLab i Azure; onze casos a `proves/casos/comprova-tracabilitat.js`.
  Va nàixer en un projecte consumidor, on la fila d'una tasca citava un RF que l'spec de la tasca
  deixava fora a consciència, i només es va vore llegint els dos documents alhora.
- **1.45.2 — 2026-10-15** — **Patch**: cas nou a `proves/casos/injecta-estat-sessio.js` (l'eixida és
  JSON amb `systemMessage` i `additionalContext`), pel canvi d'`injecta-estat-sessio.sh` a
  `hooks-plantilla/` 5.23.0. Cap script ni opció canvia.
- **1.45.1 — 2026-10-12** — **Patch**: cas nou a `proves/casos/injecta-estat-sessio.js` (sense PR
  obertes no hi ha secció de PR i el hook ix amb 0), pel canvi d'`injecta-estat-sessio.sh` a
  `hooks-plantilla/` 5.22.0. Cap script ni opció canvia.
- **1.45.0 — 2026-10-12** — **Minor**: els patrons de `comprova-secrets.js` passen a un mòdul,
  `patrons-secrets.js`, amb una funció `oculta()` que substituïx cada valor per
  `[secret ocultat: <motiu>]`. El consumix també el hook `oculta-secrets-eixida.js` de
  `hooks-plantilla/` 5.21.0, de manera que una excepció nova val alhora al commit, a la CI i a
  l'eixida de les eines. `comprova-secrets.js` no canvia de comportament; sense el mòdul acaba
  en 2 amb l'orde per a refrescar la còpia, com amb `fitxers.js`. `PLACEHOLDER_RE` reconeix
  `[secret ocultat` com a farciment. `instal·la-ci.js` copia el mòdul; sis casos nous a
  `proves/casos/oculta-secrets-eixida.js`.
- **1.44.0 — 2026-10-10** — **Minor**: `valida-skill.js` avisa d'una remissió `fitxer.md` § Secció
  a una secció que el fitxer de destí ja no té. Primer resultat: `ua-ux-review` citava «Objectiu i
  context», reanomenada «Tasques i context».
- **1.43.2 — 2026-10-09** — **Patch**: `comprova-tokens-hardcoded.js` deixa fora els
  `*.packed.html` i `*.artifact.html`, l'eixida de `pack.mjs` de gen-html-plan: inlinea el CSS del runtime i donava
  desenes de literals que no són de qui escriu el pla. La font `.html` es continua revisant.
  Dos casos positius nous a `proves/casos/comprova-tokens-hardcoded.js`.
- **1.43.1 — 2026-10-09** — **Patch**: `comprova-secrets.js` deixa passar un valor truncat amb
  punts suspensius (`"rt_9Hk2..."`, `"eyJhbGciOiJFUzI1NiIs…"`): un secret real no s'escriu
  elidit. L'exemple de parell access/refresh token d'un article extern bloquejava la CI del PR.
  Cas positiu nou a `proves/casos/comprova-secrets.js`.
- **1.42.0 — 2026-10-08** — **Minor**: `comprova-redaccio.js` afig tres regles de forma, que
  s'activen només si el skill les conté: «este» i família (la llista que seguix a «mai» a
  `terminologia.md` § Formes), incoatius en -ix quan el skill fixa l'indicatiu en -eix
  («Accedix» → «Accedeix»), i tractament de vosté quan `veu-i-to.md` diu «mai "vosté"»: el mot
  explícit, l'imperatiu en -isca, l'imperatiu en -e quan la forma de tu en -a hi és al mateix
  fitxer o als termes canònics («Confirme»/«Confirma»), i «Segur/Confirma que vol…». Mesurat a la
  demo d'`ua-ds-fusio` (766 cadenes): 16 avisos, tots encertats; els determinants («Eixe»/«Eixa»)
  i les paraules en vocal + -ix («baix») donaven falsos positius i en queden fora. Dos casos nous
  a `proves/`.
- **1.41.0 — 2026-10-06** — **Minor**: check nou `comprova-redaccio.js`, la part de la redacció
  que es pot comptar o llistar, sobre els fitxers de traduccions en valencià (`ca.json`, `va.json`,
  `ca-ES.json`, `ca-valencia.json`). Set regles: terme a evitar en una etiqueta d'acció, etiqueta
  buida, botó en infinitiu, longitud per tipus de text, codi HTTP visible, paraula administrativa
  genèrica i impersonal en futur. **No porta les regles**: les llig cada vegada de les taules
  d'`ua-i18n-valencia/references/terminologia.md` i d'`ua-ux-redaccio/references/`, trobant el
  catàleg amb `--cataleg`, `UA_CATALEG` o el symlink `~/.claude/skills`; sense catàleg calla.
  Mesurat abans sobre dos fitxers reals (`sistema-disseny-ua/locales/va.json`, 151 cadenes, i la
  demo d'`ua-ds-fusio`, 766): 11 avisos, 7 encertats, 2 marginals (26 paraules sobre 25) i 2
  falsos («Error 404» al menú d'una demo de la plantilla 404). Dos ajustos del pilot hi queden
  escrits: el terme a evitar només compta com a etiqueta sencera d'un botó (dins d'una frase, 7 de
  7 eren falsos), i un terme canònic en un concepte i a evitar en un altre («Tanca») calla (4 de
  4 eren falsos). **Sempre en avís**: el tipus de cada cadena es deduïx del nom de la clau, i els
  pressupostos són orientatius pel propi skill. No entra als jobs de CI que genera
  `instal·la-ci.js` (sí a la llista de fitxers que copia): el camí és el hook `comprova-edicio.js`.
  Set casos a `proves/casos/comprova-redaccio.js`.

- **1.40.1 — 2026-10-06** — **Patch**: casos de `hooks-plantilla/injecta-estat-sessio.sh`
  (`proves/casos/injecta-estat-sessio.js`) per als avisos de la 5.18.0, i el README documenta `git: true` i `UA_CATALEG` per als casos de
  hooks que miren el repositori. Cap script canvia.

- **1.39.0 — 2026-09-29** — **Minor**: dos avisos nous, tots dos sense bloquejar.
  - **`valida-skill.js`**: una ruta relativa `references/X.md` del `SKILL.md` o de les seues
    `references/` que és d'un altre skill avisa i diu de qui és; una que no existix enlloc, també.
    Una ruta amb prefix (`ua-x/references/X.md`) ha d'existir en eixe skill. Sobre el catàleg
    trau exactament les set rutes que ja s'havien trobat a mà, i cap altra. Dos casos nous.
  - **`comprova-antipatrons.js`**: text visible literal al `<template>` d'un `.vue`
    d'aplicació (el text d'un node i els atributs `label`, `placeholder`, `title`,
    `aria-label` i `alt` sense lligar), la regla d'`ua-i18n-valencia § Què és sempre una
violació`. Escàner per caràcter, no per línia: una interpolació, un comentari o un valor
    d'atribut poden ocupar diverses línies, i una paraula sola dins d'una etiqueta és un atribut
    booleà. Queden fora `demos/` i `templates/`. Mesurat abans sobre quatre repositoris
    locals: 53, 73, 143 i 29 avisos, quasi tots text real sense `t()` (tres d'eixes aplicacions
    no usen i18n); el component `Cabecera.vue` de `vueua-components` porta un
    `aria-label="$t(…)"` sense `:`, que el lector de pantalla llig literal. **Naix en avís**
    (`naix: '2026-09-29'`): un símbol, una sigla o un nom propi també són text literal. Dos
    casos nous.

- **1.38.0 — 2026-09-26** — **Minor**: un patró nou en avís i fixtures per al camí de PowerShell.
  - **`comprova-antipatrons.js`**: el comentari que substituïx codi (`// ... resto del código sin
cambios`, `<!-- ... existing template unchanged -->`), cinqué punt d'`ESTANDARDS.md` §12. Viu
    dins d'un comentari, i les passades de sempre els lleven abans de buscar: va en una passada
    pròpia sobre la línia crua, per a totes les extensions revisades. Exigix punts suspensius **i**
    una paraula d'«això no ha canviat». Mesurat abans sobre 809 fitxers de set aplicacions reals:
    cap coincidència. **Naix en avís** (`naix: '2026-09-26'`). Dos casos nous.
  - **Fixtures**: casos amb `tool_name: 'PowerShell'` i missatge en here-string per a
    `bloqueja-main.sh`, `comprova-secrets-commit.sh`, `comprova-docmap-commit.js` i
    `recorda-auditoria.js` (vegeu `hooks-plantilla` 5.12.0). Inclou el cas que va destapar que
    `comprova-docmap-commit.js` callava amb tots els commits en heredoc de Bash.

- **1.37.0 — 2026-09-24** — **Minor**: dos checks passen a la costura de l'edició, i
  `comprova-antipatrons.js` estreny un patró, en corregix un missatge i n'afig sis en avís.
  - **`--fitxer <ruta>`** (repetible) a `comprova-antipatrons.js` i `comprova-tokens-hardcoded.js`:
    revisa només eixes rutes, sense git ni arbre. És la porta del hook nou
    `hooks-plantilla/comprova-edicio.js`, que els passa el fitxer que l'agent acaba d'editar.
  - **`ProblemDetails`** deixa de casar amb el nom del tipus i passa a casar amb el que de veres el
    fa flux central: `AddProblemDetails(` i `IProblemDetailsService`/`IProblemDetailsWriter`. Fins
    ara acusava el `HandleError` que prescriu `ua-dotnet-api` (`new ProblemDetails`,
    `ProducesResponseType<ProblemDetails>`) i els tests d'`ua-dotnet-test` que en verifiquen el
    `type`.
  - El missatge del patró de llibreries `Result` ja no diu «el patró Result no s'usa a la UA»: des
    del 2026-09-23 `ua-dotnet-api` fixa un `Result<T>` propi. La regex no canvia.
  - **Sis patrons nous, tots en avís** (README § «Naixen en avís»; porten `naix` i l'eixida ho diu
    amb `[naix en avís, 2026-09-24]`): `[Authorize(Roles|Policy = "…")]` literal
    (`ua-dotnet-seguridad`); valor interpolat al `WHERE`/`SET`/`VALUES` d'un `$"…"`
    (`ua-dotnet-api`; mai bloquejarà sol, perquè la regex no sap si el valor ve del client); OUT
    `Varchar2` sense `tamano`, OUT sense `tipoBd` i OUT amb valor inicial `DBNull.Value`/`default`
    (`ua-oracle-datos`); `fetch`/`axios` solts (`ua-vue-uacloud`) i `uaT()` en un `.vue`
    (`ua-i18n-valencia`). Per als dos últims el check mira ara també `.vue` i `.ts`, fora de
    tests, e2e, `.d.ts` i `*.config.ts`.
  - `evals/` entra a `EXEMPT`: els fitxers que avaluen els skills de revisió porten el defecte a
    posta. Sobre este repositori, els patrons nous hi trobaven tres encerts, tots eixos.
  - L'executor de `proves/` substituïx també `{arrel}` (ruta absoluta del cas), també dins de
    l'`stdin`. Casos nous a `proves/casos/comprova-antipatrons.js`,
    `comprova-tokens-hardcoded.js` i `comprova-edicio.js`.

  Adopció: re-copiar els dos scripts. En un projecte amb `.vue`/`.ts`, el primer PR pot portar
  avisos nous; cap bloqueja.

- **1.36.0 — 2026-09-23** — **Minor**: `analitzaCua()` d'`analitza-registre-errors.js` retorna
  també `detall` (els torns pendents, amb la seua sessió) i `sessionsRevisades` (prefixos de les
  sessions auditades alguna volta). Additiu: l'informe i el `--json` d'abans no canvien de forma. Ho
  usa `hooks-plantilla/recorda-auditoria.js` per a no comptar els torns de la sessió actual quan ja
  s'ha auditat. Casos nous a `proves/casos/recorda-auditoria.js`.

- **1.35.0 — 2026-09-23** — **Minor**: `skillmap.exemple.json` suggerix els skills importats de
  l'equip de programació: regla nova `servidor-api` (`Services/`, `Controllers/`, `Models/` →
  `ua-dotnet-api`), regla nova `schema-oracle` (`bd-schema/` → `ua-oracle-schema`), i la regla
  `frontend-vue` afig `ua-vue-uacloud` i esmenta `ua-vue-datos`. Adopció: afegir les regles noves al
  `skillmap.json` del projecte a mà (és un fitxer adaptat, no es re-copia).

- **1.34.0 — 2026-09-23** — **Minor**: `valida-documentacio.js` alinea els nivells amb
  `kit-projecte/README.md`. `docs/historial-decisions.md` passa de N2 a companion de N1 -ix davall
  de «Nivell 1», però faltar-ne només avisa (`- pendent: ... (companion de N1, avís)`), perquè fer-lo
  obligatori faria fallar la CI de projectes generats abans. `docs/producte/README.md` es queda a N2,
  que és on ja el posaven README i validador (l'arbre de `documentacio-projecte.md` deia N3 i s'ha
  corregit). Cas nou a `proves/`. Adopció: re-copiar l'script.

- **1.33.0 — 2026-09-22** — **Els hooks avisaven de la deriva sense dir mai de què anava.**
  `comprova-desfasament.js` té dues branques i només una donava titulars. La de carpetes els dona
  des de la 1.26.0 perquè sap de quina versió véns (`VERSION.md` local contra catàleg). La dels
  hooks no ho sap mai -qui els adopta fitxer a fitxer no deixa cap `VERSION.md` al projecte, i així
  és com ho fan **dos dels tres projectes mesurats el 2026-09-10**. Eixe majoritari rebia
  `AVÍS: 1 hook(s) ... difereixen` i «re-copia'ls», i cap motiu.

  Ho va destapar el bump de `hooks-plantilla` a la **5.9.0**, que és el cas on la línia muda fa més
  mal: eixe canvi **lleva** comportament (el hook de format deixa de tocar codi font i de formatar
  sense configuració del projecte), o siga que **qui no re-copia es queda la versió defectuosa**. Un
  avís sense motiu convida exactament a la reacció equivocada -«bah, és el de format».

  Ara, quan un hook difereix i no hi ha `VERSION.md` local, l'avís porta la versió del catàleg i els
  **tres últims titulars** de l'historial de `hooks-plantilla`. Tres decisions el fan honest:
  - **No s'inventa el rang, i ho diu en veu alta.** Sense versió local no es pot calcular què et
    falta; el text diu «estos són els últims canvis del catàleg, no un càlcul del que et falta».
    Una llista que semblara un rang mentiria justament en el cas més fàcil de creure.
  - **No ix si hi ha `VERSION.md` local.** Allí la fila de la taula ja ha donat el rang exacte, i
    el cas que la porta protegix és el d'una còpia **al dia** amb un hook tocat a mà: dir-li «els
    últims canvis» seria dir-li que va endarrerit quan no hi va.
  - **Tres titulars, no cinc.** No són el que et falta, són orientació per a decidir si obris el
    `VERSION.md`.

  Si el catàleg no porta `VERSION.md` de hooks, o `novetats.js` no ha arribat a la còpia, el que es
  perd és el detall i mai l'avís -mateixa regla que el `try`/`catch` amb què els dos consumidors ja
  carreguen el mòdul. Tres casos nous a `proves/casos/comprova-desfasament.js` (116 en total),
  un per decisió.

- **1.32.0 — 2026-09-21** — **El check mirava què tens i com ha quedat, mai què et falta.**
  `comprova-desfasament.js` comparava els hooks de `.claude/hooks/` contra el catàleg, o siga que
  un hook **nou** era invisible per a qualsevol projecte que no el tinguera ja: els tres de la
  4.1.0 de `hooks-plantilla` o `protegix-test-correccio.js` de la 5.3.0 no se li oferien mai a
  ningú, i cap peça del kit li deia a un consumidor «te'n falten cinc». El símptoma que ho va
  destapar és d'usuari, no de codi: `/ua-skills:onboarding --actualitza` acabava avisant que els
  hooks no s'actualitzaven i el programador es quedava sense saber què fer.

  Ara fa també l'escaneig invers -recorre `hooks-plantilla/` i compta els que el projecte no
  té-, amb tres decisions que el fan sostenible:
  - **Només el recompte.** Amb 13 hooks al catàleg i projectes que n'adopten 4-5, llistar-los
    sencers a cada execució són huit línies repetides que s'aprenen a botar, i amb elles l'`AVÍS`
    de deriva que sí que importa. Els noms només ixen amb **`--hooks-disponibles`**.
  - **Mai compta per a `--strict`.** No adoptar un hook és una decisió del projecte, no deriva:
    parar-li la CI per això convertiria una oferta en una imposició.
  - **`hooks-declinats.json`** (arrel, `ci-plantilla/` o `kit-si-ua/ci-plantilla/` -la mateixa
    regla de tres llocs que `docmap.json` i `skillmap.json`) lleva del recompte el que el projecte
    ja ha dit que no vol, amb el motiu i la data al costat. Es commiteja: declinar un hook és
    decisió del projecte, no de la màquina de qui executa el check. Si el fitxer està trencat,
    **falla obert i dient-ho** -si callara, el projecte es quedaria sense l'oferta i sense saber
    per què.

  El mode de fallada que calia evitar el primer dia: un projecte amb `"type": "module"` adopta
  `comprova-docmap-commit.js` com a `.cjs`, i comparar per nom exacte li hauria ofert el `.js` del
  catàleg com a hook nou. L'equivalència `.js`/`.cjs`/`.mjs` que `fontDelHook` ja feia cap a dins
  es fa ara també cap a fora. Els `*.snippet.json` i els `*.md` de la carpeta no es compten: no
  s'adopten mai per separat.
  **Bump minor**: opció nova i eixida nova compatible -qui no passe `--hooks-disponibles` només
  veu una línia més, i cap projecte canvia de veredicte.

- **1.40.0 — 2026-09-19** — **`analitza-registre-errors.js` compta el camp `Peça:`**, la clau
  enumerada que `hooks-plantilla` 5.16.0 afig a les entrades `EINES` i al `SISTEMA` d'un component
  nostre. Desglossament nou a l'informe i camp `perPeca` al `--json`, que és el que permet comparar
  dos projectes amb un `sort | uniq -c` en lloc de llegint text. Dos decisions visibles a l'eixida:
  una `EINES` **sense** camp es compta com a `sense determinar` -un buit omés faria parèixer complet
  el recompte-, i el camp només compta **dins del bloc contigu de la seua entrada**, perquè la
  plantilla porta exemples del camp i l'apèndix va després de les entrades. L'script no valida el
  valor: compta el que troba, i qui fixa la llista és `registra-error.sh` en escriure.
  **Proves**: `proves/casos/` guanya dos fitxers -el d'este script i el de `registra-error.sh`, que
  no en tenia cap-, amb els dos modes de fallada que deixarien la comparació inservible en silenci
  (el buit no comptat i la línia de documentació comptada). 116 casos sobre 17 checks.
  **Minor**: eixida nova compatible, cap opció canvia.

- **1.31.0 — 2026-09-11** — **De git no ixen hores, però les marques sí que ixen: `marques-de-temps.js`.**
  El servei porta les hores de cada tiquet a mà i la pregunta que arriba tota sola és si es poden
  traure del repositori. No es poden -un commit diu quan es va **guardar**, no quant es va
  **tardar**-, i el mode de fallada està en la pròpia dada: `e834b20` i `723a250` d'este catàleg
  porten el mateix `CommitDate` perquè una fusió els va reescriure, o siga que qui calcule "temps
  entre commits consecutius" amb eixa data conclou que la faena va costar 0 segons.

  L'script emet el que sí que existix -primer i últim commit per data d'**autoria**, interval de
  calendari, dies amb activitat, salts de més de 8 h, volum del canvi, i el tram vist de cada
  sessió d'agent del registre de disparadors que cau dins de la finestra-, amb eixos noms i mai
  com a `hores`. El `--json` porta dins el camp `aixo_no_son_hores`: qui l'integre amb el tiquet no
  es pot quedar la xifra i deixar-se la condició. Quan la dada no suporta cap interval (un sol
  commit, dos commits amb la mateixa marca, historial reescrit, base i head al mateix punt) diu
  **no mesurable** o para amb codi 2, que per `ESTANDARDS.md` §10.1 és un resultat vàlid. No
  agrega per persona, a propòsit.

  **Els fixtures ja saben expressar el pas del temps**: `proves/` accepta `data`/`dataCommit` per
  commit (i `dataBase`/`dataCommitBase`), que és el que permet provar els quatre camins pels quals
  una marca de git es convertix en una hora inventada. Sense això, tot un fixture cau dins del
  mateix segon i el control negatiu no es podia escriure.
  **Minor**: script nou i camp nou als fixtures; cap check existent canvia de comportament.

- **1.30.0 — 2026-09-10** — **Cinc dels set checks no necessitaven git, però tots set el
  demanaven.**
  `comprova-secrets.js`, `comprova-tokens-hardcoded.js` i `comprova-antipatrons.js` usaven git per
  a una sola cosa -obtindre noms de fitxer-; el que fan després no sap res de commits. Amb `--dir
<carpeta>` recorren l'arbre i funcionen sense repositori: un TFS antic, una carpeta compartida,
  un projecte encara sense git. De propina són més estrictes així, perquè miren tot el codi i no
  només el tocat en un PR. La llista de fitxers viu ara a `fitxers.js`, mòdul nou, en lloc de tres
  còpies del mateix `execSync`.

  `comprova-documentacio.js` i `comprova-frescor.js` **no** el porten, i no per falta de ganes: la
  pregunta que fan necessita historial. El que sí que canvia és com ho diuen. El primer petava amb
  un rastre de pila; el segon era pitjor -engolia l'error de git i acabava dient «cap senyal de
  documentació rançosa», verd damunt de no haver mirat res-. Els dos paren ara amb una frase i
  codi 2. Que `comprova-frescor.js` puga acabar en 2 no contradiu que mai bloquege: no bloqueja
  per una troballa, i això és no poder córrer.
  **Minor**: opció nova i mòdul nou; els modes existents no canvien.

- **1.29.0 — 2026-09-10** — **La CI del kit només sabia parlar amb GitHub i GitLab, i el destí
  previst de la UA és TFS.**
  Entra `--ci azure`, que genera `azure-pipelines-qualitat.yml` i val igual per a Azure DevOps al
  núvol i per a un Azure DevOps Server 2019+ de casa. Porta escrites les dos trampes que fan que
  una pipeline d'Azure falle **en verd**: `pr:` no dispara en repositoris d'Azure Repos -allí els
  PR es disparen per política de branca, i sense donar-la d'alta a Build validation el fitxer és
  decoració-, i el clon superficial per defecte deixa `git diff base...head` sense avantpassat
  comú, o siga que el check acaba sense vore cap fitxer canviat. També resol
  `System.PullRequest.TargetBranch`, que arriba com a `refs/heads/main` i no com a `main`.

  **I el refresc deixa de donar el proveïdor per suposat.** Mira quins fitxers de CI hi ha al
  projecte i compara contra el job de cadascun; si no en troba cap, pregunta; si el proveïdor que
  li dius no té cap fitxer, oferix crear-lo. Un projecte pot migrar de GitHub a TFS sense que
  ningú torne a executar l'adopció, i mentres això no es preguntava la comparació de la 1.28.0 es
  feia contra el sistema equivocat: el mode de fallada que estàvem intentant tancar, un pis més
  amunt. Crear un job que no existix no contradiu el «no toca el job de CI»: el que no es toca mai
  és un fitxer que ja hi és i pot estar editat a mà.
  **Minor**: opció nova i eixida nova; els projectes existents no canvien de comportament.

- **1.28.0 — 2026-09-10** — **El job que generàvem corria quatre checks i el nostre en corria cinc.**
  `comprova-secrets.js` era al `qualitat.yml` d'este catàleg des de la 1.5.0 i **no** al job que
  `instal·la-ci.js` genera per als projectes: el considerem prou important per a la nostra CI i no
  l'hi donàvem a ningú. El hook local no el substituïx -només veu els commits fets en una sessió amb
  el hook instal·lat en eixa màquina, i pot estar degradat sense que ningú ho note, que és
  literalment el cas de `generador-correus-ua` (1.27.0)-. Entra sense `--warn`: un secret filtrat és
  un incident. Amb ell entra `comprova-antipatrons.js`, en mode avís quan `--legacy`; en un projecte sense `.cs`/`.pks`/`.pkb`/`.sql` no mira
  res i acaba en 0, o siga que tindre'l no costa res.

  **I el refresc passa a comparar el job de CI del projecte** amb el que generaria, anomenant els
  checks que hi falten i imprimint la línia exacta. No l'escriu: un job pot estar editat a mà, i
  sobreescriure'l s'enduria per davant coses posades a propòsit -el `--warn` d'un legacy, per
  exemple-. Si el job ja porta eixe `--warn`, les línies proposades vénen igual. Sense esta
  comparació, un check afegit al job generat no arribava mai a cap projecte ja adoptat: el mateix
  forat que la 1.26.0 va tapar per als fitxers, un pis més amunt.
  **Minor**: el job generat canvia per als projectes nous, i als existents només s'informa.

- **1.27.0 — 2026-09-10** — **La fila dels hooks estava morta per construcció.**
  `hooks-plantilla` es rastrejava per `VERSION.md`, però l'adopció normal dels hooks no copia cap
  carpeta: els fitxers van un a un cap a `.claude/hooks/`. Al projecte no queda cap número, i eixa
  fila només deia res al projecte que a més vendoritzava la carpeta -un dels tres consumidors-.
  Registrat com a pendent des del 2026-08-17 i tapat cada vegada comparant els fitxers a mà.
  **Ara el check els compara ell**: contingut de cada fitxer de `.claude/hooks/` contra el seu
  homònim del catàleg, amb els finals de línia normalitzats; `AVÍS` amb els noms dels que
  difereixen, i un fitxer que no existix al catàleg és un hook propi del projecte, no deriva. Un
  `.cjs`/`.mjs` local es compara amb el `.js` del catàleg -un projecte amb `"type": "module"` ha
  d'adoptar-lo així per a que Node el carregue, i comparar per nom exacte el donava per propi.
  Comparar contingut en lloc de versió no és un apany: un número diu el que algú va escriure el dia
  que va copiar; el contingut diu el que corre. La primera execució sobre `generador-correus-ua` va
  traure dos hooks de **seguretat** anteriors a la 4.3.0 -`comprova-secrets-commit.sh`, que encara
  retorna `permissionDecision:'allow'` i per tant s'endú per davant la regla `ask` de
  `Bash(git commit:*)`, i `refusa-secrets-edicio.sh`, que només mira `.env.production`/`.env.prod` i
  deixa passar un `.env` pelat-. Cap mecanisme de versió podia vore-ho: eixe projecte no ha tingut
  mai un `VERSION.md` de hooks. La fila per versió es queda per als que sí vendoritzen la carpeta.
  **Minor**: eixida nova, compatible, sense opcions noves.

- **1.26.0 — 2026-09-10** — **El check de desfasament no mirava on escriu l'instal·lador.**
  `comprova-desfasament.js` buscava la còpia local a `<projecte>/ci-plantilla/VERSION.md`, però
  `instal·la-ci.js` l'escriu sota `kit-si-ua/` des del dia que va nàixer (1.6.0, 2026-07-23). Una
  còpia niada -o siga, qualsevol adoptada amb l'instal·lador- queia a la branca de "cap VERSION.md
  local trobat": no es distingia d'un projecte que no havia adoptat res, i el check acabava en verd
  damunt d'una deriva real. És **el bessó exacte del bug que la 1.7.0 va arreglar al costat del
  catàleg** una setmana després (allí buscava les carpetes font a l'arrel del clon i sempre deia "no
  trobat"). El costat local es va quedar set setmanes més amb el mateix defecte sense que ningú ho
  notara, i el motiu és eixe: aquell fallava en roig i este fallava en verd.
  Mesurat el 2026-09-10 sobre els tres projectes consumidors: `ua-ds-fusio` (niat, v1.25.0) i
  `generador-correus-ua` (niat, v1.15.0) no apareixien a l'eixida; només `generador-informes`
  (arrel, v1.1.0) es veia -el més endarrerit dels tres era l'únic visible. Amb la correcció ixen
  els tres. **Correcció**: `versioLocal()` prova `kit-si-ua/<carpeta>/VERSION.md` i després
  l'arrel, amb el mateix ordre i pel mateix motiu que `versioAlCataleg()` ho fa al catàleg. Una
  còpia a l'arrel es comprova igual i s'acompanya d'una línia `NOTA` que demana migrar-la al layout
  canònic; la ubicació **no** compta per a `--strict`: este check vigila deriva de versió, i parar
  la CI d'un projecte per on té la carpeta seria fer-lo bloquejar per un motiu que no és el seu.
  **Minor** i no patch: canvia l'eixida -files que abans no eixien, línia `NOTA` nova- de manera
  compatible, sense tocar opcions ni exigir reconfigurar cap CI. Proves: de 4 casos a 9; els 4
  antics es queden com a regressió del layout d'arrel, i s'afigen els niats, el de les dos còpies
  alhora (mana la niada) i el que fixa que el layout no bloqueja ni amb `--strict`.

  **Al mateix bump, el motiu pel qual el forat no es podia tapar**: `instal·la-ci.js` guanya
  `--actualitza`. Era idempotent per omissió -saltava tot el que ja existia, sense cap flag per a
  forçar-ho-, o siga que no hi havia cap manera suportada de refrescar una còpia: una correcció
  del catàleg s'aplicava a mà fitxer a fitxer o no s'aplicava. El refresc sobreescriu els fitxers
  que vénen del catàleg, crea els que la còpia no tinguera, i **no toca** ni `docmap.json` (és el
  mapa del projecte, l'única peça de la carpeta que no és una còpia) ni el job de CI (pot estar
  editat a mà) ni `hooks-plantilla/`. Compara abans d'escriure, normalitzant CRLF/LF, i distingix
  `~ actualitzat` de `= igual`: un refresc que declara nou fitxers actualitzats quan només un havia
  canviat amaga precisament el que s'ha de revisar. Si la còpia està a l'arrel es refresca **ahí
  mateix** -escriure-la al lloc canònic deixaria el job de CI del projecte corrent els scripts
  vells amb els nous al costat sense usar-, amb la mateixa `NOTA` que demana migrar-la.
  `--actualitza` sobre un projecte sense cap còpia acaba en 2: refrescar no és adoptar.
  Hi entra també `comprova-antipatrons.js`, que era a la taula de checks del README i no arribava
  a cap projecte -el comentari d'exclusió només nomenava `valida-skill.js` i
  `comprova-recompte-skills.js`-, i es corregixen els exemples de job de CI del README, que
  copiaven les rutes d'arrel (`node ci-plantilla/...`) mentres l'instal·lador genera les niades
  des del primer dia -junt amb les 19 línies `Ús:` de les capçaleres dels scripts d'esta carpeta,
  que deien la mateixa ruta inexistent.

  **El refresc acaba dient a quina versió s'ha arribat i què hi ha de nou**: `v<abans> -> v<ara>`
  més els titulars de les versions intermèdies, extrets d'este mateix historial (títol en negreta
  de cada entrada, o la primera frase quan no en porta; es junten les línies partides perquè un
  titular no es talle enmig d'una cita). «Actualitzat» tot sol obliga a obrir un fitxer per a
  saber què t'ha canviat sota els peus, i qui acaba d'actualitzar és precisament qui encara no
  sap què buscar-hi. Si ja s'estava a l'última, ho diu i prou.

  **I `comprova-desfasament.js` diu de què vas endarrerit**, no només que ho vas: sota cada
  `AVÍS:` llista els titulars de les versions que falten (fins a cinc, i el compte de la resta).
  Saber que vas dos versions arrere no diu si importa; saber que una d'elles arregla un check que
  informava en verd, sí -i qui més ho necessita és qui porta onze versions de retard i no obrirà
  l'historial per a esbrinar-ho. El parser viu a `novetats.js`, mòdul nou que arriba també als
  projectes: els dos que el necessiten el carreguen dins d'un `try/catch`, o siga que una còpia
  antiga sense el mòdul perd el detall però conserva el check -un guardià que peta per un mòdul
  de comoditat és pitjor que un que no dona detall.

- **1.25.1 — 2026-09-03** — **`comprova-secrets.js`: `${VAR}` compta com a placeholder.**
  `PLACEHOLDER_RE` no cobria un valor que comença per interpolació de variable d'entorn
  (`"${GITHUB_TOKEN}"`, `"${{ secrets.X }}"`) -sintaxi que un altre procés substituirà, mai la
  credencial en si. Detectat a `docs/prova-2.md:1229/1244`: un exemple de configuració citat d'un
  article extern (`GITHUB_PERSONAL_ACCESS_TOKEN`/`BRAVE_API_KEY`) va bloquejar un commit que no
  duia cap secret real. **Patch**: només amplia què compta com a placeholder, no canvia opcions ni
  format d'eixida; els patrons de detecció (`PATTERNS`) no es toquen.

- **1.25.0 — 2026-08-28** — **Parlar del bypass el disparava** (`comprova-documentacio.js`,
  `../hooks-plantilla/comprova-docmap-commit.js`). El bypass es detectava amb
  `messages.includes('[no-doc]')` sobre tots els missatges del rang concatenats, o siga que
  qualsevol commit que **anomenara** el marcador -per a documentar-lo, per a explicar-lo, per a
  dir que no calia- apagava la comprovació del PR sencer, i el check informava en verd d'una
  passada que no havia mirat res. Mesurat sobre l'historial complet d'este catàleg i
  d'`ua-ds-fusio`: **nou commits** duien una menció així i tots nou van desactivar el guardià del
  seu rang -inclosos els que documentaven l'arreglada d'un bug anterior d'este mateix bypass-.
  Ara el marcador ha d'obrir o tancar la seua línia, i els blocs i spans de codi es lleven abans
  de buscar-lo. La regla ix de la mesura, no d'una preferència: de les 24 aparicions de
  l'historial, les 15 invocacions reals estan totes a la vora de la línia i les 9 mencions totes
  enmig d'una frase, o siga que la vora les separa 24 de 24. **No s'exigix justificació** -es va
  considerar i es va descartar: `[no-doc]` a soles és una forma que l'historial ja usa, i
  rebutjar-la trencaria un ús legítim per a guanyar un rigor que la mesura no demana. En el hook,
  el marcador de l'orde es busca dins del missatge extret de `-m`, no sobre l'orde sencera, que
  acaba en cometa i no arribaria mai a la vora. Dos casos negatius nous a `proves/casos/`.

- **1.24.0 — 2026-08-24** — **`proves/` deixa de ser només per als checks d'esta carpeta**
  (`proves/executa-proves.js`). El primer mecanisme nou que havia de
  complir la regla del parell de casos era un **hook** de `hooks-plantilla/`, i l'executor no el
  podia córrer: cap manera de passar-li l'stdin -que és per on un hook rep el JSON de
  l'esdeveniment. Dos afegits, els dos petits i els dos generals:
  - **`stdin` al fitxer de casos**, i sempre definit encara que siga buit: així es tanca l'entrada
    del fill i un hook no es queda esperant per sempre dins de la CI.
  - **`codiAvis`** (per defecte 0, que és el que val per als nou checks). La comprovació de
    severitat de la 1.22.0 exigia que un mecanisme en mode avís tinguera un cas negatiu acabant en
    **0**; per a un hook de `PostToolUse` això seria quedar-se mut, perquè allí l'únic codi que
    arriba al model és el **2** i no bloqueja res. La regla de fons no canvia -l'avís s'ha de
    demostrar-, només deixa de suposar quin número el representa.

  Ho va destapar l'executor ell mateix, refusant el primer intent del hook: la comprovació que
  havia de garantir que un mecanisme no naix mut estava, ella, suposant una convenció d'una sola
  família de mecanismes.

- **1.23.1 — 2026-08-24** — **La suite de `proves/` la corria qui se'n recordava**
  (`README.md` § "Els controls positius i negatius"). La carpeta existia des de la 1.21.0 i cap CI
  l'executava -el bloc que la va crear ja ho deixava apuntat com el pas següent. `qualitat.yml`
  d'este repositori la posa com a **primer** pas, abans dels checks que prova: un check mut passa
  en verd, i saber que l'eina està trencada val més que el resultat de l'eina trencada. Només
  documentació: cap script canvia.
- **1.23.0 — 2026-08-24** — **Una regla del `docmap.json` pot exigir que el fitxer naixca o muira**
  (`README.md` § "Regles d'esdeveniment estructural"). Les dos regles del marc referencial d'este
  catàleg porten escrit a la seua `_nota`, des del dia que es van crear, que només han de comptar
  els esdeveniments estructurals -_«editar el cos d'un SKILL.md existent no ha de demanar res, o el
  guardia es torna soroll i algú l'apaga»_-, però el patró que les implementa no distingix un
  fitxer nou d'un fitxer editat, i `--name-only` tampoc. Ara
  `comprova-documentacio.js` llig `--name-status` i una regla pot declarar
  `"nomes_naixement_o_mort": true`: només compten els estats `A`, `D`, `R` i `C`.
  - **El defecte no era el criteri sinó que el criteri no es podia expressar.** Mesurat sobre els
    160 commits d'este repositori: 54 toquen un `(ua|gen)-*/SKILL.md` i només **14** són naixements
    o morts reals. Comptant les dos regles senceres -que també cobrixen `hooks-plantilla/`,
    `commands/` i `agents/`-, **73 commits acusats abans i 27 després: 46 acusacions que la `_nota`
    deia que no s'havien de produir**. La predicció de la `_nota` ja s'havia complit dues voltes:
    `8bd85aa` va editar dotze `SKILL.md` sense tocar el marc referencial ni posar `[no-doc]` i el
    guardia es va absorbir en silenci, i el commit de `ua-review` 1.3.0 es va haver de resoldre amb
    un `[no-doc]` justificat.
  - **La clau només l'obeïx qui bloqueja, i eixa asimetria és el punt.** `comprova-frescor.js`
    l'ignora a propòsit: per a ell que el catàleg es moga molt sense que el marc referencial es
    toque **és el senyal que busca** -és el motiu pel qual la regla inversa existix (el mes de
    deriva de la 1.21.0). Estrényer-la per als dos consumidors alhora hauria tornat a encegar el
    detector de rançor mentre s'arreglava el guardia. Els fixtures cobrixen les dos direccions.
  - **`proves/`: `esborra` als casos** (42 casos, abans 38). Sense poder eliminar un fitxer del
    commit base, la branca `D` de la regla no es podia expressar en un fixture i hauria arribat
    escrita però no provada.
  - **Comprovat contra els seus modes de fallada**, en una còpia del directori: amb la versió
    anterior del check, el cas positiu nou falla (acusa una edició de cos); simulant que
    `comprova-frescor.js` també obeïx la clau, el seu cas negatiu falla (es queda mut). Amb
    l'arreglo, 42/42.
- **1.22.0 — 2026-08-24** — **La severitat de cada check passa a ser una declaració revisable**
  (README § "Naixen en avís"). Fins ara, que un check bloquejara o només avisara es decidia
  escrivint `process.exit(1)` o no escrivint-lo: una línia enmig d'un `.js`, sense revisió, sense
  criteri i sense rastre. Ara cada fitxer de `proves/casos/` declara `bloqueja: true|false` i
  **l'executor no se'l creu** -si diu que bloqueja, algun cas ha d'acabar en codi 1; si diu que està
  en avís, algun cas negatiu ha de provar que parla amb codi 0. Promocionar un check és canviar eixa
  línia, i el canvi apareix al diff del PR.
  - **La regla de govern que hi ha darrere**: cap mecanisme naix bloquejant, i la promoció exigix el parell de casos (ja mecànic des
    de la 1.21.0), rodatge en avís sobre faena real sense fals positiu, i que això quede escrit a
    l'entrada de `VERSION.md` que la fa. Amb 15 programadors, un check que estrena els seus falsos
    positius damunt de la faena de tothom no s'acaba corregint: s'acaba llevant del job, i se n'endú
    els altres huit.
  - **El segon control és el que aporta de veres.** Exigir un cas amb codi 1 als checks bloquejants
    és barat; exigir a un check en mode avís que demostre que **parla** tapa el forat pel qual
    `comprova-frescor.js` va poder comptar 0 durant tota la seua vida. Un mecanisme que no bloqueja
    i del qual només es mira l'`exit code` passa en verd estiga mut o no.
  - **Estat inicial declarat**: set checks `bloqueja: true` (`valida-skill`, `comprova-documentacio`,
    `comprova-tokens-hardcoded`, `valida-documentacio`, `comprova-secrets`, `comprova-antipatrons`,
    `comprova-recompte-skills`) i dos `false` (`comprova-frescor`, `comprova-desfasament`). Els set
    van nàixer bloquejant abans que la regla existira i **no es degraden**: ja porten el rodatge que
    la regla demana. `--warn` i `--strict` no entren en este camp -són la tria del projecte
    consumidor per a la seua CI, no la severitat d'origen.
  - **Comprovat contra els tres modes de fallada** abans de donar-ho per fet, en una còpia del
    directori: llevar la declaració, declarar bloquejant un check que no bloqueja mai
    (`comprova-frescor`), i declarar en avís un que sí bloqueja (`valida-skill`). Els tres fan
    fallar `npm test` amb el motiu escrit; la còpia intacta continua en 38/38.
- **1.21.0 — 2026-08-24** — **`proves/`: control positiu i negatiu per als nou checks** (38 casos,
  `npm test`). Fins ara cap check havia demostrat mai que sabia fallar: no hi havia ni un fixture, i
  la seua correcció arribava sempre per la mateixa via -algú l'usava i veia que mentia. Cada fitxer
  de `proves/casos/` ha de portar, com a mínim, un cas positiu i un de negatiu; si en falta un dels
  dos, l'executor falla, perquè la cobertura és part de la prova. Cada cas corre en un repositori git
  temporal, de manera que els fixtures no viuen al disc com a fitxers escanejables i cap check pot
  acusar-se a si mateix amb el material de les seues proves.
  - **Es va assertar sobre l'eixida i no només sobre l'`exit code`**, i eixa decisió és la que va
    trobar el defecte: tres dels nou checks no bloquegen mai per disseny, o siga que per a ells "ha
    fallat" vol dir "ha avisat".
  - **Correcció a `comprova-frescor.js` (el defecte que va destapar el control negatiu)**: comptava
    **0 commits** sobre una història amb tres commits que sí tocaven el codi. `git log --format=%H
--name-only` separa el hash de la llista de fitxers amb una línia en blanc, però els commits
    entre si només amb un salt de línia; tallar l'eixida per `\n\n` desalineava els blocs, el
    `slice(1)` es menjava el **primer fitxer de cada commit** i un commit d'un sol fitxer es tornava
    invisible. Ara el format porta un marcador (`--format=@@%H`) que delimita els commits de veres.
    **Abast real mesurat, per a no sobreestimar-lo**: sobre els últims 88 commits d'este repositori,
    **cap de les 15 regles del `docmap.json` canvia de recompte** -ací els commits toquen molts
    fitxers i el desalineament no perdia la coincidència. On pica és al consumidor, on un commit
    normal toca un `.cs` i prou: allí el check estava mut i deia "cap senyal de documentació
    rançosa". Patch de comportament dins d'un minor: un projecte pot vore avisos que abans no eixien,
    i eixe és exactament el punt.
  - **`comprova-secrets.js`**: `ci-plantilla/proves/` entra a l'`EXEMPT`, pel mateix motiu pel qual
    el script ja s'hi exemptava a si mateix. Comprovat abans d'afegir-la que sense l'excepció el
    check acusa els seus propis controls negatius (2 troballes). El patró no s'ancora a l'arrel
    perquè al consumidor la carpeta viu a `ci-plantilla/` i al catàleg a `kit-si-ua/ci-plantilla/`.
  - **`README.md` de la carpeta: la taula passa de set files a nou.** `comprova-recompte-skills.js`
    (1.1.0) i `comprova-desfasament.js` (1.1.0) portaven set versions fora de la llista sense deixar
    de ser checks -i el que queda fora de la llista és el que ningú torna a mirar. Els documents que
    remeten a eixa taula com a llista viva (`ONBOARDING-PROGRAMADOR.md`,
    `onboarding/references/kit-si-ua.md`) actualitzats a la vegada.
- **1.20.0 — 2026-08-23** — `comprova-recompte-skills.js` escaneja també els documents d'entrada
  que **sí es publiquen** (`README.md`, `ONBOARDING-PROGRAMADOR.md`/`.html`), no només
  `marc-referencial/`. El motiu és una troballa de la revisió del marc referencial: `README.md`
  § "Estructura del Repositorio" deia «los 29 skills» -exactament la deriva silenciosa que el
  marcador `data-recompte` es va inventar per a evitar-, però estava fora de l'abast del check.
  Posar-hi un marcador sense ampliar l'abast hauria sigut pitjor que la xifra pelada: pareix
  guardat i no ho està. Verificat amb control negatiu (un `27` fals a `README.md` fa `exit 1`).
  Els fitxers que no existixen s'ignoren, així que un consumidor no nota res.
  - Mateixa versió, `README.md` de la carpeta: la taula dels set checks encara deia que
    l'equivalent local de `comprova-documentacio.js` és un «hook d'agent Haiku sobre `git commit`»,
    retirat el 2026-08-06 per fallar tancat. Ara diu el que hi ha (`comprova-docmap-commit.js`,
    determinista, `PostToolUse`, avisa i mai bloqueja), i el paràgraf de sota deixa de contraposar
    «agent que raona» vs. «CI determinista» -els dos costats són deterministes des de llavors; el
    que els distingix és qui té autoritat per a bloquejar.
- **1.19.0 — 2026-08-22** — `suggereix-skills.js` imprimix cada regla **un sol cop per sessió**. El
  hook dispara a cada `Write|Edit`, i el que imprimix entra a la conversa com a `additionalContext`:
  no és una notificació que passa, és text que es queda i es reenvia en cada torn posterior fins al
  final de la sessió. Una tasca que toque vint fitxers .NET repetia vint voltes el mateix
  recordatori de 322 caràcters -~1.600 tokens residents- sense afegir informació, perquè l'agent ja
  havia decidit la primera volta si atendre'l. La consulta es fa contra el registre de disparadors
  per (regla, sessió), abans d'escriure-hi la línia nova. Sense `session_id` s'imprimix com sempre
  (perdre un suggeriment és pitjor que repetir-lo). **La telemetria no perd res**: es continuen
  registrant totes les disparades i `ocasions()` ja les agrupava per (regla, fitxer, sessió) amb un
  comptador de `repeticions`, de manera que `--informe` dona els mateixos números que abans. Minor:
  canvia l'eixida del hook, no la seua interfície.
- **1.18.0 — 2026-08-16** — `comprova-secrets.js`: el patró d'"assignació de clau/contrasenya amb
  valor literal" cobrix ara tres casos que se li escapaven. (1) **Afixos amb separador**: exigia que
  la paraula clau anara seguida directament de `[:=]`, de manera que
  `const AWS_SECRET_ACCESS_KEY = "wJalr…"` -la forma normal d'una variable d'entorn- passava net.
  Ara accepta prefix i sufix units per `_`/`-`, i com que el separador és obligatori,
  `tokenizer = "…"` continua sense disparar. (2) **Clau citada de JSON** (`"api_key": "…"`): la
  cometa de tancament s'interposava entre la paraula clau i els dos punts, i no la detectava cap
  versió anterior. (3) **`(?<!data-)`** per a no marcar atributs HTML/DOM (`data-token="…"`): esta
  correcció ja existia a la còpia de `ua-ds-fusio` -que va per la 1.10.0- i **mai va tornar al
  catàleg**, així que ací s'han donat falsos positius durant set versions mentre el consumidor ja
  no en tenia. És la deriva que el README § "Mantindre-ho sincronitzat" adverteix, vista al revés
  del que s'espera: la còpia per davant de l'original. Detectat validant la política de permisos a
  `ua-ds-fusio` el 2026-08-16, on `comprova-secrets-commit.sh` va deixar passar una clau AWS
  literal. **Bump minor**: el script detecta més que abans i no canvia la seua interfície, però
  compta que un `--staged` o un pas de CI que fins ara anava verd pot posar-se roig amb codi que
  no has tocat.
- **1.17.0 — 2026-08-16** — `comprova-antipatrons.js` detecta els errors engolits d'`ESTANDARDS.md`
  §12: `catch` buit, `catch` que retorna `null`/`default`, i `EXCEPTION WHEN OTHERS THEN NULL` en
  PL/SQL. Van sobre una passada nova a nivell de fitxer -la que hi havia és per línia, i un `catch`
  buit ocupa dos o tres línies per definició, de manera que no el veia mai. És la primera vegada que
  un patró d'este script cita `ESTANDARDS.md` en lloc d'un skill: §12 i §8 no pengen de cap skill
  concret. Minor -ampliació d'un check existent, cap contracte nou. **En un legacy pot fer roig el
  primer PR**: la via d'escapament és `--warn`, com per a la resta d'errors d'este check.

- **1.16.1 — 2026-08-12** — `comprova-documentacio.js`: `regla.documentacio.some(doc =>
changed.includes(doc))` comparava per igualtat exacta, així que cap entrada de `documentacio`
  acabada en `/` (un directori, p. ex. `docs/componentes/catalogo/`) es podia satisfer mai -cap
  fitxer del diff es diu literalment igual que un directori. Detectat a `ua-ds-fusio`: la regla
  "catàleg de la demo" fallava fins i tot en el commit que sí afegia els `.md` correctes dins
  d'eixe directori. Ara una entrada acabada en `/` es tracta com a prefix -mateixa lògica que ja
  portava el hook local d'agent (`hook-documentacio-commit.snippet.json`, Pas 4 del seu prompt),
  mai heretada pel script determinista. **Patch**: no canvia cap opció ni el format de l'eixida,
  només fa que la regla directori funcione com sempre s'havia documentat que feia.
- **1.16.0 — 2026-08-06** — `analitza-registre-errors.js` s'adapta a l'auditoria en lot
  (hooks-plantilla 4.0.0) amb dos canvis, tots dos necessaris perquè el pilot continue sent
  mesurable:
  - **Compta `via: auditoria` com a observador independent**, no només `via: hook`. La comanda
    `/ua-skills:auditoria` que va substituir el hook d'agent escriu `via: auditoria`; amb el
    recompte antic, les seues entrades queien al mateix sac que les de l'agent principal i la
    mesura del biaix -que és tota la raó de ser d'un observador a banda- s'hauria mort en silenci.
    L'eixida passa a desglossar totes les vies (`agent-principal` inclòs). El `--json` conserva
    `viaHook` com a subconjunt de `viaAuditor`, per compatibilitat.
  - **Secció nova "Cua d'auditoria"**: llig `.claude/auditoria-pendents.log` i
    `.claude/auditoria-sessions.log` i diu quants torns queden per auditar, en quantes sessions i
    des de quan. Des que `revisada` la produïx una persona i no un hook, «cap entrada nova» pot
    voler dir «ningú ha executat `/ua-skills:auditoria`»; sense esta xifra, l'informe no distingix
    eixe cas de «no va passar res», que és el forat que `marca-auditoria.sh` ja va considerar
    inacceptable un nivell més avall. Mentres hi haja cua, el criteri §C1 s'imprimix marcat com a
    no concloent. El filtre és **per torn** (mateixa regla que el pas 2 de la comanda), reimplementat
    en Node perquè l'`awk` original no corre igual a totes les plataformes.
  - Opció nova `--claude <dir>` per a apuntar a un `.claude/` que no siga el del directori actual.
    **Bump minor**: cap opció existent canvia de significat.
- **1.15.0 — 2026-08-05** — script nou `analitza-registre-errors.js`: la versió en Node de les
  ordres `grep` que `REGISTRE-ERRORS.plantilla.md` § "Anàlisi final" ja documentava -total
  d'entrades, desglossament per `tipus` i per `detecta`, i el criteri del pilot (≥15 entrades, ≥40%
  `detecta: persona`). Existix a banda perquè eixes ordres depenien de bash/grep i el command nou
  `/telemetria` (commands/telemetria.md) ha de funcionar igual en qualsevol plataforma. Sense
  `REGISTRE-ERRORS.md` al projecte, no fa res -mateix criteri que la resta de checks d'esta carpeta.
  **Bump minor**: script nou, cap canvi als existents.
- **1.14.1 — 2026-08-05** — `suggereix-skills.js` comparava les regles del `skillmap.json` contra la
  ruta **absoluta** que li passa el hook, de manera que qualsevol patró ancorat amb `^` no encaixava
  mai. Els mapes escrits seguint `skillmap.exemple.json` -que ancora totes les regles
  (`^src/Backend/.*\.cs$`)- estaven **morts sencers**, i el hook callava sense que res ho delatara.
  Detectat en instal·lar la telemetria a `ua-ds-fusio`, on les cinc regles estan ancorades i cap
  havia disparat mai. Ara la ruta es relativitza a l'arrel del projecte abans de comparar (i si el
  fitxer cau fora, es compara la sencera, com abans). Efecte lateral: el `{{fitxer}}` dels missatges
  ix relatiu i no amb la ruta del disc de qui treballa. **Patch**: no canvia cap opció ni cap
  contracte -fa el que el fitxer ja documentava que feia.
- **1.14.0 — 2026-08-05** — `registre-disparadors.js` guanya dos ordes per a poder **contrastar
  dades entre projectes i màquines**, cosa que fins ara no es podia fer: el `.jsonl` local no ix
  mai de la màquina (porta rutes absolutes del disc de qui treballa). `exporta-sessio <sessio>`
  -que crida el hook `SessionEnd` nou de `hooks-plantilla/`- deixa un informe d'eixa sessió a
  `~/.claude/telemetria-ua/<projecte>/AAAA-MM-DD-<sessio>.jsonl`, fora dels repositoris, amb camps
  enumerats (`ts`, `tipus`, `regla`, `skill`/`skills`, `fitxer`, `sessio`) i rutes relatives al
  projecte -si el fitxer editat cau fora, només se'n guarda el nom. `--exporta` fusiona tot el de
  la màquina en un `telemetria-<maquina>-<data>.jsonl` llest per a entregar al coordinador de
  qualitat quan el demane. La selecció de camps es fa **en escriure**, no en exportar: el fitxer
  entregable no existix mai en forma bruta. Reescriure l'informe de sessió sencer (en compte
  d'afegir-hi) el fa idempotent si el hook dispara dos voltes. **Bump minor**: ordes noves, res
  canvia per a qui només use `--informe`; `UA_REGISTRE_DISPARADORS=0` apaga també esta part i
  `UA_TELEMETRIA=<ruta>` reubica el directori.
- **1.13.0 — 2026-08-04** — `registre-disparadors.js --informe`: la unitat passa a ser l'**ocasió**
  (parell regla/fitxer/sessió) en compte de l'esdeveniment brut, i un suggeriment no seguit es
  desglossa en `altre skill` vs. `cap invocació`. Motiu: la primera execució real de l'informe en
  este repositori va donar "25 suggeriments, 0 seguits, regla candidata a llevar" quan les dades
  eren 2 ocasions en 2 sessions sense cap invocació d'skill -el hook dispara a cada edició del
  mateix fitxer, i comptar el brut inflava el soroll ~8x. Ara només s'acusa una regla quan en eixa
  sessió es va invocar un altre skill (hi havia conducta i el mapa no l'encertà); un 0% fet només
  de sessions sense cap invocació es reporta com a **no concloent**, amb un avís de mida de mostra
  per davall de 10 sessions. Camps nous al `--json`: `total.esdeveniments`, `total.sessions`,
  `regles[].esdeveniments`, `regles[].altreSkill`, `regles[].capInvocacio`. Els existents no
  canvien de nom ni de significat, llevat de `regles[].suggeriments`, que ara compta ocasions.
- **1.12.0 — 2026-08-03** — check nou `comprova-antipatrons.js`: detecta patrons de fora de la UA
  en els `.cs`/`.pks`/`.pkb`/`.sql` canviats -`IExceptionHandler`, `ProblemDetails` com a flux
  central (no `ValidationProblemDetails`, que sí que és el contracte de validació), llibreries del
  patró `Result`, `ClaseOracleBD3` usat com a tipus C# quan els tipus reals són
  `ClaseOracleBd`/`IClaseOracleBd`, Dapper/EF Core (avís), i `RAISE_APPLICATION_ERROR` amb codi fora
  de -20000..-20999 o amb un nombre senar de `#`. És l'invers de la resta de checks: no verifica que
  es complisca una regla de la UA, detecta que s'ha aplicat una convenció de fora -el mode de fallada
  característic d'un model d'IA sobre una pila propietària. Cada patró cita la font que el prohibix;
  els que no en tenen cap d'escrita van marcats `avis` i mai bloquegen. `--warn` per a legacy.
  No s'afig a `qualitat.yml` d'este repositori: és un catàleg de documentació, no té codi .NET/Oracle
  (mateix criteri que `comprova-tokens-hardcoded.js`).
  També una regla nova al `docmap.json` d'este repositori: pujar la versió d'una plantilla del kit
  (`*/VERSION.md`) exigix una línia al `CHANGELOG.md`. Ancorada al `VERSION.md` i no a la carpeta
  sencera perquè només dispare quan hi ha un canvi de contracte de veres. Motiu: el PR del registre
  de disparadors va pujar `hooks-plantilla` a 3.0.0 sense entrada al changelog i cap check ho va
  detectar -la regla "contingut d'un skill" només cobria `*/SKILL.md` i `*/references/`.
- **1.11.1 — 2026-08-03** — regla nova al `docmap.json` **d'este repositori** (no a
  `docmap.exemple.json`, que és el mapa d'un projecte consumidor): un canvi al catàleg de hooks
  (`hooks-plantilla/`, tret de `README.md`/`VERSION.md`) exigix tocar les guies que els ofereixen
  (`ONBOARDING-PROGRAMADOR.md`, `onboarding/references/kit-si-ua.md`). Cap script canvia de
  comportament -patch. Motiu: la substitució de `suggest-dotnet-review.sh` per `suggest-skills.sh`
  (2.0.0, 2026-07-31) va deixar les dos guies oferint un fitxer inexistent durant tres dies sense
  que cap check ho detectara; les regles d'onboarding existents només cobrien la deriva entre
  `onboarding/` i `ONBOARDING-PROGRAMADOR.md`, no la que venia de `hooks-plantilla/`.
- **1.11.0 — 2026-08-03** — script nou `registre-disparadors.js`: mesura si el bucle del hook es
  tanca -quantes vegades una regla de `skillmap.json` suggerix un skill i quantes eixe skill
  s'invoca de veres després, correlacionat per sessió. `suggereix-skills.js` accepta ara un
  `session_id` opcional com a `argv[3]` (compatible cap enrere: sense ell suggerix igual, però el
  suggeriment no es pot correlacionar) i anota cada suggeriment; el hook parella
  `hooks-plantilla/registra-invocacio-skill.sh` anota cada invocació. `--informe` destaca els
  **forats del mapa** (skills invocats sense que cap regla els suggerira) i les regles mortes. No
  és un check de CI: no bloqueja, no corre a `qualitat.yml`. Telemetria local i gitignorada
  (`.claude/registre-disparadors.jsonl`), no una font de veritat -desactivable amb
  `UA_REGISTRE_DISPARADORS=0`. Cobrix la mancança "baseline M1/M2/M3 encara no mesurat"
  amb dades reals en lloc d'estimació.
- **1.10.0 — 2026-07-31** — script nou `suggereix-skills.js` (determinista, sense agent): llig un
  `file_path` i un mapa carpeta/patró → skills (`skillmap.json`, exemple a
  `skillmap.exemple.json`) i retorna el missatge de la primera regla que hi encaixe. No és un
  check de CI (no bloqueja, no corre a `qualitat.yml`) -és el consumidor del nou hook local
  `kit-si-ua/hooks-plantilla/suggest-skills.sh`, que substituïx els antics
  `suggest-dotnet-review.sh`/`suggest-ux-review.sh` (mapeig hardcodejat en bash). Mateix patró que
  `docmap.json` ja aplica al mapeig codi→documentació.
- **1.9.0 — 2026-07-30** — `valida-documentacio.js` emet avisos de govern (mai bloquegen, ni a N1):
  títol encara amb "(plantilla)" (fitxer no personalitzat), recompte de seccions "Pendent" sense
  omplir, i "Last-review" de fa més de 180 dies (mateix llindar que `valida-skill.js` per als
  `SKILL.md`). Troballa 🟡 de l'auditoria del kit (2026-07-30): l'únic mode de fallada real del
  kit -que ningú torne a estos fitxers als mesos- no es detectava.
- **1.8.0 — 2026-07-30** — `valida-documentacio.js` s'alinea amb el punt d'entrada neutre
  (`kit-projecte` 2.0.0): el fitxer de Nivell 1 comprovat és `CONTEXT-IA.md` (amb la comparació de
  capçaleres contra la seua plantilla), i `CLAUDE.md`/`AGENTS.md` es validen com a **punters** -han
  d'existir i anomenar `CONTEXT-IA.md`; un punter que no hi remet és fallada de N1, perquè deixa
  silenciosament sense context l'eina que el llig. Un projecte encara no migrat falla el N1 fins que
  aplique la migració descrita a `kit-projecte/VERSION.md` § 2.0.0.
- **1.7.0 — 2026-07-30** — `comprova-desfasament.js`: (a) cobrix també el kit de documentació de
  projecte, llegint el segell `docs/.kit-version` que estampa `kit-projecte/genera-kit.js` i
  comparant-lo amb `kit-projecte/VERSION.md` del catàleg -fins ara `kit-projecte/` era l'única
  carpeta distribuïble sense rastreig de versió; (b) **correcció**: buscava les carpetes font a
  l'arrel del clon (`<catàleg>/ci-plantilla/VERSION.md`), ruta que no existix des de la
  consolidació dins de `kit-si-ua/` (2026-07-22) -el check sempre responia "no trobat al catàleg".
  Ara prova `kit-si-ua/` primer i l'arrel com a compatibilitat amb clons antics.
- **1.6.0 — 2026-07-23** — script nou `instal·la-ci.js`: automatitza els passos 1-3 de
  "Com adoptar-ho" (còpia de la carpeta, estampat de `docmap.json` des de `docmap.exemple.json`,
  generació del job de CI segons proveïdor) amb pregunta interactiva quan `--ci`/`--legacy` no es
  passen com a flag. El pas 4 (adaptar el mapa de veres) es queda manual, per disseny. També dos
  regles noves al `docmap.json` real d'este repositori (no a l'exemple -és específic d'ací):
  detecten deriva entre `onboarding/SKILL.md`+`references/*.md` i `ONBOARDING-PROGRAMADOR.md` en
  qualsevol de les dos direccions, reaprofitant `comprova-documentacio.js`/`comprova-frescor.js`
  sense codi nou.
- **1.5.0 — 2026-07-23** — check nou `comprova-secrets.js`: detecta claus d'API, contrasenyes,
  claus privades, JWT i contrasenyes de cadena de connexió (Oracle/.NET) en fitxers canviats.
  Determinista, sense `--warn` (excepció legítima -un secret filtrat és un incident). Afegit a
  `qualitat.yml` (només PR). Equivalent local: `kit-si-ua/hooks-plantilla/comprova-secrets-commit.sh`.
- **1.4.0 — 2026-07-23** — `valida-skill.js` amplia l'allowlist de claus de frontmatter amb
  `disable-model-invocation` (skill nou `handoff`, primer del catàleg que la necessita).
- **1.3.0 — 2026-07-23** — `comprova-tokens-hardcoded.js` amplia amb els checks de moviment
  d'`ua-ux-moviment`: transicions/animacions sobre propietats que no són `transform`/`opacity`
  (layout shift) i fitxers amb `transition`/`animation`/`@keyframes` sense gestionar
  `prefers-reduced-motion`. Determinista (regex), mateix cost i mecanisme que la resta del script.
- **1.2.0 — 2026-07-23** — regla nova a `docmap.json`: versionat de `kit-si-ua/agents-plantilla/`.
- **1.1.1 — 2026-07-23** — corregides les rutes de `docmap.json` i del README, que encara
  apuntaven a `ci-plantilla/`/`hooks-plantilla/`/`kit-projecte/` arran de la migració a
  `kit-si-ua/` (4469008); sense canvi d'opcions ni eixida dels scripts.
- **1.1.0 — 2026-07-21** — nous `comprova-recompte-skills.js` (específic del repositori de treball,
  no distribuït) i `comprova-desfasament.js` (avís de còpia desfasada als consumidors); este
  `VERSION.md`.
- **1.0.0 — 2026-07-18/19** — versió inicial: els cinc checks + `docmap.json`.
