# Correu web de la UA sense Gmail

> `ua-descobriment-producte` · Redactat: 2026-11-15 · Estat: decisió confirmada (Continuar)

## Enunciat

A partir de gener de 2027, més de 1.000 persones del PDI i del PTGAS, i una part desconeguda de les
unes 500 bústies d'unitat, ja no podran enviar correu oficial amb @ua.es des de Gmail. L'alternativa web
institucional, Roundcube, no té el que fan servir per a treballar: desfer i programar l'enviament,
classificar amb etiquetes, compartir fitxers grans i, sobretot, en una bústia d'unitat (que diverses
persones ja poden obrir alhora en Roundcube, com en Gmail), saber qui gestiona cada correu i en quin
punt està, per a no contestar dos vegades el mateix correu ni contestar-lo de manera diferent.

## Si no férem res

- Una part dels usuaris de Gmail enviaria el correu oficial des de `@gcloud.ua.es` o des d'adreces
  personals. Això contradiu el comunicat de 2022 (regles 2 i 4.1) i fa perdre el canal institucional.
- Una altra part passaria a Thunderbird. A les bústies d'unitat, això repetix el problema que ja hi ha
  hui: cada gestor té les respostes a la seua màquina i continuarien les respostes duplicades o
  contradictòries.
- El CAU rebria al gener, de colp, les consultes de més de 1.000 usuaris (supòsit: no hi ha cap
  previsió de volum).
- Hi ha un termini extern que no controlem: Google retira la funció al gener de 2027 i pot restringir
  configuracions noves ja abans.

## Evidència

| Evidència                                                                                                                                                                                                                       | Tipus                                         | Font                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A partir de gener de 2027 Gmail retira el «Send as» per a adreces de tercers, Gmailify i la recollida per POP al web. Durant el T3–T4 de 2026 pot restringir configuracions noves. No afecta els àlies de Workspace.            | document                                      | [Google, answer/17101213](https://support.google.com/mail/answer/17101213) i [answer/22370](https://support.google.com/mail/answer/22370) |
| PDI i PTGAS són unes 4.500 persones, i més de 1.000 fan servir Gmail. No hi ha dades concretes.                                                                                                                                 | declaració de l'equip del projecte            | conversa, 2026-11-15                                                                                                                      |
| Hi ha unes 500 adreces d'unitat. Cada una la porten diverses persones amb un mateix usuari i contrasenya, en diversos Thunderbird per IMAP o en el web de Gmail (si la bústia està redirigida).                                 | declaració de l'equip del projecte            | conversa, 2026-11-15                                                                                                                      |
| A les bústies d'unitat amb Thunderbird, cada gestor no veu les respostes que han enviat els altres.                                                                                                                             | declaració de l'equip del projecte            | conversa, 2026-11-15                                                                                                                      |
| S'han donat casos de respostes diferents al mateix correu, que perjudiquen la imatge de la UA i deixen el destinatari sense saber què val.                                                                                      | declaració de l'equip del projecte            | conversa, 2026-11-15                                                                                                                      |
| En els cursos de gestió del correu i en converses amb usuaris es troben a faltar: un gestor en línia per a les bústies d'unitat, la programació de l'enviament, desfer un enviament i etiquetes més flexibles que les carpetes. | declaració de l'equip, d'observació en cursos | conversa, 2026-11-15                                                                                                                      |
| La major part del correu dels comptes UA és oficial.                                                                                                                                                                            | declaració de l'equip del projecte            | conversa, 2026-11-15                                                                                                                      |

No hi ha cap dada mesurada: ni quants usuaris redirigixen a Gmail, ni quantes bústies d'unitat ho
fan, ni quantes respostes duplicades es produïxen. Els adjunts a Nextcloud no tenen evidència directa
d'usuari (vegeu «Supòsits»).

## Usuari i context

- **PDI i PTGAS amb el correu personal @ua.es redirigit a Gmail** (més de 1.000 de 4.500). Fan servir
  el correu per a la faena diària i hi envien correu oficial. El web de Gmail els dona l'enviament
  programat, el desfer i les etiquetes. Al mòbil, poden continuar fent servir l'app de Gmail
  (declaració de l'equip; vegeu el dubte sobre el mòbil).
- **PTGAS que porta una bústia d'unitat** (p. ex. `servei.informatica@ua.es`). És el subtipus que
  atén directament alumnat i PDI, amb un volum alt de peticions. És operador del procés (vegeu la
  taula).
- **L'alumnat queda fora** (decisió de l'equip, 2026-11-15).

## Rols, responsabilitats i tasques

| Rol                                            | Relació             | Responsabilitats                                        | Tasques habituals (el que ha d'aconseguir)                                                                               | Accions que la servixen                  | Decisions i informació que usa                                                                  | Què vigila                                                                                                       | Artefacte d'ara                                                                                                                                                         |
| ---------------------------------------------- | ------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gestor de bústia d'unitat (PTGAS)              | operador            | Que la unitat conteste en nom de la UA amb una sola veu | Que cada correu que arriba a la unitat tinga una sola resposta, coherent, i que el destinatari sàpia qui li ha contestat | llegir, contestar, signar amb el seu nom | A qui li toca cada correu, amb una etiqueta de persona que queda associada al correu (en Gmail) | En quin punt està cada correu: etiquetes kanban (A fer, Esperant, En procés, Fet) i safates múltiples (en Gmail) | Un compte IMAP compartit en diversos Thunderbird, o el web de Gmail si la bústia està redirigida (`fonts/exemples/2026-11-gmail-bustia-compartida-etiquetes-kanban.md`) |
| Responsable o coordinador de la unitat (PTGAS) | gestor (hipòtesi)   | Desconegut: no s'ha preguntat                           | Desconegut                                                                                                               | —                                        | —                                                                                               | —                                                                                                                | —                                                                                                                                                                       |
| CAU                                            | operador del suport | Atendre les consultes de la migració                    | Que els usuaris que deixen Gmail puguen continuar treballant des del primer dia                                          | Desconegut                               | —                                                                                               | —                                                                                                                | —                                                                                                                                                                       |

**Qui veu les dades de qui**: en una bústia d'unitat, tots els gestors veuen tot el correu de la
unitat. Hui és així, i no s'ha plantejat restringir-ho.

## Benefici esperat

- Un PDI o PTGAS que deixa Gmail al gener continua enviant amb @ua.es des de Roundcube. Pot desfer un
  enviament i programar-lo, i classifica la faena amb etiquetes, sense necessitar Gmail per a res.
- En una bústia d'unitat, qui obri un correu veu si ja l'ha contestat un company, què li han
  contestat i qui ho ha fet. El destinatari rep una resposta signada amb el nom de qui la firma.
- Un fitxer massa gran per a adjuntar s'envia com a enllaç de Nextcloud sense eixir del correu, i un
  adjunt rebut es desa a Nextcloud sense descarregar-lo abans a l'ordinador.

## Abast

Candidats a l'abast. La prioritat i el que entra abans del gener els fixa `ua-requisits-producte`:

1. Bústia d'unitat compartida en Roundcube: respostes visibles per a tots els gestors i signatura amb
   el nom de qui envia.
2. Desfer l'enviament.
3. Programar l'enviament (necessita un component de servidor a banda de Roundcube).
4. Etiquetes per a classificar la faena.
5. Adjunts grans com a enllaç de Nextcloud.
6. Desar adjunts rebuts a Nextcloud.
7. Adaptar Roundcube al sistema de disseny UACloud, que entra en vigor al llarg de 2027. És un objectiu
   institucional, no una necessitat dels usuaris que deixen Gmail.

## Fora d'abast

- L'alumnat.
- El mòbil: els usuaris poden continuar fent servir l'app de Gmail (declaració de l'equip).
- Afegir `ua.es` com a domini o àlies del Workspace de la UA perquè el «Send as» continue funcionant: no
  es valora (decisió de l'equip, 2026-11-15).
- Comptes delegats a l'estil de Gmail: hui no hi ha alternativa tècnica. Si la bústia d'unitat
  ho necessitara, caldria tornar-ho a plantejar.
- La resta de funcionalitats del document de propostes de 2026-11-12 (antiphishing, avís de
  destinatari extern, IA, posposar, recordatoris, categories, dreceres…): no tenen evidència d'usuari
  lligada a este problema. No es descarten com a projecte, però no formen part d'este problema.
- Tocar el nucli de Roundcube, `vendor/` o plugins de tercers (restricció del projecte).

## Supòsits

- Que més de 1.000 persones fan servir Gmail. És una estimació sense dades.
- Que una part de les 500 bústies d'unitat està redirigida a Gmail, i que estes són les més afectades
  pel gener: hi passen el correu oficial de la unitat i, a diferència dels comptes personals, no tenen
  cap alternativa compartida en línia.
- Que, si els gestors signen amb el seu nom, el destinatari sap qui li contesta i la resposta sembla
  menys anònima. L'equip ho proposa com la solució més pràctica, però no s'ha validat amb gestors.
- Que els usuaris de Gmail feien servir Google Drive per a compartir fitxers grans, i per això trobaran
  a faltar els adjunts a Nextcloud. És una hipòtesi sense evidència directa.
- Que les etiquetes es poden guardar com a _keywords_ IMAP. Depén del servidor IMAP, que no coneixem.
- Que l'app de Gmail al mòbil continuarà permetent enviar des d'un compte IMAP @ua.es. La pàgina de
  Google es contradiu (vegeu «Dubtes oberts»).

## Normativa i procediments

| Font                                                                               | On és                                                                                                                            | Data i òrgan                                      | Estat                                                                           | Lectura                |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| Comunicat «Sobre l'ús dels comptes de correu institucionals i els comptes externs» | `doc-projecte/fonts/normativa/2022-01-comunicat-comptes-correu-institucionals-externs.md`                                        | 2022-01-31, Vicerectorat de Transformació Digital | vigent (declaració de l'equip); comunicat, no cita cap acord que el sustente    | sencera, el 2026-11-15 |
| Condicions d'ús del correu electrònic                                              | [si.ua.es](https://si.ua.es/va/normativa/condicions-d-us/condicions-d-us-del-correu-electronic.html), BOUA 2016-07-05            | 2016-06-29, Consell de Govern                     | vigent. La §3.7 no s'aplica (declaració de l'equip). La §6.2 cita la LO 15/1999 | sencera, el 2026-11-15 |
| Canvis en el suport de comptes de tercers a Gmail                                  | [answer/17101213](https://support.google.com/mail/answer/17101213), [answer/22370](https://support.google.com/mail/answer/22370) | Google; consultat el 2026-11-15                   | anunci de proveïdor; el text pot canviar                                        | sencera, el 2026-11-15 |

No hi ha cap altra norma sobre el correu a part d'estes dues (declaració de l'equip, 2026-11-15).

| Regla del domini                                                                                               | Font                                                |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| L'únic compte institucional és el que acaba en @ua.es.                                                         | Comunicat 2022, regla 2                             |
| Els correus oficials s'envien des del compte @ua.es.                                                           | Comunicat 2022, regla 4.1                           |
| L'adreça de correu que es publica és sempre la institucional.                                                  | Comunicat 2022, regla 4.2                           |
| L'ús institucional de comptes de proveïdors externs (Google, Microsoft) «ha de limitar-se».                    | Comunicat 2022, regla 1                             |
| Els comptes `@gcloud.ua.es` són addicionals, els opera un proveïdor extern i «poden deixar d'estar operatius». | Comunicat 2022, regles 5 i 6                        |
| «Les claus d'accés són per a ús exclusiu de la persona usuària titular».                                       | Condicions d'ús 2016, §2                            |
| Es permet el correu personal sempre que no afecte l'ús professional.                                           | Condicions d'ús 2016, §3.2                          |
| Cap norma regula la redirecció del correu a comptes externs ni el client que s'ha de fer servir.               | Comunicat 2022 i condicions d'ús 2016 (no ho diuen) |

## Dependències

- **Google**: el termini (gener de 2027) i les restriccions prèvies a configuracions noves. No el
  controlem.
- **Servidor IMAP de la UA**: el servidor (Dovecot, Cyrus…) i si permet ACL, carpetes compartides i
  _keywords_. D'això depén si es poden fer la bústia compartida i les etiquetes, i com. Es desconeix.
- **Nextcloud de la UA**: l'API i l'autenticació per a pujar fitxers i crear enllaços des de Roundcube.
- **Sistema de disseny UACloud**: en construcció, i entra en vigor al llarg de 2027. Té un responsable
  identificat a l'equip.
- **CAU**: el suport i la comunicació de la migració.
- **Component de servidor** per a l'enviament programat (cron o worker), fora de Roundcube.

## Riscos

| Risc                                                                                                                                                                                                          | Tipus                   | Nivell     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------- |
| No dona temps de tindre-ho tot abans del gener de 2027, i això obliga a triar què ha d'estar llest el primer dia.                                                                                             | viabilitat              | Bloquejant |
| Les bústies d'unitat funcionen amb un usuari i una contrasenya compartits, i les condicions d'ús (§2) diuen que les claus són d'ús exclusiu de qui en és titular. Construir sobre eixa pràctica la consolida. | viabilitat              | Important  |
| Amb un sol usuari compartit, Roundcube no sap qui està escrivint. La signatura amb el nom de qui envia dependria que cada persona la triara bé cada vegada.                                                   | factibilitat/usabilitat | Important  |
| El servidor IMAP pot no permetre carpetes compartides, ACL o _keywords_. Això canviaria com es fan la bústia compartida i les etiquetes.                                                                      | factibilitat            | Important  |
| Adaptar l'aspecte al sistema de disseny pot topar amb la regla «cap plantilla del skin sobreescrita sencera».                                                                                                 | factibilitat            | Important  |
| Si Roundcube no s'acosta prou a Gmail, els usuaris envien el correu oficial des de `@gcloud.ua.es` i l'objectiu institucional no s'aconseguix.                                                                | valor                   | Important  |
| Barrejar en un mateix pla objectius dels usuaris (deixar Gmail) i de la institució (sistema de disseny, antiphishing) dispersa l'esforç abans del termini.                                                    | viabilitat              | Important  |
| L'app de Gmail al mòbil podria deixar també d'enviar des de comptes de tercers, perquè la pàgina de Google es contradiu.                                                                                      | valor                   | Observació |
| Fer un plugin propi per a Nextcloud quan ja n'hi ha un de tercers que funciona amb Roundcube 1.7.                                                                                                             | factibilitat            | Observació |

## Dubtes oberts

| Dubte                                                                                                                                                                                                                                      | Acció de validació                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Quantes persones redirigixen a Gmail, i quantes de les 500 bústies d'unitat ho fan.                                                                                                                                                        | Comptar les regles de redirecció cap a dominis de Google al servidor de correu.                  |
| Quin servidor IMAP hi ha i si té ACL, carpetes compartides i _keywords_.                                                                                                                                                                   | Preguntar-ho a l'equip de sistemes de correu.                                                    |
| L'ús compartit d'usuari i contrasenya de les bústies d'unitat contradiu la §2 de les condicions d'ús. Es manté com està o s'ha de canviar?                                                                                                 | Ho ha de resoldre qui aplica la normativa (el SI o el responsable de seguretat), no el projecte. |
| Com es repartixen els correus entre els gestors d'una bústia d'unitat. Qui decidix qui contesta i què vigila qui coordina.                                                                                                                 | Parlar amb els gestors de dos o tres unitats amb volum alt i demanar-los un cas real recent.     |
| ~~Si la signatura basta o cal marcar que «un correu ja està agafat»~~. Resolt el 2026-11-15: en Gmail ja es fa assignant una etiqueta de persona i un estat kanban (`fonts/exemples/2026-11-gmail-bustia-compartida-etiquetes-kanban.md`). | —                                                                                                |
| Si els usuaris de Gmail feien servir Drive per a fitxers grans (lliga Nextcloud amb el termini).                                                                                                                                           | Preguntar-ho en els pròxims cursos o a un parell d'usuaris.                                      |
| Si l'app de Gmail al mòbil continuarà enviant des d'un compte IMAP @ua.es després del gener.                                                                                                                                               | Provar-ho ara en un mòbil, i tornar-ho a provar al gener.                                        |
| Si hi ha un plugin de tercers per a Nextcloud compatible amb Roundcube 1.7.                                                                                                                                                                | Revisar-ho abans del PRD.                                                                        |
| Quin és el document del sistema de disseny UACloud que cal seguir.                                                                                                                                                                         | Demanar-lo al seu responsable.                                                                   |

## Vocabulari de l'usuari

Termes de l'equip, que reprén el que senten en cursos i converses. No s'han recollit encara de la boca
dels usuaris:

- «bústia compartida»: una adreça (p. ex. `servei.informatica@ua.es`) que consulten i gestionen
  diverses persones alhora, amb el mateix usuari i contrasenya.
- «gestor online» (per als correus de les unitats), per oposició als clients «locals».
- «cua de treball» (en el correu compartit).
- «programació de l'enviament», «desfer un enviament».
- «etiquetes» (per a classificar la faena), per oposició a «carpetes».
- «envia correu com a…» (l'opció de Gmail).

## Mapa de viatge

No s'ha fet. El problema del correu personal ja està acotat. On es veu més la fricció és en la bústia
d'unitat, però per a fer-ne el mapa cal primer parlar amb gestors (vegeu «Dubtes oberts»). Es pot fer
després d'eixa conversa, si el PRD el necessita.

## Decisió

**Continuar**. Hi ha un termini extern documentat (Google, gener de 2027) i una norma
interna que diu que el correu oficial ha d'eixir de @ua.es. Les necessitats concretes tenen
l'evidència que han declarat els cursos i les converses amb usuaris, i cap solució actual les cobrix:
Thunderbird és local i Roundcube no les té. L'alternativa de Workspace no es valora.

Pas següent: `ua-requisits-producte`. Ha de fixar què ha d'estar llest el gener de 2027 i què va
després. En paral·lel, abans del PRD, convé resoldre els dubtes del servidor IMAP i de la conversa amb
gestors.

Confirmada per l'owner del projecte, 2026-11-15.
