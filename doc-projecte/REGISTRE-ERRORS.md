# REGISTRE-ERRORS.md — Roundcube

> Registre cru de les coses que ixen malament durant el treball, per a analitzar-les al final i
> destil·lar-ne gotchas amb dades reals en lloc de per intuïció. El fitxer és la dependència del
> hook `registra-error.sh`: **sense este fitxer a `doc-projecte/` (o a l'arrel, en un
> projecte anterior a kit-projecte 3.0.0), el hook no fa res**.
>
> **En proves.** El mecanisme està en pilot; encara no forma part de `kit-projecte/` ni l'estampa
> `genera-kit.js`. S'adopta a mà, projecte a projecte, mentres es comprova que s'omplix i que el que
> hi entra val alguna cosa.
>
> **Autoritat: cap.** És el document amb menys pes del projecte, per davall de `doc-projecte/CONEIXEMENT-VIU.md`.
> Són observacions, no regles. **No es llig mai per a decidir com fer una cosa**; només s'escriu
> mentres es treballa i es llig en l'anàlisi final. Una entrada d'ací no justifica per si sola cap
> canvi de codi.
>
> **Qui escriu: la IA, sempre.** També -i sobretot- quan l'error l'ha detectat una persona. Una
> persona pot escriure-hi o corregir el que hi haja, però **no se li demana mai** i el registre no
> depén que ho faça: un mecanisme que necessita que algú se'n recorde no s'omplix. El paper de la
> persona ací és auditar, no redactar -vore «El biaix conegut».

## Format — sis camps, una entrada per incident

Append-only: les entrades noves van **al final**, mai reordenades ni esborrades. Si una entrada
resulta equivocada, s'afig una de nova que ho diga; no es reescriu la vella.

```
### AAAA-MM-DD · TIPUS · detecta: IA|persona
Esperat: què s'esperava que passara
Passat:  què va passar de veres (el símptoma observable)
Causa:   causa arrel en una frase, o "sense determinar"
Peça:    quina peça va fallar -només en EINES i en el SISTEMA d'un component nostre
```

Els tres camps de la capçalera van en la mateixa línia a propòsit: fan el fitxer comptable amb un
`grep`, que és el que abarateix l'anàlisi final. Les entrades escrites per l'observador independent
porten a més `· via: auditoria` a la capçalera (`· via: hook` a les anteriors al 2026-08-06, quan
l'observador era un hook d'agent: compten igual).

### Els quatre tipus

| Tipus      | La pregunta que el tria                                                                     | On aniria el pedaç                                                                                   | Servix per a                                                   |
| ---------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `IA`       | L'error el va cometre l'agent?                                                              | el que s'estiga escrivint en esta sessió                                                             | **Gotchas** — és l'únic tipus que els alimenta                 |
| `SISTEMA`  | Ja hi era, al codi que enviem: l'aplicació, o un component o paquet que mantenim nosaltres? | el codi de l'aplicació -o el repositori del component, si el que falla és seu                        | `doc-projecte/CONEIXEMENT-VIU.md`, `doc-projecte/TECH-DEBT.md` |
| `REQUISIT` | El requisit era ambigu o va canviar (no és cap error, però costa temps)?                    | el PRD o la spec: el que estava mal dit, no el codi                                                  | Les seccions d'abast del PRD i el gate del pla                 |
| `EINES`    | Va fallar la cadena amb què treballem, no el que construïm?                                 | un hook, un check, la CI, la configuració, la instal·lació -o enlloc, i llavors només calia saber-ho | El README de la peça que va fallar                             |

Si dubtes entre dos, tria el que descriu **la causa**, no el símptoma: una IA que escriu codi
incorrecte perquè el requisit era ambigu és `REQUISIT`, no `IA`.

**El desempat entre `SISTEMA` i `EINES` és «on aniria el pedaç», no «què és»**, i és el dubte
freqüent: un hook nostre també és codi que ja hi era, o siga que la pregunta «què és» contesta les
dos coses alhora. Si ho arreglaries tocant el codi de l'aplicació, és `SISTEMA`; si ho arreglaries
tocant la cadena d'eines -o si no hi ha res a arreglar i només calia saber-ho-, és `EINES`. Eixa
pregunta, a més, ja diu on va la promoció.

**Un component que mantenim nosaltres és `SISTEMA`, no `EINES`**: el Design System
(`sistema-disseny-ua`) i els nugets `PlantillaMVCCore.*` són codi que **enviem**, no la cadena amb
què treballem, encara que ni un ni l'altre siguen l'aplicació. El desempat continua valent: el pedaç
va al repositori del component. Ara bé, això té una conseqüència que val més tindre escrita que
descobrir-la a mitjan faena: **una troballa així no la pot tancar el projecte**. El que fa el
projecte és anotar la volta al seu `doc-projecte/TECH-DEBT.md` (o al `doc-projecte/CONEIXEMENT-VIU.md`, si és una cosa que
només cal saber); el pedaç el fa qui mantinga el component, i **per als nugets no hi ha hui cap
canal d'entrada decidit** -o siga que la troballa s'ha de fer arribar a mà a qui els mantinga. No
inventes un canal ni el tanques com si fóra de l'aplicació.

**`REQUISIT` es deia `ABAST`, i el nom tampoc aguantava sol**: la capçalera d'una entrada només
porta la paraula, i ací «abast» ja vol dir quatre coses -l'abast d'una faena, la secció d'abast d'un
PRD o d'un problem statement, «fora d'abast» genèric, i **que l'agent haja tocat fitxers fora de
l'abast de la tasca**, que és una fallada de l'agent i per tant `IA` o `EINES`, mai este tipus.
`REQUISIT` diu el que és i apunta al document on va el pedaç.

**`EINES` no vol dir «entorn», i el nom és deliberat**: ací «entorn» ja vol dir tres coses distintes
-variables d'entorn, tindre l'entorn local muntat, i preproducció/producció-, i el tipus no és cap de
les tres. `EINES` és la cadena amb què treballem (Claude Code/Codex, hooks, checks, CI, git, node, el
kit), no els entorns on desplega l'aplicació. Una fallada en preproducció és `SISTEMA` si s'arregla
al codi, i `EINES` només si el que ha fallat és el desplegament mateix.

### El camp `Peça:` -la clau que fa comparable el registre entre projectes

**Obligatori de facto en `EINES`** (si falta, s'escriu `sense determinar`, que fa visible el buit en
lloc d'amagar-lo) i **en el `SISTEMA` d'un component que mantenim nosaltres**. En `IA` i `REQUISIT`
no aplica: el pedaç és d'esta sessió o del PRD, no d'una peça.

| Família                       | Valors                                                         |
| ----------------------------- | -------------------------------------------------------------- |
| El catàleg i el kit           | `skills` · `hooks-plantilla` · `ci-plantilla` · `kit-projecte` |
| El que enviem (amb `SISTEMA`) | `sistema-disseny-ua` · `PlantillaMVCCore`                      |
| La cadena de fora             | `claude-code` · `codex` · `git` · `node` · `dotnet` · `oracle` |
| Comodí                        | `altres` -digues quina és a `Causa:`                           |

**La llista és tancada a posta.** Amb text lliure, «el mateix patró en dos projectes» no es pot
comptar, i eixe recompte és tota la raó del camp: `registra-error.sh` descarta un valor que no hi
estiga (escriu l'entrada sense el camp i avisa per `stderr`). Si un cas cau dos voltes en `altres`
amb la mateixa peça, eixe és el senyal per a afegir el valor ací -igual que qualsevol altra cosa
d'este fitxer: amb dos casos reals, no amb un.

**Si el teu registre té entrades amb els noms antics** -`ENTORN` (ara `EINES`) o `ABAST` (ara
`REQUISIT`), els dos canviats el 2026-09-19-: reescriu-les o deixa-les com estan;
`analitza-registre-errors.js` conta el tipus que troba, o siga que barrejar els noms només partix el
recompte en dos files.

### Quan s'escriu

Per defecte, només escriu `/ua-skills:auditoria`, que processa en lot els torns que el hook `Stop`
ha encuat i porta els disparadors dins de la seua pròpia comanda -és un observador independent a
propòsit, i per això no depén de cap document que puga llegir l'agent principal. **Cal executar-la
de tant en tant**: no s'engega sola, i `/ua-skills:telemetria` avisa quan la cua s'acumula.

Si a més vols que la IA escriga **en el mateix torn** en què es produïx l'error (recomanat:
l'auditoria escriu de memòria al final, l'agent escriu amb el context davant), copia a `doc-projecte/CONTEXT-IA.md` el bloc
de l'apèndix d'este fitxer. Els disparadors queden llavors **només** a `doc-projecte/CONTEXT-IA.md`, que és el
document que la IA llig sempre; no es copien ací, perquè dos còpies divergixen.

### El biaix conegut

Com que la IA és alhora el subjecte i qui redacta, el registre té dos punts febles i cap dels dos es
tapa amb bona voluntat:

- **Només pot registrar el que arriba a saber.** Un error que ningú li assenyala i que ella no veu no
  existirà al fitxer. El `detecta: persona` només entra si la persona ho diu en veu alta -per això
  val la pena dir-ho encara que semble menor.
- **Té l'incentiu d'infravalorar-se.** El camp `detecta` i el tipus `IA` són precisament els que la
  deixen malament, i és ella qui els òmpli.

Per això el paper de la persona és **auditar, no redactar**: llegir el fitxer de tant en tant (5
minuts) i comprovar que hi són les correccions que recorda haver fet. Una entrada que falta diu més
que deu que hi són. L'auditoria independent és la segona meitat d'esta mesura: comparar les entrades
amb `via:` (`auditoria`, o `hook` en les antigues) i sense diu quant s'estava deixant l'agent.

### Compte amb el que s'hi enganxa

Cap contrasenya, cadena de connexió, token ni dada personal (CODPER, noms, correus) dins d'una
entrada. Si el símptoma inclou una traça amb dades, resumix-la. El registre és **anònim per
disseny**: `detecta` només distingix `IA` de `persona`, mai qui.

## Anàlisi final

Al tancament d'una fita gran:

```bash
# Totes filtren primer per "^### 20": només les capçaleres d'entrada comencen per data, i així la
# documentació d'este mateix fitxer no contamina el recompte.
R=doc-projecte/REGISTRE-ERRORS.md   # a l'arrel en un projecte anterior a kit-projecte 3.0.0
grep -c "^### 20" "$R"                                              # total d'entrades
grep "^### 20" "$R" | grep -o "· [A-Z]* ·" | sort | uniq -c         # per tipus
grep "^### 20" "$R" | grep -o "detecta: [A-Za-z]*" | sort | uniq -c # IA vs persona
grep "^Peça:" "$R" | sort | uniq -c                                 # per peça
```

Més còmode i portable (i única forma de vore la **cua d'auditoria pendent**, que decidix si estes
xifres són concloents):

```bash
node kit-si-ua/ci-plantilla/analitza-registre-errors.js     # o /ua-skills:telemetria, que a més el localitza
```

Després, per a cada entrada de tipus `IA`, `EINES` o `REQUISIT`: es repetix el patró? S'hauria evitat
amb alguna cosa escrita -una regla, una nota, o una frase que faltava al requisit? Si la resposta és
sí a les dos, l'entrada **es promou**, i el destí no és sempre el mateix. (`SISTEMA` de l'aplicació
no es promou: el seu destí ja és del projecte -`doc-projecte/CONEIXEMENT-VIU.md` o `doc-projecte/TECH-DEBT.md`. Sí que travessa
quan el pedaç és d'un component que mantenim nosaltres, que és l'última fila.)

**El destí d'`EINES` no és nou, només no estava escrit**: la nota que `PreToolUse` s'executa en un
procés separat i no hereta les variables d'entorn definides dins d'una crida ja viu al README de
`hooks-plantilla/`, que és exactament esta forma de promoció feta a mà.

**El llindar**: **dues entrades del mateix patró**. La segona és la que demostra que la primera no
era casual, i esperar-ne més és deixar que el mateix error es pague tres voltes. És un número
provisional -hui el registre no té prou entrades per a calibrar-lo, i es revisa quan en tinga.

**Les dues entrades han de vindre de sessions distintes.** Una sola sessió no demostra que el
patró es repetisca: l'agent pot caure dues voltes en el mateix error abans de corregir-lo, i una
transcripció amb contingut no fiable pot fabricar el patró sencer. L'entrada no porta la sessió,
així que es mira la capçalera: dues entrades del mateix dia i de la mateixa `via` compten com una,
llevat que qui promou sàpiga que vénen de sessions distintes.

**El camp `Peça:` és el que fa comptable això**: agrupant per `(tipus, peça)` es veu en un
`sort | uniq -c` si la mateixa peça ha fallat en dos llocs, sense haver de comparar text lliure. La
comparació entre projectes, però, **no la fa cap automatisme hui**: la fa qui treballa en els dos
repositoris, o qui compara les anàlisis a mà quan el coordinador de qualitat les demana.

**En `EINES`, dos entrades de projectes distints valen més que dos del mateix**: una eina que falla
igual en dos repositoris ja no és una particularitat d'un projecte, i la promoció puja al catàleg
-que és el que fa que el papercut el pague una vegada tot l'equip en lloc de quinze. Eixa és tota la
ruta transversal: **no hi ha cap fitxer global compartit, i no fa falta**, perquè el catàleg arriba a
tothom per `git pull` i pel symlink. El que es comparteix és la nota promoguda, mai el registre en
brut -que continua tenint autoritat zero i no es llig per a decidir.

**Els destins, i el criteri que els separa** -per als tres primers, si fa falta criteri per a decidir; per als dos últims, de qui és el pedaç:

| Si el patró...                                                                              | El destí és                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Per què eixe                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **es detecta amb un patró sobre el diff** (una crida, una forma de codi)                    | una regla nova a `ci-plantilla/comprova-antipatrons.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | és l'única promoció que **no es paga en tokens**: un gotcha es carrega cada vegada que s'obri l'skill, una regex corre gratis -i en CI per a qui no té els hooks muntats                                                                                                                                 |
| **cal criteri** per a decidir si és un error o no                                           | gotcha: `doc-projecte/CONEIXEMENT-VIU.md` (del projecte) o el `gotchas.md` del skill que el cobrisca (si generalitza més enllà d'ací)                                                                                                                                                                                                                                                                                                                                                                                                                                      | un check no pot decidir el que depén del context; si ho intenta, acusa quan no toca                                                                                                                                                                                                                      |
| **és de la cadena d'eines** (`EINES`)                                                       | el README de la peça que va fallar, **al catàleg i no a la còpia local**: `hooks-plantilla/`, `ci-plantilla/` o el kit si és nostra; `ONBOARDING-PROGRAMADOR.md` si és de la cadena de tots (Claude Code, Codex, git, node). **Si a més l'ha de saber l'agent abans de cridar l'eina**, la nota va també a `doc-projecte/CONTEXT-IA.md` quan el fet és del projecte. Si és de la màquina va a l'onboarding, que és per a la persona i l'agent no llig: qui ho arregla és qui té la màquina (mai com a línia fixa de `CONTEXT-IA.md`: en un equip on no passa, seria falsa) | no és una regla que un check puga comprovar ni un gotcha d'un skill: és una nota de «això funciona així», i ha d'estar on la busca qui la patix -i al catàleg, perquè escrita a la còpia local la nota es perd en la pròxima re-còpia i `comprova-desfasament.js` acusaria la divergència                |
| **era el requisit, no el codi** (`REQUISIT`)                                                | les seccions d'abast del PRD -«No inclou» i «aspectes deliberadament NO especificats»- i, si el que va fallar va ser el gate, el pla                                                                                                                                                                                                                                                                                                                                                                                                                                       | el pedaç no és codi: és una frase que faltava on es decidix l'abast. Escrita en un gotcha o en el codi, el mateix malentés torna en la faena següent, perquè el document que la gent llig per a saber què s'ha de fer continua dient el mateix                                                           |
| **és d'un component o paquet que mantenim** (`SISTEMA`, però el pedaç no és de l'aplicació) | el repositori del component -`sistema-disseny-ua` per al Design System-, **i mentrestant** la volta al `doc-projecte/TECH-DEBT.md` del projecte. Per als nugets `PlantillaMVCCore.*` no hi ha canal d'entrada decidit: es fa arribar a mà a qui els mantinga                                                                                                                                                                                                                                                                                                               | afecta tots els projectes que el consumixen, o siga que arreglar-ho només ací seria pagar-ho tantes voltes com projectes hi haja; però el catàleg **no és** el destí -no és coneixement nostre, és un defecte d'un altre repositori, i escriure'l com a regla ací només documentaria la volta per sempre |

**La regla nova ha de citar la font que la prohibix**, com totes les de `comprova-antipatrons.js`.
Si no n'hi ha cap d'escrita, entra com a `avis` i no bloqueja -com tot mecanisme nou
(`ci-plantilla/README.md` § "Naixen en avís").

**Una nota promoguda guarda la classe de problema, no els casos.** Diu com es reconeix i què cal
fer, no la llista del que ha fallat fins ara: la pròxima faena es trobarà uns altres casos. Si ha de
ser una llista (els tests que ja fallen, per exemple), diu que no és completa, i mai que el que hi
falta ho ha causat el canvi: l'agent tornaria a fer la comprovació que la nota volia estalviar-li, i
també en faenes on no calia.

**Criteri de si el mecanisme funciona**: prou entrades perquè el disparador s'estiga atenent, i
≥40% amb `detecta: persona`. Si quasi totes són `detecta: IA`, la conclusió **no** és que la IA
s'equivoque poc: o les correccions humanes no s'estan registrant, o s'estan registrant com si se
n'haguera adonat ella. Les dos invaliden la mesura igual.

---

## Entrades

<!-- Les entrades noves van ací baix, en orde cronològic. Cap encara. -->

---

## Apèndix — bloc per a copiar a `doc-projecte/CONTEXT-IA.md` (opcional)

Només si vols que la IA escriga en el mateix torn, a més de l'auditoria. Copia'l tal qual sota el mapa de
documentació, i afig `doc-projecte/REGISTRE-ERRORS.md` al final de l'orde de precedència (autoritat zero).

```markdown
### REGISTRE-ERRORS.md — escriptura obligatòria

**L'anotació la fas sempre tu.** No li la demanes a l'usuari, no li la suggerisques i no esperes que
la faça ell: si el registre depén que una persona se'n recorde, no s'omplirà. Afig l'entrada al
final de `doc-projecte/REGISTRE-ERRORS.md` **sense demanar permís i sense interrompre la tasca**, sempre que
passe una d'estes coses:

- L'usuari et corregix alguna cosa que tu donaves per bona.
- Un test es posa roig per un motiu que no era evident.
- Alguna cosa falla en preproducció o producció.
- Es perd temps notable per una causa que s'hauria pogut evitar sabent-la abans.

**Quan**: en el mateix torn en què apliques la correcció, no al final de la sessió. Diferir-ho vol
dir escriure-ho de memòria, i llavors s'escriu malament o no s'escriu.

Format i tipus: capçalera de `doc-projecte/REGISTRE-ERRORS.md`. Regla ràpida: quatre línies; tipus `IA` només
quan l'error és teu; `EINES` quan el que ha fallat és la cadena amb què treballes (hooks, checks, CI,
git, node, la pròpia eina d'agent) i no el que construïm -una fallada en preproducció **no** és
`EINES` pel fet de ser un entorn: és `SISTEMA` si s'arregla al codi; i `detecta: persona` quan qui
se n'ha adonat ha sigut l'usuari. En una entrada `EINES`, digues **quina peça** va fallar amb el
camp corresponent i un valor de la llista tancada del fitxer -no te'n inventes cap: un valor de
fora es descarta i el camp es queda buit. **Eixe camp és
el que fa útil el registre i eres tu qui l'òmpli, així que és el que més fàcil et seria d'inflar a
favor teu: no ho faces.** Que t'ho hagen hagut de dir compta com a `detecta: persona`, encara que
després la correcció la faces tu i encara que et pareguera òbvia una vegada dita.

Si no estàs d'acord amb la correcció, registra-la igualment amb la versió de l'usuari i afig el teu
dubte a `Causa:`. No decidixes tu què va ser un error.

No registres el treball normal (una iteració de disseny, un test roig perquè encara no hi ha codi).
```

`doc-projecte/REGISTRE-ERRORS.md` **no va al mapa de documentació** de `doc-projecte/CONTEXT-IA.md`: no es llig mai per a
decidir com fer una cosa.
