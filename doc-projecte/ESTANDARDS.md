# ESTANDARDS.md (plantilla)

> Este fitxer és una **plantilla de projecte**, no una norma d'este repositori. `skills-si-ua`
> és on viuen els skills que apliquen estos estàndards; cada projecte real (.NET/Oracle/Vue de la
> UA) ha de copiar este fitxer a la seua arrel i adaptar-lo -sobretot les seccions marcades com a
> "Pendent" i qualsevol particularitat del projecte que no estiga coberta ací.
>
> Propòsit: açò no és
> documentació que es consulta de tant en tant, és coneixement que la IA aplica en cada
> generació/revisió de codi amb la mateixa precisió que codi executable. Cada secció remet al
> skill corresponent en lloc de duplicar-ne el contingut, perquè estàndard i skill no es
> desincronitzen amb el temps.

---

## 1. Contracte d'errors

Font: `ua-dotnet-errores/references/error-contract-ua.md`.

- Oracle llança `RAISE_APPLICATION_ERROR` amb `#missatge#` (cara a l'usuari, sense notificació)
  o sense `#` (error de sistema: dispara notificació per correu + missatge genèric a l'usuari).
- `ClaseOracleBD3` classifica automàticament la resposta en `BDException.Usuario` /
  `BDException.Sistema`.
- `ErrorHandlerMiddleware` (`PlantillaMVCCore.Errores`) és el punt únic que transforma
  excepcions no controlades en respostes HTTP. **No** s'utilitza `IExceptionHandler` d'ASP.NET
  ni el patró `Result`/`ProblemDetails` per a este flux central.

## 2. Validació d'entrada

Font: `ua-validacion`.

- .NET: DataAnnotations/FluentValidation → `ValidationProblemDetails`.
- Oracle: constraints + `RAISE_APPLICATION_ERROR` amb `#missatge#` per a errors de validació
  cara a l'usuari.
- Vue: `useGestionFormularios` v2.
- No confondre amb el contracte d'errors (§1): la validació és sobre entrada incorrecta,
  no sobre fallades de sistema.

## 3. Accés a dades i separació ADM/WEB (Oracle)

Font: `ua-oracle-datos`, `ua-oracle-crud-plsql/references/arquitectura-adm-web.md`.

- Separació d'esquemes ADM/WEB obligatòria abans de generar codi Oracle nou (CRUD PL/SQL o
  accés amb `ClaseOracleBD3`).
- Columnes multiidioma amb sufixos `_ES`/`_CA`/`_EN` (`_CA` és el valencià per convenció
  heretada) -detall complet a §6.

## 4. Seguretat i rols

Font: `ua-dotnet-seguridad`.

- Pendent de completar amb el detall específic del projecte (rols, polítiques d'autorització,
  gestió de sessió) -consultar el skill directament fins que esta secció es desenvolupe ací.
- Checklist transversal (OWASP Top 10, gestió de secrets, ENS/RGPD verificable sobre codi):
  `SEGURETAT.md` (nivell 2 del kit de documentació -copiar-lo a este projecte quan corresponga,
  vore `kit-si-ua/kit-projecte/documentacio-projecte.md`). No duplicat ací per evitar que este
  document i eixe divergisquen.

### 4.1 Cap correcció de seguretat sense el test que reproduïa el defecte

**Un defecte de seguretat confirmat no es tanca sense un test que fallava abans de la correcció i
passa després.** Sense eixe test, l'única prova que el defecte era real és el record de qui el va
vore, i l'única prova que està corregit és que ja no es reproduïx a mà. Les dos desapareixen amb la
sessió; el test es queda, i és el que impedix que torne.

És la mateixa regla que ja s'aplica als checks -cap mecanisme s'accepta sense haver demostrat que
sap fallar-, aplicada a les correccions en lloc dels mecanismes.

**Escala de comprovació**, de la més barata a la més cara. No cal pujar-la sencera cada volta; cal
saber fins on s'ha pujat i **dir-ho**:

| #   | Comprovació                                                    | Què descarta                                         |
| --- | -------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Compila i el test nou passa                                    | Que la correcció no faça res                         |
| 2   | La reproducció original ja no funciona                         | Que el test nou no mesure el defecte de veres        |
| 3   | La suite existent no s'ha trencat                              | Que la correcció s'haja endut alguna cosa per davant |
| 4   | Un agent nou torna a atacar el codi corregit, sense el context | Que s'haja tapat el camí conegut i no la causa       |

**La correcció ataca la causa, no el punt on es va vore**, i és la mínima que la tanca: sense
refactors ni neteges de pas. El mode de fallada documentat no és corregir poc -és corregir de més i
deixar restrictiu el que funcionava.

**Peça determinista associada**: mentres dura una correcció declarada
(`.claude/correccio-en-curs`), el hook `protegix-test-correccio.js` avisa si s'edita un fitxer de
test -qui arregla el codi no ha d'afluixar la prova que el vigila. **Naix en mode avís** i no
bloqueja.

## 5. Logging

Font: `ua-dotnet-serilog`.

- Pendent de completar amb el detall específic del projecte (nivells, sinks, camps estructurats
  obligatoris) -consultar el skill directament fins que esta secció es desenvolupe ací.

## 6. Accessibilitat i internacionalització

Font: `ua-accessibilitat-wcag`, `ua-i18n-valencia`.

- Valencià és l'idioma per defecte; castellà sempre disponible; anglés només si el projecte
  concret l'activa explícitament (`locales/en.json` a `sistema-disseny-ua`, quan actiu, ha de
  cobrir el 100% de les claus de `ca.json`/`es.json`).
- Codi de locale unificat: `ca` (el valencià es tracta com a variant de `ca`, no coexistix amb
  `va` -vore `DECISIONS.md`). Columnes Oracle `_ES`/`_CA`/`_EN` sempre presents a taules amb
  text visible; `_EN` pot quedar buida si el projecte no exposa encara anglés a la UI, però mai
  absent.
- `<html lang="ca">` verificat al document arrel (criteri A8 de `ua-accessibilitat-wcag`).
- Terminologia UX canònica: `ua-i18n-valencia/references/terminologia.md` -no introduir
  sinònims nous sense justificar-ho també a `sistema-disseny-ua/DECISIONS.md`.

## 7. Components de dades i UI

Font: `ua-vue-datos` (pantalla i contracte de l'API), `ua-dotnet-api` (el servidor), `ua-vue-uacloud`
(quin component triar).

- Una pantalla nova que llista registres usa `TablaDatos` (files) o `VistaDatos` (targetes) de
  `@vueua/uacloud`; el `DataTable` antic no s'usa en pantalles noves (migració:
  `ua-vue-datos/references/migrar-datatable.md`).
- El contracte HTTP de llistat és `ApiUaDatos` (`ua-vue-datos/references/ApiUaDatos.md`); el
  servidor el servix amb `ClaseCrud` (`ua-dotnet-api/references/datos-paginados.md`).

## 8. Higiene d'edició de codi

- En editar codi existent, elimina només allò que el teu propi canvi ha deixat sense ús
  (imports, variables, funcions orfes) -no toques codi mort preexistent que no forma part de
  la petició encara que el detectes; menciona'l en l'informe de canvis en lloc d'esborrar-lo
  sense que ho demanen.

## 9. Qualitat i revisió de PR — Definició de Fet (DoD) provisional v0

Font: `ua-review`, `ua-ux-review`, `kit-si-ua/ci-plantilla/` (capa CI).

**DoD provisional v0** -aplicable des d'ara; el Comité de Plataforma la ratificarà o esmenarà
quan es constituïsca, però no s'espera a
ell per a tindre'n una. Un PR està **fet** quan:

1. **Cap troballa 🔴** de la revisió (`ua-review`/agents) sense resoldre, o amb acceptació
   explícita i motivada del revisor humà al PR.
2. **Documentació al dia**: el diff passa `comprova-documentacio.js` (capa CI), o el bypass
   `[no-doc]` està justificat al missatge de commit. El marcador ha d'**obrir o tancar la seua
   línia** (`[no-doc] motiu` o `motiu [no-doc]`): anomenar-lo enmig d'una frase no l'invoca, que
   és el que evita que un commit que en parle apague el guardià sense voler.
3. **Tests de la cadena passant**: xUnit (`ua-dotnet-test`) i, quan n'hi haja, tests de
   components Vue -executats pel job de build del projecte.
4. **Traçabilitat**: si el canvi ve d'un PRD, els RF-XX coberts estan citats i cap RF
   Imprescindible (v1) queda incomplet sense decisió explícita.
5. **Revisió humana**: almenys una persona diferent de l'autor aprova -la decisió de merge
   mai és de la IA.
6. **CI en verd**: els checks de `kit-si-ua/ci-plantilla/` passen (o estan en mode `--warn` documentat,
   si el projecte és un legacy en adopció gradual).

### 9.1 Quanta revisió: el tier el fixa la dada i el permís

Els sis punts de dalt apliquen sempre. El que es gradua és **quanta** revisió, i el criteri per a
una universitat pública **no és la complexitat tècnica sinó què toca el canvi**: quina dada i quin
permís. Un component Vue endimoniat és T0; tres línies que afigen un camp a una consulta
d'expedients, no.

| Tier                                 | Què hi entra                                                                   | Què exigix, per damunt dels sis punts                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **T0 · Presentació**                 | Estils, text visible, maquetació, animacions -sense canvi de dada ni de permís | El que ja hi ha. Revisió d'un auditor.                                                                    |
| **T1 · Pantalla administrativa**     | CRUD sobre dades de gestió no personals                                        | Revisió consolidada (`ua-review`), no un auditor solt.                                                    |
| **T2 · Autenticació i autorització** | Rols, polítiques, claims, sessió, qualsevol `[Authorize]`                      | Revisió creuada: una segona persona, i `SEGURETAT.md` §1 i §2 (A01, A07) comprovats sobre el diff.        |
| **T3 · Dades personals**             | Expedients, nòmines, dades de contacte, fitxers pujats                         | Tot el de T2, més `SEGURETAT.md` §4 (ENS/RGPD) i el vistiplau de qui tinga la responsabilitat de la dada. |

Els actius i les fronteres que decidixen el tier d'un canvi estan declarats a `SEGURETAT.md` §0; si
eixa secció està buida, tot canvi es tracta com a **T2** fins que s'òmpliga -és el valor per defecte
segur, no una penalització.

**Un canvi que afluixa una guarda és T2**, encara que no toque cap dada. Hi entra llevar o relaxar
una regla de `permissions` o un hook de `.claude/settings.json`, afegir `--warn`, llevar un job del
pipeline de CI o relaxar una regla de `docmap.json` o `skillmap.json`. Per la taula seria T0, però
eixa guarda és la que revisarà els canvis següents. Per això no l'aprova qui proposa afluixar-la,
siga persona o agent. Afegir o endurir una regla (un `deny` de `permissions`, una regla de
`docmap.json`) no puja de tier.

**Un canvi a la configuració que s'executa és T2 en qualsevol sentit**, també quan afig: un script
de `.claude/hooks/`, l'orde d'un hook a `.claude/settings*.json` o una entrada de `.mcp.json`. No és
una guarda més: és codi que s'executarà a la màquina de cada persona que faça pull, amb els seus
permisos, i un hook d'inici de sessió corre abans que ningú veja res. Una actualització de
`hooks-plantilla` en el projecte també hi entra.

**Un canvi que no es desfà revertint puja un tier.** És irreversible el que, per a desfer-lo, obliga
a recuperar dades d'una còpia o a avisar persones: DDL que esborra o transforma dades (`DROP`,
`TRUNCATE`, `ALTER ... DROP/MODIFY`), `UPDATE`/`DELETE` massius, una migració de dades, un correu o
una notificació a un col·lectiu. Hi entra també el codi que escriu dades en un format que el codi
anterior no sap llegir: revertir el commit no reverteix les files que ja ha escrit en producció. És
reversible el que es desfà revertint i tornant a desplegar: un `CREATE OR REPLACE PACKAGE`, una
columna nova que admet nuls, una vista. Es revisa un tier per damunt del que li toca per dada i
permís; en T3, que ja és el sostre, la irreversibilitat consta a l'informe.

**El que no es gradua en cap tier**: el merge continua sent d'una persona (punt 5). El que varia és
quants ulls i quina comprovació, mai si n'hi ha.

### 9.2 La política de revisió d'este projecte

Esta secció la llegix `ua-review` **abans de prioritzar**, com ja llegixen
`DECISIONS.md`. És el que permet calibrar un projecte sense bifurcar un skill del catàleg.

1. **Què és 🔴 / 🟡 / 🟢 ací**, si el projecte s'aparta del criteri per defecte de cada skill
   (p. ex.: en un legacy en adopció gradual, un token hardcodejat pot ser 🟡 i no 🔴). Sense res
   escrit, val el criteri del skill.
2. **Sostre de troballes 🟢 reportades una a una**: **10**. La resta van com a recompte per
   categoria. Sense sostre, la llista llarga es deixa de llegir sencera i se n'endú les 🔴 amb ella.
   El sostre es complix **deduplicant per causa arrel** (vegeu el paràgraf de davall), no retallant pel final.
3. **Què no es reporta mai**: rutes i fitxers generats, i tot allò que la capa determinista ja
   bloqueja -si `comprova-antipatrons.js` ho para al PR, repetir-ho a l'informe és el mateix soroll
   amb dos fonts.

El punt 2 depén d'una cosa que **no** es configura ací: com es dedueix una troballa de les altres i
en quin orde s'avalua abans de posar-li severitat. Eixe criteri és del catàleg i viu als skills que
emeten l'informe (`ua-review/references/format-informe.md` § "Evidència abans de severitat"), no en
este fitxer -si es copiara ací, un projecte podria acabar amb dues versions de la mateixa regla.

### 9.3 Branques i MR

El procediment és de la UA i viu a `documentacion-si` (procediment de branques, §7): branques,
commits, MR i etiquetes. El kit no el repetix. Hi afig la plantilla de MR
(`.gitlab/merge_request_templates/Default.md`, que genera `genera-kit.js`), dos checks de la
pipeline de MR -`comprova-descripcio-mr.js` avisa d'una secció sense omplir i
`comprova-origen-mr.js` d'una MR a `Master` que no ve de `PREPRODUCCION` ni porta l'etiqueta
`hotfix`- i `bloqueja-main.sh`, que cobrix `Master` i `PREPRODUCCION` en les sessions de l'agent.
Una branca de desenvolupament entra a `PREPRODUCCION` amb squash; `PREPRODUCCION` i els hotfix
entren a `Master` amb merge commit. La protecció de les dos branques (ningú hi fa push, només MR)
es configura a GitLab, projecte a projecte.

## 10. Mètriques (baseline)

Hi ha **dos fonts, i no mesuren el mateix**. Ajuntar-les és com es fabrica una xifra inventada.

### 10.1 La campanya de baseline — la mesura bona, i continua pendent

% de codi conforme a este `ESTANDARDS.md`, temps de revisió de canvis, incidències post-canvi.
Mesura la qualitat del programari i del procés reals del Servei.

**Estat: pendent, i el motiu no és desídia** -exigix accés als repositoris reals i al sistema de
tiquets, que no depén del catàleg. **No inventar xifres**: mentre no hi haja mesura, «pendent» és
el valor correcte, i «no mesurable» (amb el motiu escrit) és un resultat vàlid quan es faça.

### 10.2 Indicadors derivats — el que el procés ja emet, sense dependre de ningú

Mentre la campanya espera accés, hi ha dada al disc que **no la mira ningú**. Estos indicadors no
necessiten cap recollida nova ni cap permís, i es llegixen amb `/ua-skills:telemetria`:

| Indicador                                                   | D'on ix la dada, que ja existix                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Activació de skills i forats del mapa                       | `.claude/registre-disparadors.jsonl`                                   |
| Hooks que avisen o bloquegen: retirar, modificar o estendre | `.claude/registre-disparadors.jsonl` (des de `hooks-plantilla` 5.28.0) |
| Skills que es queden rancis                                 | `metadata.last-review` de cada `SKILL.md` (`valida-skill.js`)          |
| Errors registrats que no arriben a regla                    | `REGISTRE-ERRORS.md` (`analitza-registre-errors.js`)                   |
| Ritme dels artefactes d'una faena                           | `git log` de `doc-projecte/producte/<faena>/`                          |
| Plans que arriben a merge sense tocar                       | `git log` de `doc-projecte/producte/<faena>/pla.md`                    |
| Marques de temps d'una faena o d'un PR                      | `git log` de la branca (`marques-de-temps.js`)                         |
| Temps d'agent i entre torns d'una branca                    | Transcripcions locals de Claude Code (`temps-sessio.js`)               |

**El límit, i és seriós: açò mesura el procés, no la qualitat del programari.** Un indicador
derivat en verd no diu que el codi estiga bé; diu que el mecanisme s'usa. Presentar-lo com el
baseline seria precisament la xifra inventada que §10.1 prohibix.

**Les marques de temps no són hores treballades.** `marques-de-temps.js` emet el que git sap d'una
faena -primer commit, últim commit, interval de calendari, dies amb activitat, salts llargs- amb
eixos noms i mai com a `hores`: un commit diu quan es va guardar, no quant es va tardar, i
l'interval inclou nits, reunions i altres tiquets en paral·lel. Les hores del tiquet les posa una
persona, amb les marques com a ajuda per a recordar l'abast. **Quan la dada no suporta cap
interval** -un sol commit, dos commits amb la mateixa marca, historial reescrit per un rebase o una
fusió- la resposta és **"no mesurable"**, que per §10.1 és un resultat vàlid. I **no s'agrega per
persona**: mesura una faena, no qui la fa.

**El temps de l'agent tampoc no són hores.** `temps-sessio.js` dona, per branca, els minuts d'agent
actiu i els buits entre torns (fins a 30 min, i de més de 30 a banda), llegits de les transcripcions
de la màquina on s'executa. Van al Calibratge del `pla.md` en columnes pròpies, mai sumats a les
hores reals, i es mostren a la persona **després** que haja donat les seues hores. Si es mostren
abans, les hores declarades acaben sent eixos minuts. La faena feta en una altra màquina o eina és
«no mesurat».

**Regla de govern associada**: tot mecanisme nou declara quina dada **ja existent** el mesura; si no
n'hi ha cap, això és part de la decisió de crear-lo.

## 11. Governança

- Qui aprova canvis a este document: pendent de constituir el Comité de Plataforma. Fins llavors, els
  canvis es fan per PR revisada com la resta del codi.

## 12. Modes de fallada del codi generat per IA

Font: `ua-dotnet-errores` (§1), `ua-dotnet-api`, i este mateix document (§8).

Complementa §8: allò regula què s'esborra en editar; açò, què no es genera. Són cinc patrons
que apareixen sovint en codi generat i que la revisió humana deixa passar perquè "compila i el
test passa". Cada un trenca alguna cosa concreta d'esta pila -no és una preferència d'estil.

- **Cap bucle, retry o polling sense sostre.** Tot `while`/`for` d'espera, tot reintent i tot
  sondeig porta límit d'iteracions o de temps **i** una eixida documentada quan s'esgota. Un
  reintent infinit contra Oracle no recupera res: manté la connexió ocupada i convertix un error
  de sistema en una petició penjada, que no arriba mai a l'`ErrorHandlerMiddleware` ni, per tant,
  a la notificació per correu que §1 dóna per garantida.
- **Cap error engolit.** `catch` buit, `catch` que retorna `null`/llista buida, i
  `EXCEPTION WHEN OTHERS THEN NULL` en PL/SQL: cap dels tres és acceptable. El contracte d'errors
  (§1) assumix que l'excepció arriba fins al punt únic de transformació; qui la captura al mig ha
  de tornar a llançar-la o llançar-ne una de tipada. Un error engolit no és un error que no ha
  passat: és un error sense correu, sense `traceId` i sense log -i l'usuari veu una llista buida
  en lloc d'un missatge.
- **Recursos tancats també en la branca d'error.** Connexions, comandes, `FileStream`, `HttpClient`
  de vida curta: `using`/`try-finally`. La branca feliç sol estar bé; la que es deixa és la del
  `catch`.
- **Cap capa d'abstracció sense un segon consumidor real.** No s'afig un `Manager`, un `Provider`
  o una `Factory` entre el controlador i el repositori "per si de cas". Quan sí que cal crear un
  DTO, un servei o un repositori ho fixa `ua-dotnet-api` -no es duplica ací.
- **Cap codi substituït per un comentari.** `// ... resto del código sin cambios`,
  `// ... existing code ...`: quan l'agent reescriu un fitxer sencer, és més barat escriure eixa
  línia que tornar a escriure el codi, i el fitxer desat perd el que hi havia. Compila si el tros
  perdut no el cridava ningú més, i per això la revisió no ho veu si no mira el diff.

Del primer, el segon i el cinqué, la part detectable sense analitzar flux la comprova
`kit-si-ua/ci-plantilla/comprova-antipatrons.js`. Els altres dos són de revisió: no hi ha manera
de distingir per regex un bucle acotat tres línies més avall d'un que no ho està, ni una
abstracció justificada d'una que no.

---

## Com adaptar esta plantilla a un projecte concret

1. Copia este fitxer a `doc-projecte/` del repositori del projecte (ho fa `genera-kit.js`).
2. Substituïx cada "Pendent" per contingut real i específic del projecte tan prompte com
   existisca.
3. Si una secció ja no aplica (p. ej. un projecte sense Oracle), marca-la explícitament com a
   "No aplica" en lloc d'eliminar-la -manté la numeració estable entre projectes.
4. Revisa esta plantilla periòdicament contra els skills font: si un skill canvia una
   convenció, este document i tots els `ESTANDARDS.md` derivats poden quedar desactualitzats.
5. Cada secció conté només la regla vigent (què cal fer ara) + font + per què en una línia. `DECISIONS.md`
   del projecte llista la decisió en format breu (opcions considerades + conseqüències + "no reobrir"),
   però tampoc és el lloc per a la narrativa completa -rondes de feedback amb data, alternatives
   descartades amb tot el raonament, detalls d'implementació que ja no calen per a decidir res- que va a
   `doc-projecte/historial-decisions.md`, consultat només quan cal el detall.
