# ci-plantilla — la capa CI del pipeline UA

**Per què existix**: els hooks de
Claude Code viuen a la màquina de cada desenvolupador -qui no té l'entorn muntat se salta el
pipeline en silenci. Esta carpeta conté les mateixes comprovacions com a scripts Node executables
al servidor Git en cada PR: **els hooks locals són el feedback ràpid; la CI és la garantia.**

Tots els scripts són Node sense dependències (només `node` ≥16 i `git`), per a ser executables en
qualsevol runner sense instal·lar res.

## Els deu checks

| Script | Què comprova | Equivalent local | Punt de la DoD (ESTANDARDS.md §8) | Bloqueja |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --- | --- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| `valida-skill.js` | Frontmatter (`name`, `description`, `license`, `allowed-tools`, `metadata`, `compatibility`, `disable-model-invocation`), nom=carpeta, límits de description (error >1024, avís >450 -es carreguen totes a cada sessió), avís >150 línies; des de la 1.39.0, avís de les rutes `references/` que són d'un altre skill o no existixen; des de la 1.44.0, avís de les remissions `fitxer.md` § Secció a una secció que el fitxer ja no té i, des de la 1.51.0, avís de caràcters Unicode invisibles en els `.md` i `.yaml` de l'skill; des de la 1.71.0, error si una clau porta «: » o « #» sense cometes (YAML invàlid: l'eina no llig la `description`) | hook `validate-touched-skill.sh` (PostToolUse) | -(específic del repositori de skills) | Sí |
| `comprova-documentacio.js` | Codi documentation-worthy sense documentació al diff, amb bypass `[no-doc]` (obrint o tancant una línia; enmig d'una frase no compta) | `kit-si-ua/hooks-plantilla/comprova-docmap-commit.js` (determinista, `PostToolUse` sobre `git commit`: avisa, mai bloqueja). Va ser un hook d'agent Haiku fins al 2026-08-06 -fallava tancat- | Punt 2 | Sí |
| `comprova-tokens-hardcoded.js` | Colors/mides literals (`ua-vue-uacloud`) + transicions/animacions sobre propietats que no són `transform`/`opacity` i fitxers amb moviment sense `prefers-reduced-motion` (`ua-ux-moviment`) en fitxers frontend canviats; des de la 1.43.2 deixa fora els `*.packed.html` i `*.artifact.html` que genera `pack.mjs` (gen-html-plan), bundles amb el CSS del runtime inlineat, i des de la 1.51.3 els fitxers només reanomenats (`R100`), que no afigen cap línia | agent `token-auditor`; des del 2026-09-24, `kit-si-ua/hooks-plantilla/comprova-edicio.js` (`PostToolUse` sobre `Write\|Edit`, `--fitxer`; avisa, mai bloqueja) | Punt 1 (una troballa 🔴 típica) | Sí (`--warn` per a legacy) |
| `comprova-frescor.js` | Documentació no tocada mentre el seu codi acumula commits | -(no té equivalent local; és el mecanisme invers) | Senyal per al revisor | No (sempre avís) |
| `valida-documentacio.js` | El kit de documentació de projecte (`CONTEXT-IA.md`/`PROJECTE.md`/`DECISIONS.md`/`ESTANDARDS.md` de Nivell 1 a `doc-projecte/`, o a l'arrel en un kit anterior a kit-projecte 3.0.0, + els punters `CLAUDE.md`/`AGENTS.md`, que han d'anomenar la ruta real, generat per `kit-si-ua/kit-projecte/genera-kit.js`) existix i no ha divergit de la plantilla; avisa de cada document que hi ha als dos dissenys (≥1.50.0); a més (≥1.9.0), avisos de govern que mai bloquegen: títol encara amb "(plantilla)", recompte de seccions "Pendent", i "Last-review" de fa més de 180 dies | -(no té equivalent local; genera's una vegada amb `kit-si-ua/kit-projecte/`) | Punt 2 (l'estructura del kit, no el contingut de negoci) | Sí per a N1, avís per als companions de N1 i per a N2/N3 (i els tres avisos de govern, sempre) |
| `comprova-secrets.js` | Claus d'API, contrasenyes, claus privades, JWT i contrasenyes de cadena de connexió (Oracle/.NET) en fitxers canviats -determinista, sense `--warn` (un secret filtrat és un incident, no un estil). Des de la 1.18.0 la paraula clau pot dur afixos (`AWS_SECRET_ACCESS_KEY = "..."`) i pot vindre citada com a clau JSON (`"api_key": "..."`); els atributs `data-*` ja no compten. Des de la 1.25.1, un valor que comença per `${` (`"${GITHUB_TOKEN}"`, interpolació de variable d'entorn) compta com a placeholder, no com a secret. Des de la 1.43.1, un valor truncat amb punts suspensius (`"rt_9Hk2..."`) tampoc compta: un secret real no s'escriu elidit | `kit-si-ua/hooks-plantilla/comprova-secrets-commit.sh` (bypass `[secrets-ok]`) | -(seguretat transversal) | Sí |
| `comprova-antipatrons.js` | Patrons de fora de la UA en `.cs`/`.pks`/`.pkb`/`.sql` (i, des de la 1.37.0, `.vue`/`.ts` d'aplicació) canviats: `IExceptionHandler`, `ProblemDetails` com a flux central (`AddProblemDetails()`, `IProblemDetailsService`; el tipus en un controlador o test sí que val, des de la 1.37.0), llibreries externes del patró `Result`, `ClaseOracleBD3` usat com a tipus C#, Dapper/EF Core (avís), i `RAISE_APPLICATION_ERROR` amb codi fora de rang o `#` senar. Des de la 1.17.0, també els errors engolits d'`ESTANDARDS.md` §12: `catch` buit, `catch` que retorna `null`/`default`, i `EXCEPTION WHEN OTHERS THEN NULL` Des de la 1.37.0, sis regles escrites en avís (`naix`): `[Authorize]` amb cadena literal, valor interpolat al `WHERE` d'un `$"…"`, paràmetres OUT sense `tipoBd`/`tamano` o amb `DBNull.Value`, `fetch`/`axios` solts i `uaT()` en un `.vue`. Des de la 1.38.0, en avís, el comentari que substituïx codi (`// ... resto sin cambios`, §12). Des de la 1.39.0, en avís, el text visible literal al `<template>` d'un `.vue`. Des de la 1.47.0, en avís, el test que el canvi desactiva (`it.skip`, `[Fact(Skip =`...), només en les línies afegides; des de la 1.56.0, també el canvi que deixa menys declaracions de test de les que hi havia (un test llevat o un fitxer de test esborrat), només amb diff | `kit-si-ua/hooks-plantilla/comprova-edicio.js` (`PostToolUse` sobre `Write\|Edit`, des del 2026-09-24: li passa el fitxer editat amb `--fitxer`; avisa, mai bloqueja) | Punt 1 | Sí per als `error`, mai per als `avis` (`--warn` per a legacy) |
| `comprova-redaccio.js` | Des de la 1.41.0, en els fitxers de traduccions en valencià (`ca.json`, `va.json`, `ca-ES.json`, `ca-valencia.json`): terme a evitar en una etiqueta d'acció (columna «Evitar» de `ua-i18n-valencia/references/terminologia.md`), etiqueta buida, botó en infinitiu, longitud per tipus de text, codi HTTP visible, paraula administrativa genèrica i impersonal en futur (`ua-ux-redaccio`); des de la 1.42.0, també «este», incoatius en -ix i tractament de vosté. Les regles es llegixen de les taules dels skills cada vegada que s'executa (`--cataleg`, `UA_CATALEG` o el symlink `~/.claude/skills`); sense catàleg calla. El tipus de cada cadena es deduïx del nom de la clau | `kit-si-ua/hooks-plantilla/comprova-edicio.js` (`PostToolUse` sobre `Write\|Edit` d'un `ca.json`/`va.json`, `--fitxer`; avisa, mai bloqueja) | -(redacció UX i terminologia) | No (sempre avís: els pressupostos de longitud són orientatius pel propi skill) |
| `comprova-descripcio-mr.js` | Des de la 1.43.0, en la pipeline de PR: seccions de la plantilla sense omplir, llegides de `CI_MERGE_REQUEST_DESCRIPTION` en GitLab i, des de la 1.58.0, de l'API en Azure DevOps / TFS (si no pot llegir-la, ho avisa); les que acaben en `(opcional)` no avisen (1.47.0). Des de la 1.57.0, també la secció «Requisitos (RF)»: si el projecte té un PRD amb RF, que hi siga, amb els verbs fixos i RF que existixen al PRD i no estan retirats (en avís) | Jobs de GitLab i Azure d'`instal·la-ci.js` | -(procediment de branques, `ESTANDARDS.md` §9.3) | No (sempre avís) |
| `comprova-origen-mr.js` | Des de la 1.43.0: una PR a `Master` que no ve de `PREPRODUCCION` ni porta l'etiqueta `hotfix`. Si no pot llegir les etiquetes, no dona la PR per bona (1.58.0) | Jobs de GitLab i Azure d'`instal·la-ci.js`, amb `--warn` | -(procediment de branques, `ESTANDARDS.md` §9.3) | Sí sense `--warn`; naix amb `--warn` |
| `comprova-tracabilitat.js` | Des de la 1.46.0, a cada faena de `doc-projecte/producte/` (`docs/producte/` en un kit anterior a 3.0.0): RF citats per les specs o per la taula de tasques que el PRD no definix o té retirats, la fila d'una tasca que cita un RF que la seua spec diu que no cobrix, criteris d'acceptació sense `_Prova_:`, des de la 1.59.0 la taula «Entregues» del `pla.md` mal formada (tipus desconegut, construcció sense RF ni «Motiu: …», `E-NN` repetit, RF inexistent o retirat), i (avís) RF imprescindibles sense spec i RF sense prova. Des de la 1.64.0, avisa també del que hi és i no sap llegir (definicions de RF, «RF que cobrix», files d'«Entregues»), i amb cap RF llegit no diu que es corresponen. Vegeu «La traçabilitat del PRD a les specs» | -(no té equivalent local) | Punt 2 (els artefactes de producte) | No (naix en avís; `--strict` fa bloquejar els errors) |
| `comprova-unicode-invisible.js` | Des de la 1.51.0, en els fitxers d'instruccions canviats (`CLAUDE.md`, `AGENTS.md`, `CONTEXT-IA.md`, `SKILL.md`, `.mcp.json` i tot `.claude/`): caràcters que l'editor i el diff no mostren però que el model llig com a text -amplada zero, controls bidi, unió de paraules, un BOM enmig del text i _tag characters_-, amb fitxer, línia, columna i punt de codi. Els patrons viuen a `patrons-unicode.js`, que també carrega `valida-skill.js` | -(no té equivalent local) | -(seguretat de l'agent, `SEGURETAT.md` §6) | No (naix en avís; un U+200B pot ser legítim en una URL llarga) |
| `comprova-higiene.js` | Des de la 1.54.0, en els fitxers canviats: un fitxer **nou** de més de 500 KB (`--maxkb`), que Git guarda per sempre encara que s'esborre després; un marcador de conflicte (`<<<<<<<`, `                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |                                                                                                                                                                                               |                                                          |                                                                                                |     |     |     |`, `>>>>>>>`a principi de línia) en qualsevol fitxer de text -en un`.md`no el para res-; i un`.claude/settings\*.json`, `.mcp.json`, `docmap.json`o`skillmap.json`que no és JSON vàlid, que Claude Code se salta sencer amb els seus hooks i`permissions` | -(no té equivalent local) | Punt 6 (CI en verd) i `ESTANDARDS.md` §9.1 (el que no es desfà revertint) | No (naix en avís; un fitxer gran pot ser volgut) |
| `comprova-recompte-skills.js` | Que tota xifra de "total de skills" marcada amb `<span data-recompte="skills">N</span>` -als documents de `marc-referencial/` i, des de la 1.20.0, als documents d'entrada publicats (`README.md`, `ONBOARDING-PROGRAMADOR.md`/`.html`)- coincidix amb el recompte real de carpetes `ua-*` amb `SKILL.md`. Que no en quede cap també falla: és l'esborrat silenciós del contracte | -(específic del repositori de skills; en un projecte consumidor no hi ha cap catàleg a comptar) | -(governança del catàleg) | Sí |
| `comprova-desfasament.js` | Si les còpies locals de `ci-plantilla/`, `hooks-plantilla/` i del kit de documentació (`doc-projecte/.kit-version`, o `docs/.kit-version`) han quedat darrere del catàleg, comparant la línia `versio:` del `VERSION.md`; i si els hooks adoptats a `.claude/hooks/` difereixen dels del catàleg, comparant-ne el contingut. Des de la 1.62.0, també si un script del catàleg copiat a `.claude/hooks/` no el nomena cap `.claude/settings*.json` (no corre mai), o si una entrada apunta a un script que no existix (falla a cada crida i deixa passar l'acció); estos dos no compten per a `--strict`. Des de la 1.68.0, també si el `skillmap.json` del projecte suggerix un skill `ua-*`/`gen-*` que el catàleg ja no té o que l'agent no pot carregar (`disable-model-invocation`); tampoc compta per a `--strict`. Des de la 1.69.0, també si un hook de `.claude/settings*.json` es crida amb ruta relativa i sense `$CLAUDE_PROJECT_DIR`: després d'un `cd` a una subcarpeta falla en silenci | -(és el check que corre **al** consumidor, contra un clon del catàleg) | -(manteniment de la còpia) | No (avís; `--strict` el fa bloquejant) |

Les dos últimes files van estar fora d'esta taula fins a la 1.21.0 -eren checks de ple dret que
ningú comptava, i el que queda fora de la llista és el que ningú torna a mirar.

`novetats.js`, `fitxers.js`, `patrons-secrets.js`, `patrons-unicode.js`, `producte.js`, `disseny-kit.js`, `patrons-dades-personals.js` i `hooks-connectats.js` no són checks
i per això no ixen a la taula: són **mòduls** que els checks carreguen (titulars de versió el
primer, llista de fitxers el segon, els patrons de secret que comparteixen `comprova-secrets.js` i
el hook `oculta-secrets-eixida.js` de `hooks-plantilla/` el tercer, els caràcters invisibles que
comparteixen `comprova-unicode-invisible.js` i `valida-skill.js` el quart, el lector del PRD i les specs
que comparteixen `comprova-tracabilitat.js`, `compta-factors.js` i `calibratge.js` el cinqué, i on viu el kit de
documentació dins del projecte -`doc-projecte/` o l'arrel- el sisé, i els DNI/NIE que comparteixen
els hooks `revisa-prompt.js` i `oculta-secrets-eixida.js` el seté, i quins scripts de `.claude/hooks/` connecta el `settings.json` -que comparteixen `comprova-desfasament.js` i `registre-disparadors.js`- l'huité). Es copien a la teua
còpia com la resta, però no s'executen sols ni tenen sentit al job de CI. Tampoc hi són
`registre-disparadors.js`, `analitza-registre-errors.js`, `suggereix-skills.js`,
`marques-de-temps.js`, `temps-sessio.js`, `compta-factors.js`, `calibratge.js` ni `exporta-entregues.js`: són **informes** que s'executen a mà o des d'un hook,
no comprovacions que puguen posar un PR en roig -cada un té la seua secció més avall.
**`comprova-recompte-skills.js` no arriba a la teua còpia**: és específic del repositori que manté
el catàleg de skills, i en un projecte no hi ha cap catàleg a comptar. Apareix ací per a que la
taula siga la llista completa i no una llista parcial que després ningú sap si ho és.

La diferència amb el hook local de documentació **ja no és determinisme sinó autoritat**: des del
2026-08-06 els dos costats són deterministes i lligen el mateix `docmap.json`, però el hook avisa
sobre un commit ja fet i el check de CI **bloqueja** al PR. És l'aplicació del principi de la
4.0.0: el que pot bloquejar ha de ser determinista, i el que corre sense ningú mirant no ha de
poder parar la faena. El mapa és el mateix coneixement en els dos llocs -viu en un JSON pla, no en
l'eina (norma de portabilitat del catàleg).

Una entrada de `documentacio` acabada en `/` es tracta com un directori: es compta com a canviada
si **qualsevol** fitxer del diff hi penja (prefix), no per igualtat exacta -cap fitxer del diff mai
es diu literalment igual que un directori. Corregit a 1.16.1: fins llavors, cap regla amb un
directori sol com a `documentacio` es podia satisfer mai (`kit-si-ua/ci-plantilla/VERSION.md`).

### Regles d'esdeveniment estructural (`nomes_naixement_o_mort`)

Una regla pot declarar `"nomes_naixement_o_mort": true`. Llavors els seus patrons de `codi` només
compten quan el fitxer **naix o mor** -estat `A`, `D`, `R` o `C` del `git diff --name-status`-, no
quan només se n'edita el cos (`M`, `T`). El renombrament hi entra perquè una peça que canvia de
carpeta és una mort i un naixement, i git ho reporta amb una sola línia `R`.

És per a les regles que responen a un **inventari**, no a un contingut: "si el catàleg de skills
canvia, el document que el llista ha de canviar amb ell". Sense la clau, eixa regla acusa cada
edició del cos d'un `SKILL.md` ja existent -sobre la història d'este repositori, **46 commits
acusats sense motiu**- i el guardia es torna soroll que algú acaba apagant. La clau és opcional i
per defecte val `false`: els mapes que no la porten es comporten exactament com abans.

Quan una regla estructural es calla per este motiu, **ho diu** (`· Regla "…": només conta
naixements i morts…`). Una regla que calla en silenci és indistingible d'una regla morta, que és
com el guardia del marc referencial es va passar un mes en verd sense mirar res.

**`comprova-frescor.js` ignora la clau a propòsit**, i això no és un descuit: els dos consumidors
del mateix mapa no volen el mateix llindar. Qui bloqueja ha de callar davant d'una edició de cos;
el detector de rançor busca precisament que el codi es moga molt sense que la documentació es
toque, o siga que per a ell les edicions de cos són el senyal, no el soroll. És la mateixa
distinció que la regla de govern fixa per a la severitat -bloquejar i avisar no volen el mateix
llindar-, ara aplicada a l'abast d'una regla. Els fixtures de `proves/casos/` cobrixen les dos
direccions: que el check no acuse una edició de cos, i que el detector de rançor la continue
comptant.

Copia `docmap.exemple.json` com a `docmap.json` a l'arrel del teu projecte i adapta-hi els patrons:
eixe fitxer és el mapa d'un projecte consumidor, no el d'este catàleg. Les rutes d'este README
assumixen que la carpeta viu a `kit-si-ua/ci-plantilla/` dins del projecte; `qualitat.yml` invoca
els scripts com `node kit-si-ua/ci-plantilla/<script>.js`.

**No és un check de CI** (no bloqueja, no corre a `qualitat.yml`): `suggereix-skills.js` +
`skillmap.exemple.json` són el motor de dades del hook local
`kit-si-ua/hooks-plantilla/suggest-skills.sh` -donat un fitxer tocat, retorna quin(s) skill(s) UA
recorda (p. ex. `.cs` dins de `src/Backend/` → `ua-dotnet-errores`), llegint un mapa carpeta/patró
(`skillmap.json`, adoptat des de `skillmap.exemple.json`) en lloc de portar-lo hardcodejat al
script, mateix mecanisme que `docmap.json` ja aplica al hook de documentació. Substituïx els
antics `suggest-dotnet-review.sh`/`suggest-ux-review.sh` (README de `hooks-plantilla/` § 2.0.0).

**Cada regla s'imprimix un sol cop per sessió** (des de la 1.19.0). El hook dispara a cada
`Write|Edit`, però el que imprimix no és una notificació que passa: entra a la conversa com a
`additionalContext` i s'hi queda, reenviant-se en cada torn posterior. Repetir el mateix recordatori
en cada fitxer d'una tanda no afig res -l'agent ja ha decidit la primera volta- i sí que ocupa
context. La consulta es fa per (regla, sessió) contra el registre de disparadors, **abans**
d'escriure-hi la línia nova; sense `session_id` s'imprimix sempre, perquè perdre un suggeriment és
pitjor que repetir-lo. El registre continua anotant totes les disparades: `ocasions()` ja les
agrupava per (regla, fitxer, sessió) amb comptador de `repeticions`, així que `--informe` no canvia.

Els patrons de `codi`/`exclou` es comparen contra la ruta **relativa a l'arrel del projecte**
(`packages/componentes/src/Taula.vue`), no contra la del disc. Per això les regles s'ancoren amb
`^` sense por -fins a la v1.14.1 es comparaven contra la ruta absoluta i cap regla ancorada
encaixava mai, de manera que un mapa sencer podia estar mort sense que res ho delatara.

**Per què `comprova-antipatrons.js` és l'invers de la resta**: els altres checks verifiquen que es
complix una regla de la UA. Este detecta que s'ha aplicat una convenció **de fora** -el mode de
fallada característic d'un model d'IA sobre una pila propietària no és ignorar les regles, és caure
en el patró majoritari del codi públic amb què s'ha entrenat (`IExceptionHandler` en lloc
d'`ErrorHandlerMiddleware`, `AddProblemDetails()` en lloc de `BDException`, Dapper en lloc
d'`IClaseOracleBd`). Cada patró cita la font que el prohibix, i el que no té una prohibició escrita
en cap skill va marcat com a `avis` i **mai bloqueja** -no s'inventen regles ací: la font de veritat
és el skill o `ESTANDARDS.md`, l'script només l'aplica. Limitació coneguda: només descarta comentaris
de línia, no de bloc ni literals de cadena, i no detecta un `RAISE_APPLICATION_ERROR` partit en
diverses línies.

**Els errors engolits es revisen sobre el fitxer, no línia a línia** (des de la 1.17.0): un `catch`
buit ocupa dos o tres línies per definició, així que la passada per línia no el veu mai. Un `catch`
que només conté un comentari **sí** que es reporta -documentar per què s'ignora un error no és
gestionar-lo, i l'excepció s'engolix igual. El que no es reporta és una línia sencera comentada que
continga el patró. Els altres dos punts d'`ESTANDARDS.md` §12 (bucles sense sostre, recursos no
tancats a la branca d'error) **no** tenen detector a propòsit: no es distingixen per regex d'un cas
correcte, i un check sorollós s'acaba desactivant.

**Tampoc és un check de CI**: `registre-disparadors.js` mesura si el bucle del hook es tanca -és
a dir, si els skills que `skillmap.json` recorda s'acaben invocant de veres. `suggereix-skills.js`
anota cada suggeriment i el hook parella `registra-invocacio-skill.sh` anota cada invocació real
d'un skill que fa el model. Les que escriu la persona (`/handoff`) no passen per l'eina `Skill`: les
afig `exporta-sessio.sh` en tancar la sessió, amb `completa-sessio <sessio> <transcripcio.jsonl>`,
que només hi posa la diferència i les marca `via: orde`. L'informe els correlaciona per sessió:

```
node kit-si-ua/ci-plantilla/registre-disparadors.js --informe        # llegible
node kit-si-ua/ci-plantilla/registre-disparadors.js --informe --json  # per a agregar
```

Els hooks que paren un cas rar i car (els de secrets, `bloqueja-main.sh`, `revisa-prompt.js` i,
des de la 1.66.0, `guarda-shell.js`) ixen a l'informe com a «xarxa»: zero actuacions és el que
s'espera d'ells, i no reben mai «retirar?».

Les proves de hooks poden deixar fitxers sense commitejar a l'arbre del cas (`pendents`, des de la
1.67.0): és el que necessita l'avís de git de `guarda-shell.js`.

`proves/cadena-ci.js` comprova, des de la 1.67.1, que `instal·la-ci.js` copia tots els scripts que
nomenen els hooks i `genera-kit.js`, i els que es requerixen entre ells: si n'afiges un a la
carpeta i algú el crida, l'has d'afegir també a la llista de l'instal·lador. I, des de la 1.67.2, que els mapes de skills del catàleg
nomenen només skills que existixen i que l'agent pot carregar.

L'informe respon tres preguntes que fins ara no es podien respondre amb dades:

| Senyal                                        | Què significa                                                         |
| --------------------------------------------- | --------------------------------------------------------------------- |
| Regla amb moltes ocasions i **`altre skill`** | El recordatori és soroll: hi havia conducta i el mapa no l'encertà    |
| Skill invocat sense suggeriment previ         | **Forat del mapa**: falta una regla a `skillmap.json` que el cobrisca |
| Regla que no dispara mai                      | Patró mort -sobra, o el projecte no té eixos fitxers                  |
| Regla amb 0% fet només de **`cap invocació`** | **No concloent**: falta població, no és cap defecte de la regla       |

Dos precisions que canvien com es llig la taula, totes dos de la v1.13.0:

- La unitat és l'**ocasió** -un parell (regla, fitxer, sessió)-, no l'esdeveniment brut. El hook
  dispara a cada edició, així que tornar tres voltes al mateix component inflava el recompte sense
  que hi haguera tres decisions. L'informe mostra les dos xifres.
- Un suggeriment no seguit es desglossa en `altre skill` (en la sessió se n'invocà un altre) i
  `cap invocació` (no se n'invocà cap). Només el primer acusa la regla. Un 0% fet de `cap
invocació` vol dir que la mostra no serveix, i l'informe ho diu explícitament en compte de
  llistar la regla com a morta.

El registre és **telemetria local, no una font de veritat** (P2 del kit: zero fonts noves):
`.claude/registre-disparadors.jsonl`, gitignorat, per màquina i esborrable -si es perd es torna a
omplir sol, i cap decisió del pipeline en depén. No s'imprimix res al context de l'agent, per tant
no té cost de tokens. Es desactiva amb `UA_REGISTRE_DISPARADORS=0`; es reubica posant-hi una ruta.

### Hooks que avisen o bloquegen (1.55.0)

El mateix registre anota, des de `hooks-plantilla` 5.28.0, què fa cada hook que avisa, bloqueja o
oculta: una línia per actuació (`avis`, `bloqueig`, `oculta`, `bypass`) i una línia `present` la
primera vegada que calla en cada sessió on ha tingut ocasió d'actuar. Els hooks `.js` criden
`registraHook(hook, resultat, dades)`; els `.sh`, la CLI:

```sh
printf '%s' "$input" | node ci-plantilla/registre-disparadors.js hook <hook> <resultat> - [fitxer] [regla]
```

(`-` com a sessió: la llig del JSON de l'esdeveniment, sense tocar el parser del hook.)

`--informe` hi afig la secció «Hooks que avisen o bloquegen», amb una lectura per hook en els tres
termes de la decisió que el motiva: **retirar?** (present en 10 sessions o més i cap actuació; mai
per a les xarxes de seguretat de secrets, de branca i del prompt), **modificar?** (algun bypass, o la mateixa
actuació repetida sobre el mateix fitxer en una sessió) i **estendre?** (actua en 10 sessions o més
sense cap dels dos). `--informe telemetria-*.jsonl` llig les entregues de `--exporta` de diverses
màquines en lloc del registre local: és com es respon «l'estenem a tot l'equip?». El recompte és una
cota inferior, i el detall és a `hooks-plantilla/README.md` § «Registre dels hooks que avisen o
bloquegen».

### Entregar les dades al coordinador de qualitat

L'informe de dalt val per a un projecte i una màquina. Contrastar-lo entre projectes exigix
ajuntar-los, i el `.jsonl` brut no ix mai de la màquina: porta rutes absolutes del disc de qui
treballa. El que s'entrega el produïx el hook `SessionEnd`
(`hooks-plantilla/exporta-sessio.sh`), que en tancar-se cada sessió deixa un informe d'eixa sessió
**fora dels repositoris**:

```
~/.claude/telemetria-ua/<projecte>/AAAA-MM-DD-<sessio>.jsonl
```

Un fitxer per sessió: no hi ha mai dos escriptors sobre el mateix fitxer. Els camps són enumerats
(`ts`, `tipus`, `regla`, `skill`/`skills`, `fitxer`, `sessio`) i les rutes són relatives al
projecte -si el fitxer editat cau fora, es guarda només el nom. **El fitxer entregable naix ja net**:
no hi ha cap pas d'anonimització posterior que es puga fer amb pressa o oblidar.

Quan el coordinador ho demane, l'entrega és una orde -no una recopilació:

```
node kit-si-ua/ci-plantilla/registre-disparadors.js --exporta
```

Fusiona tot el que hi haja en eixa màquina (tots els projectes) en un sol fitxer
`telemetria-<maquina>-<data>.jsonl` a l'arrel del directori, i diu on l'ha deixat i què conté. El
nom de la màquina va al nom del fitxer perquè al coordinador no se li sobreescriguen dos entregues;
dins de les entrades no hi ha cap identificador de persona. Obrir-lo abans d'enviar-lo és part del
disseny.

Fora de la màquina no ix res per si sol: sense petició, les dades es queden on estan. El risc d'este
model no és tècnic sinó de cadència -si les dades es demanen «quan faça falta», no es demanaran mai
a temps.

`UA_REGISTRE_DISPARADORS=0` apaga també esta part; `UA_TELEMETRIA=<ruta>` mou el directori.

### L'altra meitat: el registre d'errors

`analitza-registre-errors.js` fa per a `REGISTRE-ERRORS.md` el que `--informe` fa per al registre
de disparadors: compta entrades, les desglossa per `tipus`, per `detecta`, per `via` i per
`peça`, i aplica el criteri del pilot (`validacio-equip.md` §C1: ≥15 entrades i ≥40% `detecta: persona`). És la versió
en Node de les ordres `grep` que ja documenta `REGISTRE-ERRORS.plantilla.md` § "Anàlisi final"
-existix a banda perquè eixes ordres depenien de bash/grep i este script ha de funcionar igual en
qualsevol plataforma:

```
node kit-si-ua/ci-plantilla/analitza-registre-errors.js          # llegible
node kit-si-ua/ci-plantilla/analitza-registre-errors.js --json   # per a agregar
```

El desglossament per `via` és el que mesura el biaix del pilot: `agent-principal` són les entrades
que va escriure qui és alhora subjecte i redactor del registre; `auditoria` (i `hook`, la generació
anterior del mecanisme) les que hi va afegir l'observador independent. La diferència és tot el motiu
pel qual l'observador existix.

**Desglossament per peça** (des de la 1.32.0). `Peça:` és un camp de cos -no de capçalera, a
propòsit: a la capçalera trencaria les ordres `grep` documentades i les entrades ja escrites- amb
llista tancada, que diu **quina peça va fallar** en una entrada `EINES` o en el `SISTEMA` d'un
component que mantenim nosaltres. Serveix per a comptar «la mateixa peça en dos projectes» sense
comparar text lliure, que és el senyal que una troballa val per a tot l'equip i no només per a un
repositori. Dos decisions que val la pena conéixer perquè es veuen a l'eixida:

- Una entrada `EINES` **sense** el camp es compta com a `sense determinar`, no s'omet: un buit omés
  desapareix del recompte i el fa parèixer complet.
- El camp només compta **dins del bloc contigu de la seua entrada**. La plantilla porta exemples del
  camp i l'apèndix va després de les entrades: sense eixa condició, l'última entrada real absorbiria
  una línia de documentació.

L'script **no valida** el valor contra la llista -compta el que troba-; qui la fixa és
`hooks-plantilla/registra-error.sh` en escriure, que és on està la validació determinista.

**La comparació entre projectes no la fa cap automatisme.** Este script analitza **un** registre;
ajuntar-ne dos és, hui, una persona que treballa en els dos repositoris o que compara les anàlisis a
mà quan el coordinador de qualitat les demana. El camp és la peça que faltava perquè eixa comparació
siga un `sort | uniq -c` en lloc d'una lectura; automatitzar-la és una decisió a banda i encara
no presa.

**Cua d'auditoria.** Des que l'auditoria és una comanda en lot i no un hook d'agent
(hooks-plantilla 4.0.0), qui produïx la marca `revisada` és una persona que executa
`/ua-skills:auditoria`. L'script llig `.claude/auditoria-pendents.log` i `.claude/auditoria-sessions.log`
i informa de quants torns queden per auditar i des de quan. Sense això, «cap entrada nova» i «ningú
ha buidat la cua» donarien la mateixa eixida -el mateix forat que `marca-auditoria.sh` va tapar un
nivell més avall. Mentres hi haja cua, el criteri §C1 s'imprimix marcat com a **no concloent**.
`--claude <dir>` apunta a un `.claude/` que no siga el del directori actual.

`analitzaCua()` s'exporta, i des de la 1.36.0 retorna també `detall` (els torns pendents amb la
seua sessió) i `sessionsRevisades`. Ho usa `hooks-plantilla/recorda-auditoria.js`, el recordatori
en el `git push`, per a llegir la cua amb este mateix filtre en lloc de reimplementar-lo. Els seus
casos són a `proves/casos/recorda-auditoria.js`.

Sense `doc-projecte/REGISTRE-ERRORS.md` (ni `REGISTRE-ERRORS.md` a l'arrel, en un kit anterior a 3.0.0), no fa res (no bloqueja, no genera cap avís): molts projectes
no han adoptat encara el registre d'errors. El command `/ua-skills:telemetria` crida este script junt
amb `--informe` per a donar un sol informe combinat del projecte actual, i destaca la cua si n'hi ha.

### Les marques de temps d'una faena (i per què no són hores)

`marques-de-temps.js` respon la pregunta que arriba sempre que el servei porta les hores dels
tiquets a mà: **quant hem tardat a fer això?** La resposta honesta és que de git no ixen hores -un
commit diu quan es va **guardar**, no quant es va **tardar**-, però sí que ixen les marques, i
ningú les mira:

```
node kit-si-ua/ci-plantilla/marques-de-temps.js                          # contra origin/main
node kit-si-ua/ci-plantilla/marques-de-temps.js --base v1.4.0 --json    # per a enganxar al tiquet
```

Emet primer i últim commit, interval de calendari, dies amb activitat, salts de més de 8 h
(`--salt <hores>`), volum del canvi i -si el projecte té el registre de disparadors- el tram vist
de cada sessió d'agent que cau dins de la finestra. **Els noms dels camps són el contracte**:
`interval_calendari`, mai `hores`; el JSON porta a dins el camp `aixo_no_son_hores` amb el límit
escrit, perquè qui integre això amb el tiquet no puga quedar-se la xifra i deixar-se la condició.

El que el fa útil no és el que calcula, sinó **el que es nega a calcular**:

| Situació                                                    | Què fa                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| Un sol commit, o dos commits amb la mateixa marca           | `no mesurable` -no "0 s", que es llegiria com una faena instantània      |
| Data de commit separada de la d'autoria, o repetida         | Avisa: l'historial s'ha reescrit i l'interval per data de commit és fals |
| Salts llargs o més d'un dia de calendari dins de l'interval | Ho diu: és temps de calendari que segur que no és temps de faena         |
| No hi ha branca base resoluble, o base i head coincidixen   | Para amb codi 2 -no mesura contra l'arrel de l'historial                 |

Eixe és el mode de fallada real, no un hipotètic: al catàleg, `e834b20` i `723a250` porten el
mateix `CommitDate` perquè una fusió els va reescriure, i qui calcule "temps entre commits" amb
eixa data conclou que la faena va costar 0 segons. Els controls de `proves/casos/marques-de-temps.js`
són precisament els quatre camins pels quals una marca es convertix en una hora inventada.

**No agrega per persona**, i no és una funció pendent: mesura una faena, no qui la fa. El dia que
la xifra qualifique algú, s'ajusta la manera de partir els commits i deixa de mesurar res. Les
hores de veres són la campanya d'`ESTANDARDS.md` §10.1, que continua pendent d'accés als
repositoris i al sistema de tiquets; això és §10.2, i confondre-les és la xifra inventada que §10.1
prohibix.

### El temps de l'agent i el temps entre torns (i per què tampoc no són hores)

`temps-sessio.js` llig les transcripcions de Claude Code d'esta màquina
(`~/.claude/projects/<projecte>/*.jsonl`) i, per branca, en dona quatre xifres en minuts:

```
node kit-si-ua/ci-plantilla/temps-sessio.js --branca feat/v3-alta          # una o més branques
node kit-si-ua/ci-plantilla/temps-sessio.js --json                          # totes, en JSON
```

| Xifra                  | Què és                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Agent actiu            | La suma dels torns de l'agent, menys el que ha esperat una resposta a una pregunta seua |
| Preguntes de l'agent   | Eixa espera: és temps de la persona, decidint                                           |
| Entre torns, fins a 30 | Buits entre la resposta de l'agent i el prompt següent: lectura, revisió, provar        |
| Entre torns, més de 30 | Revisió llarga o absència: no es pot saber, i per això no es mescla amb l'anterior      |

El fa servir el `handoff` (Pas 3b) per a la taula Calibratge del `pla.md`, **després** de preguntar
les hores a la persona: si les veu abans, les seues hores acaben sent estes xifres. Igual que
`marques-de-temps.js`, cap camp es diu `hores`, el JSON porta `aixo_no_son_hores`, i el que no pot
mesurar ho diu:

| Situació                                                     | Què fa                                               |
| ------------------------------------------------------------ | ---------------------------------------------------- |
| Cap transcripció, o la branca es va fer en una altra màquina | `no mesurat` -no «0 min»                             |
| L'agent ha preguntat i ha esperat la resposta dins del torn  | Resta l'espera de l'agent actiu i la dona a banda    |
| Torns fora d'auto-mode                                       | Avisa: l'agent actiu hi inclou les esperes de permís |

No veu la faena feta amb Codex, en una altra màquina o amb la sessió tancada (la PR al navegador),
ni el temps abans del primer prompt o després de l'últim torn. No llig cap nom: les transcripcions
són locals de qui l'executa. Tampoc veu el que Claude Code ja ha esborrat: per defecte, les
transcripcions de més de 30 dies. Per això el Calibratge s'omple en el traspàs, i l'onboarding
recomana `"cleanupPeriodDays": 365` a `~/.claude/settings.json`.

## Sense git

Els checks són node pelat: no saben on corren i no criden cap API de GitHub. L'única cosa que
alguns demanen a git és **la llista de fitxers a mirar**. Eixa dependència era accidental, i fins
a la 1.30.0 es notava en el pitjor moment: fora d'un repositori peten amb un rastre de pila.

Ara el repartiment és explícit:

| Check                           | Sense git                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `valida-documentacio.js`        | Funciona igual (`--dir .`) -mai ha tocat git                                         |
| `comprova-desfasament.js`       | Funciona igual -compara fitxers contra el clon del catàleg                           |
| `comprova-secrets.js`           | `--dir <carpeta>`: recorre l'arbre en lloc del diff                                  |
| `comprova-tokens-hardcoded.js`  | `--dir <carpeta>`: idem; o `--fitxer <ruta>` (1.37.0) per a rutes concretes          |
| `comprova-antipatrons.js`       | `--dir <carpeta>`: idem; o `--fitxer <ruta>` (1.37.0) per a rutes concretes          |
| `comprova-redaccio.js`          | `--dir <carpeta>`: idem; o `--fitxer <ruta>` (1.41.0) per a rutes concretes          |
| `comprova-tracabilitat.js`      | Funciona igual -llig `doc-projecte/producte/` (`--dir`); només toca git amb `--base` |
| `comprova-unicode-invisible.js` | `--dir <carpeta>`: recorre l'arbre; o `--fitxer <ruta>` per a rutes concretes        |
| `comprova-higiene.js`           | `--dir <carpeta>`: recorre l'arbre; tot fitxer gran compta com a nou                 |
| `comprova-documentacio.js`      | **No té versió sense git** -diu per què i acaba en 2                                 |
| `comprova-frescor.js`           | **No té versió sense git** -diu per què i acaba en 2                                 |

Els dos últims no és que estiguen sense portar: és que **la pregunta que fan necessita historial**.
`comprova-documentacio.js` comprova que el codi i la seua documentació canvien _junts_, i sense
diff no hi ha "junts"; `comprova-frescor.js` compta commits des de l'últim toc d'un document, i
sense historial no hi ha res a comptar. Donar-los un mode `--dir` voldria dir inventar-los una
altra pregunta i dir-los igual.

`comprova-frescor.js` era el cas lleig: engolia l'error de git i acabava dient «cap senyal de
documentació rançosa» -verd damunt de no haver mirat res, que és precisament el mode de fallada
que este catàleg persiguix. Ara para i ho diu.

El mode `--dir` no és només un pedaç per a qui no té git: mira **tot** el codi i no només el tocat
en un PR, o siga que és més estricte que el mode de diff. Serveix igual per a passar una revisió
completa sobre un repositori que sí que en té.

## La traçabilitat del PRD a les specs

`comprova-tracabilitat.js` llig cada carpeta de `doc-projecte/producte/` (`docs/producte/` en un kit
anterior a 3.0.0) que té `prd.md` i creua el PRD
(`ua-requisits-producte`) amb les specs de pantalla de `specs/` (`ua-especificacio-pantalla`). El
que busca és la deriva que no veu ningú que llija un document sol: la fila d'una tasca del PRD cita
un RF, i l'spec que fa eixa tasca diu, amb raó, que no el cobrix; o una spec cita un RF que el PRD
ja ha retirat.

Llig només el que els dos skills fixen:

- del PRD, els RF de «## Requisits funcionals» (`- **RF-NN** — … — Prioritat: **…**`, amb
  «Prova:» en línia o en subpunt, i «**Retirat**» davant del text d'un RF retirat) i les files de
  «## Tasques per rol» (`**T-XX**`, amb els RF a l'última columna);
- de cada spec, el paràgraf `**RF que cobrix**:` del Raonament de producte (amb `**No** cobrix` per
  als que deixa fora), les tasques de «## Tasques i informació» i els criteris de
  «## Criteris d'acceptació», cadascun amb `_Prova_:`.

Una spec sense el paràgraf no és de pantalla (el flux, per exemple) i no compta. Tampoc compta la
que una altra nomena com a `Spec anterior`, ni la que porta «**Superada**» a la capçalera. Si el
`pla.md` reparteix l'abast en faenes amb línies `- **Faena 2 — …**: RF-12, RF-13`, els RF de les
faenes posteriors a la primera no avisen per no tindre spec.

**L'ordre.** Amb `--base <ref>` (i `--head`, per defecte `HEAD`) també mira que l'spec vaja abans que el codi: per cada RF que les línies afegides del canvi citen (comentaris, noms de test), avisa si a la base cap spec vigent de la faena el cobrix. No compara dins de la MR perquè les specs van en MR pròpies abans de les de pantalla. No avisa dels RF que el `pla.md` deixa per a una faena posterior (`- **Faena 2 — …**` o `- **Posterior**`), que el codi cita per dir que queden fora. Sense `--base`, no toca git.

Naix en avís: reporta errors i avisos i acaba en 0. Amb `--strict`, els errors acaben en 1 i els
avisos continuen sense bloquejar. Sense la carpeta, diu que no hi ha res a comprovar i acaba
en 0, perquè va al job de tots els projectes -però si la troba en l'altre disseny del kit (una
migració a mitges), ho diu en lloc de callar.

## Els factors per a estimar (`compta-factors.js`)

`compta-factors.js` és la fitxa de partida de la secció «Estimació» del `pla.md`
(`ua-planificador/references/estimacio.md`): compta, de cada faena de `doc-projecte/producte/` (`docs/producte/` en un kit anterior a 3.0.0), el que fa
créixer la càrrega de cada fase. No és un check: informa en Markdown (o en JSON amb `--json`) i
acaba sempre en 0.

```
node kit-si-ua/ci-plantilla/compta-factors.js [--dir doc-projecte/producte] [--json]
```

- **Fase 1, disseny**: els artefactes que hi ha, les propostes, les voltes de revisió amb resposta
  (`revisio/*.resposta-*.md`, per artefacte), els rols i les tasques del PRD, els RF (vigents,
  imprescindibles, de prioritat posterior, retirats, i els que el `pla.md` deixa per a una faena
  posterior), els RF amb dada personal i el tier més alt (de «Dada i permís» de cada RF), i les
  dependències, riscos i decisions pendents.
- **Per spec vigent, fases 2 i 3b**: els RF que cobrix, els criteris d'acceptació (fets i oberts) i
  el tipus de prova que nomena cada «_Prova_» (component, E2E, servei, unitari, captura, humana).
  «Només a mà» compta els criteris que cap prova automàtica cobrix: són la base de la fase 3b.
- **Fase 3b**: els plans de proves de persona (`proves/<pantalla>.md`) i les sessions fetes
  (`proves/<pantalla>.sessio-<data>.md`), que són els cicles.

Llig el PRD i les specs amb `producte.js`, el mateix lector de `comprova-tracabilitat.js`: «RF
vigent» i «spec vigent» volen dir el mateix en el check i en el recompte. El que un document no
porta (un PRD anterior al camp «Dada i permís») ix com a «no consta», mai com a zero. No posa cap
mida ni cap hora: la mida de cada entrega i els seus motius són de qui estima, i les hores arriben
amb el calibratge. Tampoc mira el codi.

Pilot: `cdp`, la Cartera de Projectes (2026-10-22).

## El Calibratge de tot el projecte (`calibratge.js`)

Cada `pla.md` calibra les seues entregues, però l'interval d'una mida només ix de juntar-ne de
diverses faenes. `calibratge.js` ho fa: llig el «Calibratge» i el «Registre d'hores» de cada
`pla.md` de `doc-projecte/producte/` (`ua-planificador/references/estimacio.md`), amb PRD o
sense. No és un check: informa en Markdown (o en JSON amb `--json`) i acaba sempre en 0.

```
node kit-si-ua/ci-plantilla/calibratge.js [--dir doc-projecte/producte] [--json]
```

- **Hores reals per fase i mida**: entregues, interval i mediana. Amb menys de tres entregues
  d'una mida, l'interval es marca «no calibrat».
- **Registre per fase i rol**: anotacions, hores i trams «no anotades», comptats a part i mai com
  a zero.
- **El que no quadra**: una fila del Calibratge que no és la suma del seu registre, o un registre
  sense fila. Les files «anterior al registre» no es comproven.

Mai per persona: el registre no porta noms, i l'script no llig cap columna que no conega. Les
hores les posa una persona; ací només se sumen, i els minuts de l'agent no s'hi barregen. Llig
amb `producte.js`, com `compta-factors.js`.

## El que rep la Cartera de Projectes (`exporta-entregues.js`)

La Cartera de Projectes no llig markdown: proposa les sol·licituds (una per entrega) a partir d'un
JSON que li envia la CI del projecte en cada merge a `main`. `exporta-entregues.js` el genera amb
`producte.js`: els RF de cada PRD, una vegada (identificador, descripció, prioritat, retirat), i la taula
«Entregues» de cada `pla.md` amb el PRD que fa servir la faena: el seu o el del projecte
(`producte/projecte/prd.md`) (`ua-planificador/references/estimacio.md`), amb el commit i la seua data. No és
un check: escriu el JSON i acaba en 0. La taula la comprova abans `comprova-tracabilitat.js`.

```
node kit-si-ua/ci-plantilla/exporta-entregues.js [--dir doc-projecte/producte] [--eixida entregues.json]
```

No fa cap crida de xarxa ni llig cap credencial. Enviar-lo a l'API de la Cartera és un pas del job
del projecte, quan l'API existisca, amb la credencial en una variable secreta de la CI. Mai cap nom
ni cap hora: no n'hi ha a cap de les dos fonts.

## Els controls positius i negatius (`proves/`)

```
npm test          # des de l'arrel del catàleg
node kit-si-ua/ci-plantilla/proves/executa-proves.js [--cas <fragment>] [--verbos]
```

Els casos dels hooks `.sh` s'executen amb `bash`. Si no és al `PATH` (PowerShell sense `Git\bin`),
cada cas falla amb «no trobe bash al PATH»: llança-ho des de Git Bash.

**La regla**: cap check s'accepta sense haver demostrat que **falla quan ha de fallar**. Fins a la
1.21.0 no n'hi havia cap fixture, i la correcció d'un check arribava sempre per la mateixa via -algú
l'usava i veia que mentia. Cada fitxer de `proves/casos/` porta, com a mínim, un cas **positiu**
(codi bo: el check ha de callar) i un cas **negatiu** (codi trencat a propòsit: el check ha
d'acusar). Si en falta un dels dos, `executa-proves.js` falla: la cobertura és part de la prova, no
una bona pràctica opcional.

**S'asserta sobre l'eixida, no només sobre el codi de sortida.** Tres checks no bloquegen mai per
disseny -`comprova-frescor.js` sempre acaba en 0, `comprova-desfasament.js` només bloqueja amb
`--strict`, i els patrons `avis` de `comprova-antipatrons.js` tampoc. En eixos, "ha fallat" vol dir
"ha avisat", i mirar només l'`exit code` els donaria per bons estiguen muts o no. És el mode de
fallada exacte del guardia del marc referencial, que va passar un mes en verd sense avisar.

**Cada cas corre en un repositori git temporal** creat i esborrat en l'acte: els fixtures no viuen
mai al disc com a fitxers escanejables, així que cap check pot acusar-se a si mateix amb el material
de les seues pròpies proves. L'única excepció que cal declarar és `proves/casos/comprova-secrets.js`,
que conté secrets falsos i està exempt al propi `comprova-secrets.js` -si no, el check acusa les
seues proves (comprovat abans d'afegir l'excepció).

Afegir un check nou vol dir afegir el seu fitxer a `proves/casos/` en el mateix PR. Afegir un patró
a un check existent vol dir afegir-hi el parell de casos que el cobrix.

**També cobrix els hooks de `hooks-plantilla/`, des de la 1.24.0.** El camp `check` d'un fitxer de
casos és una ruta relativa a esta carpeta, o siga que `'../hooks-plantilla/x.js'` ja hi valia; el
que faltava eren dos coses que va destapar el primer hook que s'hi va provar
(`protegix-test-correccio.js`):

- **`stdin`** al fitxer de casos -és per on un hook rep el JSON de l'esdeveniment. L'executor el
  passa **sempre**, encara que siga buit: així tanca l'entrada del fill i un hook no es queda
  esperant per sempre dins de la CI.
- **`codiAvis`** (per defecte `0`). La comprovació de severitat exigia que un mecanisme en mode avís
  tinguera un cas negatiu acabant en **0**. És cert per als checks d'esta carpeta i **fals per a un
  hook de `PostToolUse`**, on l'únic codi que arriba al model és el **2** i no bloqueja res -allí el
  0 seria precisament quedar-se mut. La regla de fons no canvia (l'avís s'ha de demostrar); només
  deixa de suposar quin número el representa.
- **`git: true`** per a un hook que mira el repositori (`injecta-estat-sessio.sh`, de
  `SessionStart`). Sense eixe camp, el cas corre en un directori solt, el hook ix en silenci «fora
  de Git», i tots els casos fallen per eixida buida -o, pitjor, els positius passen sense haver
  provat res. El catàleg del cas es passa per `env` (`UA_CATALEG`) relatiu al directori del cas,
  perquè el hook no mire el `~/.claude/skills` de qui executa les proves. Des de la 5.22.0 el hook
  també crida `gh pr list`: en el repositori temporal no hi ha remot, i el cas només demostra que
  sense PR la secció no apareix. El camí amb PR no té cas, perquè l'executor no pot donar permís
  d'execució a un `gh` simulat.

Val la pena retindre com va aparéixer: **l'executor va refusar el hook**, i tenia raó a mitges. La
comprovació que existix perquè cap mecanisme naixca mut estava, ella mateixa, suposant la convenció
d'una sola família de mecanismes.

**La CI d'este repositori l'executa** (`qualitat.yml`, des del 2026-08-24), i com a **primer** pas:
prova les eines que els passos següents executen, i un check mut passa en verd. Fins llavors la
suite existia i no la corria ningú més que qui recordava fer-ho a mà -que és exactament la via per
la qual arribaven les correccions abans que la carpeta existira. No cal `npm ci`: el runner només
usa mòduls de Node i passa `user.name`/`user.email`/`commit.gpgsign=false` als seus commits
temporals, o siga que corre en qualsevol runner sense configuració prèvia.

## Naixen en avís: com un check es guanya el dret a bloquejar

La columna **Bloqueja** de la taula de dalt no és una propietat tècnica de cada script: és una
decisió, i com a tal té un estat inicial i un criteri per a canviar-lo.

**Tot mecanisme nou d'esta carpeta naix en mode avís** -reporta i acaba en 0. Un check que naix
bloquejant estrena els seus falsos positius damunt de la faena de tothom, i el que passa llavors no
és que es corregisca: és que algú demana traure el step del job, i el step se n'endú els altres
huit. En mode avís, el mateix defecte costa una línia de soroll.

Un check es promociona a bloquejant quan es complixen les tres:

1. **Té el parell de casos de `proves/casos/`** -falla sobre el cas trencat, calla sobre el bo.
   Açò no s'ha de comprovar a mà: `npm test` no passa sense les dos menes.
2. **Ha corregut en avís sobre faena real** prou temps per a haver vist codi que no és el del
   fixture, sense cap fals positiu. No hi ha xifra màgica; el que cal és poder dir sobre què ha
   corregut.
3. **La promoció queda escrita** a l'entrada de `VERSION.md` que la fa: des de quan estava en avís,
   sobre què ha corregut i qui ho ha decidit. Sense això, el punt 2 no és verificable per ningú que
   arribe després.

El primer punt és mecànic. Cada fitxer de `proves/casos/` declara `bloqueja: true|false` i
l'executor exigix que els casos ho demostren: si diu que bloqueja, algun cas ha d'acabar en codi 1;
si diu que està en avís, algun cas negatiu ha de provar que parla amb codi 0. **Promocionar un check
és, per tant, canviar eixa línia**, i el canvi apareix al diff del PR en lloc de quedar sepultat
dins d'un `.js` -que era el forat: la severitat es podia moure sense que ningú ho revisara.

Dos matisos, perquè la regla no es llija com el que no és:

- **Mode avís no vol dir provisional.** `comprova-frescor.js` i `comprova-desfasament.js` hi són per
  disseny i no hi ha res a promocionar: la documentació que acumula commits i la còpia desfasada són
  senyals per a qui revisa, no codi incorrecte.
- **`--warn` i `--strict` són una altra cosa.** Eixos flags els tria el projecte consumidor per a la
  seua CI (un legacy comença amb `--warn` i endurix quan la refactorització avança). La severitat
  d'origen és amb la que el catàleg el distribuïx, i és la que declara `bloqueja`.
- **La regla val cap endavant.** Els set checks que hui bloquegen van nàixer bloquejant, abans que
  la regla existira, i no es degraden: ja porten el rodatge sobre faena real que el punt 2 demana.

La mateixa regla val per als hooks de `kit-si-ua/hooks-plantilla/`, on ja es complix de facto
\-`comprova-docmap-commit.js` avisa sobre un commit ja fet i mai bloqueja. El que hi afig açò és
que el pas a bloquejant siga una decisió amb criteri, no la tria per defecte de qui l'escriu.

## Versionat de la còpia (VERSION.md)

Esta carpeta es distribuïx per còpia estàtica: `VERSION.md` porta el número de versió i
l'historial, i el `docmap.json` d'este repositori obliga a bumpar-lo en qualsevol canvi de la
carpeta. Des d'un projecte consumidor, `node kit-si-ua/ci-plantilla/comprova-desfasament.js
--cataleg <ruta-al-clon-del-catàleg>` avisa si la còpia local ha quedat darrere del catàleg -avís
per defecte, `--strict` per a fer-lo bloquejant. Cobrix tres coses:

| Al projecte consumidor                 | Al catàleg                             |
| -------------------------------------- | -------------------------------------- |
| `kit-si-ua/ci-plantilla/VERSION.md`    | `kit-si-ua/ci-plantilla/VERSION.md`    |
| `kit-si-ua/hooks-plantilla/VERSION.md` | `kit-si-ua/hooks-plantilla/VERSION.md` |
| `doc-projecte/.kit-version`            | `kit-si-ua/kit-projecte/VERSION.md`    |

La tercera fila és el kit de **documentació**: `kit-projecte/` no es copia al projecte (el que hi
arriba és la seua eixida), per això el segell el deixa `genera-kit.js` en generar, i no un
`VERSION.md` copiat.

Quan una fila avisa, no diu només que vas endarrerit: llista els **titulars de les versions que
et falten** (fins a cinc, i el compte de les altres), llegits de l'historial del `VERSION.md` del
catàleg. Saber que vas dos versions arrere no diu si importa; saber que una d'elles arregla un
check que informava en verd, sí.

### Els hooks no es rastregen per versió, es comparen

Els hooks no arriben com a carpeta: es copien un a un cap a `.claude/hooks/`, que és d'on els llig
Claude Code. Al projecte no queda cap `VERSION.md`, i per això la fila de `hooks-plantilla` de la
taula de dalt només diu res als projectes que a més vendoritzen la carpeta sencera -un dels tres
consumidors mesurats el 2026-09-10.

Per als altres, el check compara **el contingut** de cada fitxer de `.claude/hooks/` amb el seu
homònim del catàleg: `OK` si coincidixen, `AVÍS` amb els noms dels que difereixen. Un fitxer que no
existix al catàleg és un hook propi del projecte i no compta com a deriva. Els finals de línia es
normalitzen abans de comparar, i un `.cjs`/`.mjs` local es compara amb el `.js` del catàleg -un
projecte amb `"type": "module"` ha d'adoptar-lo amb eixa extensió per a que Node el carregue, i
comparar per nom exacte el donaria per propi del projecte.

Comparar contingut en lloc de versió no és un apany: un número diu el que algú va escriure el dia
que va copiar, i el contingut diu el que hi ha corrent ara. La primera execució sobre
`generador-correus-ua` va traure dos hooks de seguretat anteriors a la 4.3.0 que cap mecanisme
podia vore, perquè eixe projecte no té ni ha tingut mai un `VERSION.md` de hooks.

### I l'avís diu de què va el canvi (1.33.0)

La fila de la taula de dalt pot llistar els titulars perquè sap de quina versió véns. Esta branca
no ho sap mai, i fins a la 1.33.0 es quedava en «re-copia'ls» i prou -que és demanar-li a qui
encara no ha obert el fitxer que endevine si li importa, el mateix forat que la 1.26.0 va tapar per
a l'altra branca. Ara, quan un hook difereix i al projecte no hi ha cap `VERSION.md` de hooks:

```
AVÍS: 1 hook(s) de .claude/hooks/ difereixen del catàleg: format-prettier.sh
       Re-copia'ls des de kit-si-ua/hooks-plantilla/ (vore el seu README).
       El catàleg va per la hooks-plantilla v5.9.0. Sense VERSION.md local no se sap de
       quina véns: estos són els últims canvis del catàleg, no un càlcul del que et falta.
         5.9.0 (2026-09-22)  El hook de format deixa de tocar codi font, i de formatar a cegues
         5.8.4 (2026-09-22)  Prettier no distingix el que has editat del que no
         5.8.3 (2026-09-21)  El que decidixes no adoptar també s'ha d'escriure
       Historial complet: hooks-plantilla/VERSION.md.
```

**El que no fa és inventar-se el rang**, i la segona línia ho diu en veu alta en lloc de deixar-ho
suposar. Sense versió local no es pot calcular què et falta, i una llista que ho semblara mentiria
justament en el cas més fàcil de creure: un projecte **al dia** que ha tocat un hook a mà. Per això
el bloc no ix quan **sí** que hi ha `VERSION.md` local -allí el rang exacte ja l'ha donat la fila de
la taula, i repetir-lo seria dir dues vegades la mateixa cosa, la segona pitjor.

Tres titulars i no cinc, pel mateix motiu: no són el que et falta, són orientació per a decidir si
val la pena obrir el `VERSION.md`. I si el catàleg no en porta -o `novetats.js` no ha arribat a la
teua còpia-, el que es perd és el detall, mai l'avís.

### I els que encara no tens (1.32.0)

Tot això mira cap a dins -què tens i com ha quedat-, i durant molt de temps això va deixar un hook
**nou** del catàleg invisible per a qualsevol projecte que no el tinguera ja. El check recorre ara
també `hooks-plantilla/` i **compta** els que et falten:

```
NOTA: 3 hook(s) del catàleg disponibles que este projecte no ha adoptat (--hooks-disponibles per a vore quins).
```

Només el recompte, i a posta: amb 13 hooks al catàleg i projectes que n'adopten 4-5, llistar-los
sencers a cada execució són huit línies que s'aprenen a botar -i amb elles l'`AVÍS` de deriva, que
sí que importa. Els noms ixen amb **`--hooks-disponibles`**, junt amb el punter a
`hooks-plantilla/README.md` § Hooks disponibles, que és on es diu què fa cadascun i de què depén.

**No compta mai per a `--strict`**: no adoptar un hook és una decisió del projecte, no deriva.

**Per a que l'oferta no es repetisca**, escriu els que no vols a `hooks-declinats.json` -a l'arrel,
a `ci-plantilla/` o a `kit-si-ua/ci-plantilla/`, la mateixa regla de tres llocs que `docmap.json` i
`skillmap.json`:

```json
[{ "hook": "format-prettier.sh", "motiu": "el projecte no gasta prettier", "data": "2026-09-21" }]
```

El `motiu` i la `data` no els gasta el check: hi són perquè d'ací sis mesos «per què no tenim este
hook?» es conteste sense reobrir el debat. Commiteja'l -declinar un hook és decisió del projecte,
no de la màquina de qui executa el check, i amb ell commitejat els altres del teu equip tampoc el
veuran oferit. Si el fitxer està trencat, el check **falla obert i ho diu**: callar deixaria el
projecte sense l'oferta i sense saber per què.

Les dos primeres files es busquen **en dos llocs**: sota `kit-si-ua/`, que és el layout canònic i
el que escriu `instal·la-ci.js`, i a l'arrel del projecte, on les van deixar les adopcions
anteriors. Una còpia a l'arrel es comprova igual i s'hi afig una `NOTA` que demana migrar-la; la
ubicació **no** compta per a `--strict`, que vigila deriva de versió, no layout. Una fila només se
salta quan la peça no és a cap dels dos llocs -i eixe és l'únic silenci legítim: fins a la 1.26.0
el check només mirava l'arrel, o siga que una còpia niada -la que produïx l'instal·lador- es
tractava com un projecte que no havia adoptat res (entrada 1.26.0 de `VERSION.md`).

## Com adoptar-ho en un projecte UA

**Via ràpida**: `node kit-si-ua/ci-plantilla/instal·la-ci.js --dest <ruta-projecte> [--ci github|gitlab|azure|cap] [--legacy]`
fa els passos 1-3 de baix en una sola execució (idempotent: sense `--actualitza` no sobreescriu res). Sense `--ci`/`--legacy`
i amb sessió interactiva, els pregunta; sense TTY calen com a flags. El pas 4 (adaptar `docmap.json`
de veres) seguix sent manual per disseny -el mapa exigix judici del projecte, no es pot generar sol.

`--ci azure` val igual per a Azure DevOps al núvol i per a un TFS de casa **si és Azure DevOps
Server 2019 o posterior** -el primer que entén pipelines en YAML-. En TFS 2018 o anterior no hi
ha YAML que valga: l'opció honesta és `cap` i els checks es queden com a hooks locals.

**Per a posar al dia una còpia ja adoptada**: `node kit-si-ua/ci-plantilla/instal·la-ci.js --dest
<ruta-projecte> --actualitza`. Sobreescriu els fitxers que vénen del catàleg, crea els checks que la
còpia no tinguera, i **no toca** ni `docmap.json` (és el mapa del projecte, no una còpia del
catàleg) ni el job de CI (pot estar editat a mà) ni `hooks-plantilla/`. L'eixida distingix
`~ actualitzat` de `= igual` per a que es veja què ha canviat de veres. Si la còpia està al layout
anterior -a l'arrel del projecte- es refresca ahí mateix i avisa: moure-la al lloc canònic obliga a
canviar les rutes del job de CI, i eixa és una decisió del projecte.

El refresc **no sobreescriu cap job de CI**, però des de la 1.28.0 sí que el mira: compara quins
scripts corre el teu job amb els que corre el job que genera este script, i et diu els que falten
amb la línia exacta per a apegar. Si el teu job ja porta `--warn` a `comprova-tokens-hardcoded.js`,
les línies proposades vénen igual -no se't endurix la CI de rebot. El diagnòstic es pot
automatitzar; la decisió sobre què bloqueja un PR, no.

**Des de la 1.29.0 el proveïdor no es dóna per suposat.** El refresc mira quins fitxers de CI hi
ha al projecte (`.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines*.yml`,
`.azure-pipelines/`) i compara contra el job que li correspon a cadascun. Si no en troba cap i la
sessió és interactiva, **pregunta quin useu**; i si el proveïdor que dius no té cap fitxer, t'oferix
crear-lo. Amb `--ci <proveïdor>` es força, que és el cas de qui ha migrat i encara arrossega el job
vell: un projecte pot passar de GitHub a TFS sense que ningú torne a executar l'adopció, i mentres
això no es preguntava, la comparació es feia contra el sistema equivocat i eixia en verd damunt
d'un PR sense cap guarda.

Crear un job que no existix no contradiu el «no toca el job de CI»: el que pot estar editat a mà -i
per tant no es toca mai- és un fitxer que ja hi és. On no hi ha res, no hi ha res a perdre.

El refresc copia del clon **tal com estiga al disc**: si el clon del catàleg va endarrerit, la
còpia es posa al dia a una versió vella. Fes-hi `git pull` abans (el flux
`/ua-skills:onboarding --actualitza` ja el fa per tu).

En acabar diu **a quina versió has arribat i què hi ha de nou**: `v<abans> -> v<ara>` i els titulars
de totes les versions intermèdies, llegits de l'historial d'este `VERSION.md`. Un refresc que només
compta fitxers obliga a obrir un fitxer per a saber què ha canviat sota els peus; l'historial que la
regla de bump ja exigix serveix per a dir-ho ahí mateix.

Sense este mode no hi havia cap manera suportada de refrescar una còpia (l'adopció salta el que ja
existix), i el resultat era que les correccions del catàleg s'aplicaven a mà fitxer a fitxer o no
s'aplicaven.

**Via manual**, pas a pas:

1. Copia esta carpeta al repositori del projecte com a `kit-si-ua/ci-plantilla/` (o referencia-la
   com a subarbre) -inclòs `VERSION.md`, que és el que permet detectar després el desfasament.
2. Copia `docmap.exemple.json` → `docmap.json` i **adapta el mapa** al projecte (cada projecte té
   el seu; el d'exemple reproduïx el de `sistema-disseny-ua` i la cadena backend).
3. Crea el job de CI segons el teu servidor:

**GitHub Actions** (`.github/workflows/qualitat.yml`):

```yaml
on:
  pull_request:
jobs:
  qualitat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: node kit-si-ua/ci-plantilla/comprova-documentacio.js --base origin/${{ github.base_ref }} --head HEAD
      - run: node kit-si-ua/ci-plantilla/comprova-tokens-hardcoded.js --base origin/${{ github.base_ref }} --head HEAD
      - run: node kit-si-ua/ci-plantilla/comprova-antipatrons.js --base origin/${{ github.base_ref }} --head HEAD
      - run: node kit-si-ua/ci-plantilla/comprova-frescor.js
      - run: node kit-si-ua/ci-plantilla/valida-documentacio.js --dir .
      - run: node kit-si-ua/ci-plantilla/comprova-secrets.js --base origin/${{ github.base_ref }} --head HEAD
      - run: node kit-si-ua/ci-plantilla/comprova-tracabilitat.js
      - run: node kit-si-ua/ci-plantilla/comprova-unicode-invisible.js --base origin/${{ github.base_ref }} --head HEAD
      - run: node kit-si-ua/ci-plantilla/comprova-higiene.js --base origin/${{ github.base_ref }} --head HEAD
```

**GitLab CI** (`.gitlab-ci.yml`):

```yaml
qualitat:
  image: node:20
  script:
    - git fetch origin $CI_MERGE_REQUEST_TARGET_BRANCH_NAME
    - node kit-si-ua/ci-plantilla/comprova-documentacio.js --base origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME --head HEAD
    - node kit-si-ua/ci-plantilla/comprova-tokens-hardcoded.js --base origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME --head HEAD
    - node kit-si-ua/ci-plantilla/comprova-antipatrons.js --base origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME --head HEAD
    - node kit-si-ua/ci-plantilla/comprova-frescor.js
    - node kit-si-ua/ci-plantilla/valida-documentacio.js --dir .
    - node kit-si-ua/ci-plantilla/comprova-secrets.js --base origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME --head HEAD
    - node kit-si-ua/ci-plantilla/comprova-tracabilitat.js
    - node kit-si-ua/ci-plantilla/comprova-unicode-invisible.js --base origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME --head HEAD
    - node kit-si-ua/ci-plantilla/comprova-higiene.js --base origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME --head HEAD
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

**Azure Pipelines / TFS** (`azure-pipelines-qualitat.yml`), pipeline a banda de la principal:

```yaml
trigger: none

pool:
  name: Default # --pool <nom>

steps:
  - checkout: self
    fetchDepth: 0
    persistCredentials: true

  - bash: node --version
    displayName: Node de l'agent

  - bash: |
      set -e
      branca="${SYSTEM_PULLREQUEST_TARGETBRANCH#refs/heads/}"
      git fetch --no-tags origin "$branca"
      echo "##vso[task.setvariable variable=baseRef]origin/$branca"
    displayName: Resol la branca base

  - bash: node kit-si-ua/ci-plantilla/comprova-documentacio.js --base $(baseRef) --head HEAD
    displayName: comprova-documentacio
  - bash: node kit-si-ua/ci-plantilla/comprova-tokens-hardcoded.js --base $(baseRef) --head HEAD
    displayName: comprova-tokens-hardcoded
  - bash: node kit-si-ua/ci-plantilla/comprova-antipatrons.js --base $(baseRef) --head HEAD
    displayName: comprova-antipatrons
  - bash: node kit-si-ua/ci-plantilla/comprova-frescor.js
    displayName: comprova-frescor
  - bash: node kit-si-ua/ci-plantilla/valida-documentacio.js --dir .
    displayName: valida-documentacio
  - bash: node kit-si-ua/ci-plantilla/comprova-secrets.js --base $(baseRef) --head HEAD
    displayName: comprova-secrets
  - bash: node kit-si-ua/ci-plantilla/comprova-tracabilitat.js
    displayName: comprova-tracabilitat
  - bash: node kit-si-ua/ci-plantilla/comprova-unicode-invisible.js --base $(baseRef) --head HEAD
    displayName: comprova-unicode-invisible
  - bash: node kit-si-ua/ci-plantilla/comprova-higiene.js --base $(baseRef) --head HEAD
    displayName: comprova-higiene
  - bash: node kit-si-ua/ci-plantilla/comprova-descripcio-mr.js
    displayName: comprova-descripcio-mr
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)
  - bash: node kit-si-ua/ci-plantilla/comprova-origen-mr.js --warn
    displayName: comprova-origen-mr
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)
```

Un servidor propi no té agents de Microsoft: el pool ha de ser de casa, amb bash, git i Node 18 o
posterior. El job no baixa Node, perquè l'agent pot no tindre internet. El servei de compilació ha de
poder llegir el repositori, o `comprova-descripcio-mr.js` i `comprova-origen-mr.js` avisaran que no han
pogut llegir la PR.

Dos coses d'Azure que no es poden deixar per suposades, perquè les dos fallen en verd:

- **Les PR es disparen per política de branca.** Cal donar d'alta la pipeline i afegir-la a **Branch
  policies > Build validation** de cada branca de destí. Sense eixe pas el fitxer existix, sembla que
  hi ha guardes i no corre mai.
- **`fetchDepth: 0` no és opcional.** Azure clona en superficial per defecte, i amb un clon
  superficial `git diff base...head` no troba l'avantpassat comú: el check o peta o -pitjor- no veu
  cap fitxer canviat i acaba en verd.

I una tercera de la variable: `System.PullRequest.TargetBranch` arriba com a `refs/heads/main`, per
això el pas previ lleva el prefix i deixa la referència a `$(baseRef)` en lloc de posar-la en línia a
cada check.

4. En un legacy, comença amb `--warn` a `comprova-tokens-hardcoded.js` i endurix quan la
   refactorització avance -una CI que falla sempre s'acaba ignorant, igual que un hook sense
   via d'escapament.

## Què NO és esta capa

- No executa tests del projecte (xUnit/Vitest) -això ja ho fa el job de build de cada projecte;
  la DoD els exigix, però no es dupliquen ací.
- No substituïx la revisió humana ni els skills de revisió (`ua-review`): la CI comprova el
  mecànic i deterministe; el criteri seguix sent de persones i d'agents amb context.
- `valida-documentacio.js` no genera cap fitxer -només comprova. Per a estampar l'esquelet inicial
  del kit de documentació d'un projecte nou, vegeu `kit-si-ua/kit-projecte/genera-kit.js` (genera
  una vegada; este script valida contínuament que no s'haja desviat).
