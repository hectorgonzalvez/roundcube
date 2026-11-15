# PRD: Correu web de la UA sense Gmail

Problema: [`problema.md`](./problema.md)

> `ua-requisits-producte` · Redactat: 2026-11-15 · Estat: validat (2026-11-15)

## Objectius

- Quan Gmail retire el «Send as» per a adreces de tercers (gener de 2027), el PDI i el PTGAS que
  hi treballen hui poden continuar treballant amb el correu @ua.es al web, i no necessiten Gmail per
  a enviar correu oficial.
- Una bústia d'unitat la porten diverses persones sense contestar dos vegades el mateix correu i
  sense contestar-lo de maneres diferents.
- El correu oficial continua eixint des de @ua.es (comunicat de 2022, regles 2 i 4.1), i no des de
  `@gcloud.ua.es` ni des d'adreces personals.

## Criteris d'èxit

- El dia que Gmail retira la funció, les funcionalitats v1 (RF-01 a RF-06, RF-13 i RF-14) i l'ajuda
  v1 (RF-10 i RF-11) estan en producció en Roundcube, i la guia de migració està publicada abans.
- En una bústia d'unitat, un gestor que va a contestar un correu veu abans si un company ja l'ha
  contestat, què li ha dit i qui ho ha fet.
- El nombre de persones i bústies d'unitat que redirigixen a Gmail baixa després del gener. La
  xifra objectiu està pendent (vegeu «Decisions pendents»).

## Mètriques

- **Persones i bústies d'unitat que redirigixen el correu a Gmail** — Base: pendent de mesura (l'equip
  estima més de 1.000 persones; no hi ha dada de bústies) — Com es mesurarà: comptant les regles de
  redirecció cap a dominis de Google al servidor de correu, ara i un mes després del gener — Qui:
  equip de sistemes de correu.
- **Persones que fan servir Roundcube** — Base: pendent de mesura — Com es mesurarà: comptant
  persones distintes que hi entren al mes, en agregat (sense identificar ningú) — Qui: equip del
  projecte.
- **Respostes duplicades o contradictòries en bústies d'unitat** — Base: pendent de mesura (hi ha
  casos declarats, sense comptar) — Com es mesurarà: pendent de decidir. Una opció és preguntar
  als gestors de les unitats de la conversa de validació abans i després de RF-01–RF-03 — Qui: equip
  del projecte.
- **Consultes al CAU sobre la migració des de Gmail** — Base: pendent de mesura — Com es
  mesurarà: comptant els tiquets de la categoria que el CAU obriga per a la migració — Qui: CAU.

## Abast

### Inclou

- Treball de diverses persones en una mateixa bústia d'unitat en Roundcube: veure les respostes
  dels altres, signar amb el nom propi, assignar una persona responsable a cada correu i portar-ne
  l'estat.
- Vista en safates múltiples (Posterior).
- Desfer un enviament i programar-lo.
- Etiquetes per a classificar els missatges.
- Adjunts grans com a enllaç de Nextcloud i desar a Nextcloud un adjunt rebut (Posterior).
- Aspecte de Roundcube coherent amb el sistema de disseny UACloud (Posterior).
- Guia de migració de Gmail a Roundcube, manual dels plugins i, si es pot, tour.
- Destinataris: PDI i PTGAS, amb el correu personal i amb les bústies d'unitat.

### No inclou

- L'alumnat.
- El mòbil: les persones usuàries continuen amb l'app de Gmail.
- Mantindre el «Send as» de Gmail afegint `ua.es` al Workspace de la UA.
- El que facen els gestors i altres usuaris en Thunderbird o en qualsevol altre client: les
  funcionalitats d'este PRD només es garantixen en Roundcube (owner del projecte, 2026-11-15).
- Funcionalitats del document de propostes de 2026-11-12 que no ixen del problema: antiphishing, avís
  de destinatari extern, plantilles, IA, posposar, recordatoris, categories, dreceres de teclat,
  vista prèvia d'adjunts, cancel·lar subscripcions, integració amb el directori de UACloud.
- Canvis en el nucli de Roundcube, `vendor/` o plugins de tercers.
- Canviar la manera d'entrar a les bústies d'unitat (usuari i contrasenya compartits). És una decisió
  pendent de qui aplica la normativa; este PRD només en recull l'impacte.

## Tasques per rol

| Rol                                        | Tasca                                                                            | Freqüència         | Decisió que pren                               | Informació que necessita                                 | On la té hui                                                                                   | RF                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Gestor de bústia d'unitat (PTGAS)          | Que cada correu que arriba a la unitat tinga una sola resposta, coherent         | diària             | Si contesta un correu o ja està contestat      | Si algú ja l'ha contestat, què li ha dit i qui           | Enlloc amb Thunderbird (cada resposta queda en la màquina de qui l'envia); al web de Gmail, sí | RF-01, RF-02                                                  |
| Gestor de bústia d'unitat (PTGAS)          | Que el destinatari sàpia qui li ha contestat en nom de la unitat                 | diària             | Amb quin nom firma                             | La seua identitat dins de la bústia compartida           | Signatura escrita a mà, si n'hi ha                                                             | RF-03                                                         |
| Gestor de bústia d'unitat (PTGAS)          | Tindre classificada la faena de la unitat                                        | diària             | Com classifica un correu                       | Etiquetes que pot combinar en un mateix missatge         | Carpetes, i etiquetes al web de Gmail si la bústia està redirigida                             | RF-06                                                         |
| Gestor de bústia d'unitat (PTGAS)          | Que cada correu tinga una persona que en respon                                  | diària             | A qui li toca un correu                        | Qui és el responsable de cada correu i quins no en tenen | Etiqueta de persona al web de Gmail; enlloc amb Thunderbird                                    | RF-13                                                         |
| Gestor de bústia d'unitat (PTGAS)          | Saber en quin punt està cada correu de la unitat                                 | diària             | Què cal moure o reprendre                      | Les etiquetes d'estat de cada correu i quants n'hi ha    | Etiquetes kanban i safates múltiples al web de Gmail; enlloc amb Thunderbird                   | RF-14, RF-15                                                  |
| PDI i PTGAS (correu personal)              | Enviar correu oficial amb @ua.es sense errors irreversibles                      | diària             | Si retira un missatge que acaba d'enviar       | Uns segons per a adonar-se'n                             | Desfer de Gmail                                                                                | RF-04                                                         |
| PDI i PTGAS (correu personal i d'unitat)   | Que un missatge arribe quan convé, encara que en eixe moment no estiga connectat | setmanal (supòsit) | Quan s'envia                                   | Data i hora d'enviament, i si s'ha enviat                | Enviament programat de Gmail                                                                   | RF-05                                                         |
| PDI i PTGAS (correu personal)              | Tindre classificada la seua faena                                                | diària             | Com classifica un correu                       | Etiquetes que pot combinar en un mateix missatge         | Etiquetes de Gmail                                                                             | RF-06                                                         |
| PDI i PTGAS                                | Compartir i guardar fitxers grans sense eixir del correu                         | puntual (supòsit)  | On guarda un adjunt i com envia un fitxer gran | Les seues carpetes de Nextcloud                          | Desconegut (hipòtesi: Google Drive)                                                            | RF-07, RF-08                                                  |
| Responsable o coordinador d'unitat (PTGAS) | Desconeguda: no s'ha preguntat                                                   | —                  | —                                              | —                                                        | —                                                                                              | fora d'abast fins a la conversa amb gestors (decisió pendent) |
| CAU                                        | Que qui deixa Gmail puga treballar en Roundcube des del primer dia               | puntual (migració) | Com resol cada consulta                        | Una guia de migració de referència                       | No n'hi ha                                                                                     | RF-10                                                         |

## Requisits funcionals

> SEGURETAT.md §0 està buida. Segons ESTANDARDS.md §9.1, mentre no s'òmpliga tot canvi es tracta
> com a mínim com a **T2**. Els RF que toquen el contingut dels missatges són T3: el correu porta
> dades personals de remitents i destinataris.

### Gestor de bústia d'unitat

- **RF-01** — En una bústia d'unitat oberta en Roundcube, qualsevol gestor veu les respostes que han
  enviat els altres gestors des d'eixa bústia, junt amb el missatge que contesten. — Prioritat:
  **Imprescindible (v1)**
  - Criteris d'acceptació:
    - Si el gestor A contesta un missatge des de Roundcube, el gestor B, que té la mateixa bústia
      oberta en una altra sessió, veu la resposta associada al missatge original sense haver de
      buscar-la. — Prova: E2E amb dos sessions sobre la mateixa bústia de prova.
  - Dada i permís: personal (contingut del correu) · toca autorització: no → Tier: **T3**
- **RF-02** — En la llista de missatges d'una bústia d'unitat, cada gestor veu quins missatges ja
  estan contestats i qui els ha contestat, abans d'obrir-los. — Prioritat: **Imprescindible (v1)**
  - Criteris d'acceptació:
    - Després que el gestor A conteste un missatge, el gestor B el veu marcat com a contestat a la
      llista quan s'actualitza. — Prova: E2E amb dos sessions.
    - La resposta queda a «Enviats» amb totes les etiquetes del correu que contesta, també la de la
      persona que l'ha gestionat (RF-13), sense que ningú les haja de posar. Tots els gestors la veuen
      allí fins que algú l'esborre. — Prova: E2E amb dos sessions.
    - Un missatge que ningú ha contestat no apareix com a contestat. — Prova: E2E.
  - Dada i permís: personal (qui ha contestat a qui) · toca autorització: no → Tier: **T3**
  - Font: declaració de l'equip (respostes duplicades i contradictòries, `problema.md` § Evidència).
    Les respostes a «Enviats» amb l'etiqueta de qui ha gestionat el correu: declaració de l'owner,
    2026-11-15.
- **RF-03** — Cada resposta que ix d'una bústia d'unitat porta el nom de la persona que la firma, a
  més del nom de la unitat. — Prioritat: **Imprescindible (v1)**
  - Criteris d'acceptació:
    - El destinatari rep el missatge des de l'adreça de la unitat, i el missatge identifica la
      persona que l'ha escrit. — Prova: E2E que envia a una bústia de prova i comprova el missatge
      rebut.
    - Un gestor no pot enviar des de la bústia d'unitat sense que conste el nom d'alguna persona. Com
      l'accés és amb la contrasenya compartida, el sistema no pot comprovar que el nom és el de qui
      escriu (vegeu «Riscos»). — Prova: E2E.
  - Dada i permís: personal (nom de la persona) · toca autorització: sí (identitat dins d'un compte
    compartit) → Tier: **T3**
  - Font: declaració de l'equip («l'ideal seria que firmaren amb el nom de cada usuari», 2026-11-15).
    Accés amb contrasenya compartida en v1: decisió de l'owner, 2026-11-15.

### PDI i PTGAS (correu personal i bústies d'unitat)

- **RF-04** — Després d'enviar un missatge, la persona té 30 segons per a desfer l'enviament. Si el
  desfà, el missatge no ix i torna al redactor tal com estava. — Prioritat: **Imprescindible (v1)**
  - Criteris d'acceptació:
    - Si es desfà dins dels 30 segons, cap destinatari rep el missatge, i el redactor conserva el
      text, els destinataris i els adjunts. — Prova: E2E amb una bústia de destinació de prova.
    - Passats els 30 segons, el missatge s'envia encara que la persona haja tancat la pestanya o la sessió.
      — Prova: E2E.
  - Dada i permís: personal (contingut del correu retingut) · toca autorització: no → Tier: **T3**
  - Font: declaració de l'equip (cursos i converses). 30 segons: decisió de l'owner, 2026-11-15.
- **RF-05** — La persona pot programar un missatge perquè s'envie en una data i una hora. S'envia
  encara que en eixe moment no estiga connectada. — Prioritat: **Imprescindible (v1)**
  - Criteris d'acceptació:
    - Un missatge programat s'envia a l'hora indicada amb la sessió tancada. — Prova: test
      d'integració del component de servidor amb un rellotge controlat.
    - Fins a l'hora d'enviament, la persona veu els missatges programats i en pot cancel·lar o
      canviar l'hora de cada un. Un missatge cancel·lat no ix. — Prova: E2E.
    - Si l'enviament falla, la persona ho sap, i el missatge no es perd. — Prova: test d'integració
      amb un SMTP que rebutja.
    - Funciona també des d'una bústia d'unitat. — Prova: E2E.
  - Dada i permís: personal (missatges guardats fins a l'enviament) · toca autorització: no → Tier:
    **T3**, que és el sostre. Com que un missatge enviat no es pot desfer revertint, la
    irreversibilitat ha de constar a l'informe (ESTANDARDS.md §9.1).
  - Font: declaració de l'equip (cursos i converses).
- **RF-06** — La persona pot crear etiquetes, organitzar-les en nivells (una etiqueta dins d'una
  altra), posar a un mateix missatge cap etiqueta, una o diverses, llevar-les i veure els missatges
  que porten una etiqueta. Les etiquetes no mouen el missatge de carpeta. En una bústia d'unitat, les
  etiquetes són comunes a tots els gestors. — Prioritat: **Imprescindible (v1)**
  - Criteris d'acceptació:
    - Un missatge amb dos etiquetes apareix quan es filtra per qualsevol de les dos, i continua a la
      seua carpeta. — Prova: E2E.
    - Una etiqueta de segon nivell o més (p. ex. `Fet/«unitat»/«tema»`) es mostra dins de la seua
      mare, i filtrar per la mare mostra també els missatges de totes les filles. — Prova: E2E.
    - Les etiquetes es mantenen en tancar la sessió i en tornar a entrar. — Prova: E2E.
    - En una bústia d'unitat, l'etiqueta que posa el gestor A la veu el gestor B en el mateix missatge.
      — Prova: E2E amb dos sessions.
  - Dada i permís: de gestió (metadada del missatge), sobre una dada personal · toca autorització:
    no → Tier: **T3**
  - Font: declaració de l'equip («més flexible que les carpetes de Thunderbird o Roundcube»).
    Etiquetes jeràrquiques i compartides: com es fa hui en Gmail
    (`doc-projecte/fonts/exemples/2026-11-gmail-bustia-compartida-etiquetes-kanban.md`).
- **RF-13** — En una bústia d'unitat, la persona que gestiona cada correu s'indica amb una etiqueta
  amb el seu nom (p. ex. «Rosa», «Júlia», «Manuel»). És una etiqueta com qualsevol altra (RF-06): la
  creen els mateixos gestors, una per persona, i quan arriba un gestor nou se'n crea una altra. —
  Prioritat: **Imprescindible (v1)**
  - Criteris d'acceptació:
    - Si el gestor A posa a un missatge l'etiqueta del gestor B, tots els gestors la veuen, a la llista
      i dins del missatge. — Prova: E2E amb dos sessions.
    - L'etiqueta es manté en el missatge fins que algú la lleva. — Prova: E2E.
    - Es poden veure només els missatges amb l'etiqueta d'una persona. — Prova: E2E.
  - No necessita cap comportament propi a banda de RF-06: este RF existix perquè el procediment de la
    bústia d'unitat quede escrit i provat.
  - Dada i permís: personal (qui gestiona cada correu) · toca autorització: no → Tier: **T3**
  - Font: com es fa hui en Gmail, amb una etiqueta per persona
    (`doc-projecte/fonts/exemples/2026-11-gmail-bustia-compartida-etiquetes-kanban.md`, punts 1 i 2).
- **RF-14** — Tots els comptes, personals i de bústia d'unitat, porten de partida les etiquetes
  d'estat `A fer`, `Esperant`, `En procés` i `Fet`, per a saber en quin punt està cada correu. Són etiquetes com les altres
  (RF-06): no excloents entre elles, i els gestors en poden crear de noves. — Prioritat:
  **Imprescindible (v1)**
  - Criteris d'acceptació:
    - Un compte personal i una bústia d'unitat que entren per primera vegada amb el plugin actiu ja
      tenen les quatre etiquetes, sense que ningú les haja creat. — Prova: E2E sobre un compte i una
      bústia de prova nous.
    - Es poden veure els missatges d'una etiqueta d'estat, i quants n'hi ha. — Prova: E2E.
    - Un gestor pot crear una etiqueta nova al costat de les de partida. — Prova: E2E.
  - Dada i permís: de gestió (metadada del missatge), sobre una dada personal · toca autorització:
    no → Tier: **T3**
  - Font: llista de partida i regla «etiquetes com les altres» decidides per l'owner el 2026-11-15, a
    partir de com es fa hui en Gmail
    (`doc-projecte/fonts/exemples/2026-11-gmail-bustia-compartida-etiquetes-kanban.md`, punt 3).

### PDI i PTGAS — Posterior

- **RF-07** — En redactar, la persona pot enviar un fitxer com a enllaç de Nextcloud en lloc d'adjuntar-lo. — Prioritat: **Posterior**
- **RF-08** — La persona pot desar a Nextcloud un adjunt rebut sense descarregar-lo abans. — Prioritat: **Posterior**
- **RF-09** — Roundcube té un aspecte coherent amb el sistema de disseny UACloud. — Prioritat: **Posterior**
- **RF-15** — La persona pot organitzar la vista en diverses safates alhora, una per etiqueta, cada una
  amb els seus missatges i el seu recompte (com les «safates múltiples» de Gmail). — Prioritat:
  **Posterior**
- **RF-16** — Cada gestor entra a la bústia d'unitat amb la seua identitat, sense contrasenya
  compartida (delegació en persones o una alternativa), si és tècnicament viable. — Prioritat:
  **Posterior**, i cal estudiar abans si és viable.

Els criteris d'acceptació de RF-07 a RF-09, RF-15 i RF-16 s'escriuran quan es trie la faena que els construïx, amb
una entrada a `## Canvis`.

### Ajuda a l'usuari

- **RF-10** — Guia de migració de Gmail a Roundcube: per a PDI i PTGAS que venen de Gmail. Diu on
  està cada cosa que feien en Gmail i com es fa en Roundcube, també en una bústia d'unitat. En
  valencià, castellà i anglés, en HTML i PDF. És la referència del CAU. — Prioritat:
  **Imprescindible (v1)**, i ha d'estar publicada abans del gener de 2027. _Prova_: revisió de la
  guia per part del CAU i PDF generat.
  - Dada i permís: cap · toca autorització: no → Tier: **T0**
- **RF-11** — Manual dels plugins: una secció per plugin, en valencià, castellà i anglés, en HTML i
  PDF descarregable. — Prioritat: **Imprescindible (v1)** per als plugins v1. _Prova_: PDF generat en
  el build i enllaç accessible des de Roundcube.
  - Dada i permís: cap · toca autorització: no → Tier: **T0**
- **RF-12** — Tour de les funcionalitats noves: la primera vegada que una persona troba una
  funcionalitat d'un plugin, si es pot fer sense tocar el nucli ni sobreescriure plantilles. —
  Prioritat: **Posterior**, a l'espera de saber si és viable (decisió pendent).

## Requisits no funcionals

- **Volum**: unes 4.500 persones de PDI i PTGAS, més de 1.000 venen de Gmail, i hi ha unes 500 adreces
  d'unitat (declaració de l'equip, `problema.md`). Una bústia d'unitat la poden tindre oberta diverses
  persones alhora, en sessions diferents i amb el mateix usuari. RF-01 a RF-03 han de funcionar en eixe
  cas.
- **Servei de fons**: RF-05 i la part de RF-04 que envia amb la sessió tancada necessiten un component
  que s'execute fora de la sessió de Roundcube (`doc-projecte/fonts/` · document de propostes,
  2026-11-12). La seua disponibilitat condiciona que el missatge isca a l'hora.
- **Integració obligatòria**: el servidor IMAP i SMTP de la UA, i Nextcloud de la UA per a RF-07 i
  RF-08.
- **Plataforma**: Roundcube 1.7 amb plugins propis; cada plugin es pot desactivar sol
  (`CONTEXT-IA.md` § Regles d'este projecte).

## Compliment normatiu

### ENS

Pendent. La categoria del sistema de correu no consta en cap document del projecte, i la fixa qui en
respon, no este PRD. Vegeu «Decisions pendents».

### RGPD

**Quina dada personal apareix** (camps mirats als RF):

- El contingut, els remitents i els destinataris dels missatges, a tots els RF.
- El nom de la persona que contesta des d'una bústia d'unitat (RF-02, RF-03).
- Els missatges que es guarden fora de la bústia fins a l'enviament (RF-04 i RF-05): una còpia nova
  amb un temps de vida propi.
- Les etiquetes, que poden descriure la persona o el cas (RF-06).

**Base legal**: pendent. **Temps de conservació** dels missatges programats i retinguts, i del registre
de qui ha contestat: pendent. Vegeu «Decisions pendents».

Categoria especial: no es tracta cap camp de categoria especial com a tal. Ara bé, el contingut d'un
correu pot contindre'n, i el sistema no ho distingix. Si cal una avaluació d'impacte, és una decisió
pendent del responsable del tractament amb el Delegat de Protecció de Dades.

Qui respon de la dada: pendent. Vegeu «Decisions pendents».

### Accessibilitat i disseny

El que afigen els plugins a la interfície (botons, avisos, llistes de programats, etiquetes) ha de
complir WCAG 2.2 AA (`ua-accessibilitat-wcag`). Les pantalles de base són d'Elastic, el tema de
Roundcube, i no es reescriuen (`CONTEXT-IA.md`). Els components del sistema de disseny UA
(`ua-vue-uacloud`) són de Vue i no s'apliquen a Roundcube. L'aproximació al sistema de disseny és
RF-09 (Posterior).

### Internacionalització

Valencià per defecte, i també castellà i anglés, en tots els textos que afigen els plugins i en el
correu que generen (per exemple, l'avís d'un enviament programat que ha fallat). La terminologia ve
d'`ua-i18n-valencia`. El mecanisme tècnic d'aquell skill (`t()` de vue-i18n, sufixos d'Oracle) no
s'aplica a Roundcube, que té la seua pròpia localització de plugins. Com es fa ací ho decidix
`ua-planificador`.

## Ajuda a l'usuari

Aplica: per als que deixen Gmail, Roundcube i els plugins són nous. Els requisits són RF-10 (guia de
migració), RF-11 (manual dels plugins) i RF-12 (tour). Estan definits a «Requisits funcionals» §
«Ajuda a l'usuari», perquè la comprovació de traçabilitat (`kit-si-ua/ci-plantilla/producte.js`) només
llig els RF d'eixa secció.

## Restriccions, riscos i dependències

### Restriccions

- Gmail retira el «Send as» per a adreces de tercers al gener de 2027, i pot restringir configuracions
  noves abans ([Google, answer/17101213](https://support.google.com/mail/answer/17101213)).
- No es toca el nucli de Roundcube, `vendor/` ni plugins de tercers. Només s'usa l'API pública de
  plugins, i cap plantilla del skin es sobreescriu sencera (`CONTEXT-IA.md`).
- La base és Roundcube 1.7. Cada plugin es pot desactivar sol, i les seues taules porten prefix
  propi.
- El correu oficial s'envia des de @ua.es (comunicat de 2022, regla 4.1).

### Riscos

- **Termini**: entren sis funcionalitats v1 i dos documents en uns dos mesos, una d'elles amb
  component de servidor (RF-05) i una altra amb decisions pendents que la bloquegen (RF-01–RF-03).
- **Volum desconegut**: si són molt més de 1.000 persones, el suport del CAU al gener pot no ser
  suficient (supòsit de `problema.md`).
- **Mòbil**: la pàgina de Google es contradiu sobre si l'app de Gmail continuarà enviant des d'un
  compte de tercers. Si deixa de fer-ho, apareix una necessitat que este PRD no cobrix (supòsit de
  `problema.md`).
- **Abandonament**: si Roundcube no s'acosta prou a Gmail, el correu oficial acaba eixint des de
  `@gcloud.ua.es`.
- **Contrasenya compartida**: la v1 es construïx sobre la contrasenya compartida (decisió de l'owner), i
  les condicions d'ús de 2016 (§2) diuen que les claus són d'ús exclusiu de qui en és titular. La v1
  pot consolidar eixa pràctica. A més, el sistema no pot comprovar que el nom que firma una resposta
  (RF-03) o l'etiqueta de persona (RF-13) siguen de qui ha escrit de veres. RF-16 és la via per a
  resoldre-ho.
- **Nextcloud**: si els que venen de Gmail feien servir Drive per als fitxers grans, deixar RF-07 per a
  després pot pesar més del previst (supòsit de `problema.md`, sense validar).

### Dependències

- **Servidor IMAP de la UA**: el tipus de servidor i si permet ACL, carpetes compartides i _keywords_.
  Condiciona RF-01, RF-02 i RF-06.
- **Component de servidor** per a RF-05 (i RF-04 amb la sessió tancada), allotjat i operat pel SI.
- **CAU**: revisa RF-10 i atén la migració.
- **Nextcloud de la UA** (RF-07, RF-08) i **sistema de disseny UACloud** (RF-09), quan es tracten.

### Decisions preses

- L'alumnat queda fora (equip, 2026-11-15).
- El mòbil queda fora: es continua amb l'app de Gmail (equip, 2026-11-15).
- No es valora afegir `ua.es` al Workspace (equip, 2026-11-15).
- v1, per al gener de 2027: RF-01 a RF-06, RF-10, RF-11, RF-13 i RF-14 (owner del projecte,
  2026-11-15).
- Posterior: Nextcloud (RF-07, RF-08), sistema de disseny (RF-09), tour (RF-12), safates múltiples
  (RF-15) i accés per persona a les bústies d'unitat (RF-16) (owner del projecte, 2026-11-15).
- No cal «agafar» un correu a banda: la responsabilitat s'indica amb una etiqueta de persona, com
  qualsevol altra etiqueta, que creen els mateixos gestors (RF-13) (owner del projecte, 2026-11-15).
- Les etiquetes de partida apareixen en tots els comptes, personals i de bústia d'unitat (owner del
  projecte, 2026-11-15).
- L'interval per a desfer l'enviament és de 30 segons (owner del projecte, 2026-11-15).
- Les respostes queden a «Enviats» amb l'etiqueta de qui ha gestionat el correu, i les veuen tots
  els gestors fins que algú les esborra. No cal fixar un temps màxim perquè un gestor veja la
  resposta d'un company (owner del projecte, 2026-11-15).
- En v1 les bústies d'unitat continuen amb la contrasenya compartida. L'accés per persona s'estudiarà
  en una segona fase (RF-16) (owner del projecte, 2026-11-15).
- Un correu pot tindre cap etiqueta, una o diverses. Les d'estat (`A fer`, `Esperant`, `En procés`,
  `Fet`) són les de partida, i són etiquetes com les altres, no excloents: impedir-ho complicaria la
  programació. Els usuaris en poden crear de noves. Filtrar per una etiqueta inclou les filles (owner
  del projecte, 2026-11-15).
- Thunderbird i els altres clients queden fora del projecte (owner del projecte, 2026-11-15).
- En una bústia d'unitat, les etiquetes són comunes a tots els gestors, i n'hi ha de jeràrquiques (owner
  del projecte, 2026-11-15).
- Les bústies d'unitat entren a l'abast. Es confirma així el supòsit que són les més afectades, encara
  que no s'ha mesurat quantes estan redirigides a Gmail.

### Decisions pendents

- **Contrasenya compartida i condicions d'ús (§2)**: la v1 manté una pràctica que la §2 no admet.
  Qui aplica la normativa ha de saber-ho i acceptar-ho mentre no arriba RF-16. — Impacte: no bloqueja
  la construcció, però sí la PR de RF-03 (T3, toca identitat). — La resol: el SI o el responsable
  de seguretat.
- **Capacitats del servidor IMAP** (ACL, carpetes compartides, _keywords_). — Impacte: bloqueja RF-06,
  RF-13 i RF-14, i condiciona RF-01 i RF-02. — La resol: l'equip de sistemes de correu.
- **Tasques del responsable o coordinador d'unitat**. — Impacte: pot afegir RF a la bústia d'unitat. — La
  resol: la mateixa conversa amb gestors.
- **Categoria ENS del sistema de correu**: la que corresponga segons l'ENS (owner, 2026-11-15). Cal
  que algú la determine i diga on consta. — Impacte: condiciona la revisió de tots els RF. — La
  resol: el responsable de seguretat del SI.
- **Base legal, temps de conservació** dels missatges programats i retinguts i del registre de qui
  contesta, i **qui respon de la dada**. — Impacte: bloqueja la PR de RF-02, RF-04 i RF-05 (el tier T3
  demana el vistiplau). — La resol: el responsable del tractament, amb el Delegat de Protecció de
  Dades.
- **Xifra objectiu de la reducció de redireccions a Gmail**. — Impacte: no bloqueja cap RF. — La
  resol: l'owner del projecte, quan hi haja la mesura de base.
- **Viabilitat del tour** dins de l'API pública de plugins (RF-12). — Impacte: només RF-12. — La
  resol: `ua-planificador`.

## Aspectes deliberadament NO especificats

Este PRD no decidix:

- l'arquitectura dels plugins ni com es reparteixen els RF entre ells;
- el component de servidor per a l'enviament programat (cron, worker, Sieve);
- com es guarden les etiquetes ni les respostes de la bústia d'unitat (IMAP, taules pròpies);
- el disseny de cap pantalla, botó o avís;
- el contracte amb Nextcloud.

Tot això ho decidixen `ua-planificador` i `ua-especificacio-pantalla`.

## Validació final

Si es construïra exactament açò, es resoldria el problema inicial? **Sí**.

Per què: cobrix les quatre necessitats declarades per als que deixen Gmail (bústia compartida, desfer,
programar, etiquetes) i, a la bústia d'unitat, les dues peces del procediment de hui en Gmail que
eviten les respostes duplicades: una persona responsable per correu i l'estat de cada correu. A més,
dona una guia perquè la migració es puga fer abans del gener. Les decisions
pendents bloquegen el detall d'alguns RF, però no canvien el problema.

Què no ix del problema, d'una font o d'una decisió d'algú: la guia de migració (RF-10) la va proposar
l'agent, i l'owner la va acceptar el 2026-11-15. Els criteris d'acceptació que diuen que el missatge
s'envia amb la sessió tancada (RF-04, RF-05) ixen del que fa Gmail i del document de propostes, no
d'una declaració d'usuari. S'han mirat totes les xifres: totes tenen origen o estan a «Decisions
pendents».

Validat per: owner del projecte — Data: 2026-11-15 _(confirmat a la conversa)_

## Pas següent

`ua-planificador`

## Canvis

- 2026-11-15 — RF-06 — S'hi afigen les etiquetes jeràrquiques i compartides en una bústia d'unitat —
  Per què: és com es gestionen hui les bústies compartides en Gmail (exemple aportat per l'owner).
- 2026-11-15 — RF-13, RF-14 (v1) i RF-15 (Posterior), nous — Per què: el mateix exemple; prioritat
  fixada per l'owner. Es tanca la decisió pendent sobre «agafar» un correu.
- 2026-11-15 — RF-14 — Deixa de ser un estat excloent i passa a ser un conjunt d'etiquetes de partida,
  com les altres. RF-06: el filtre per etiqueta inclou les filles, i un correu pot tindre cap
  etiqueta, una o diverses. RF-01 i RF-06: es lleven els criteris sobre Thunderbird — Per què:
  decisions de l'owner. Thunderbird queda fora del projecte.
- 2026-11-15 — RF-13 passa a ser una etiqueta de persona com qualsevol altra. RF-14: les etiquetes de
  partida, a tots els comptes. RF-04: 30 segons. RF-02: les respostes a «Enviats» amb l'etiqueta de qui
  ha gestionat el correu, sense temps màxim. RF-03: contrasenya compartida en v1. RF-16 nou
  (Posterior): accés per persona a les bústies d'unitat — Per què: decisions de l'owner. PRD validat
  per l'owner després d'estos canvis.
- 2026-11-15 — RF-02 — La resposta hereta automàticament totes les etiquetes del correu original, no
  només la de persona — Per què: decisió de l'owner («Les etiquetes es conserven quan un missatge passa
  a Enviats»). Precisa un criteri de la v1 sense canviar l'abast. La va prendre la mateixa persona que
  ha validat el PRD, en esta conversa.
- 2026-11-15 — RF-10, RF-11, RF-12 — Es mouen de «## Ajuda a l'usuari» a «Requisits funcionals» §
  «Ajuda a l'usuari», amb el format `- **RF-XX** —` i la dada i el tier de RF-10 i RF-11. No canvia el
  contingut — Per què: `comprova-tracabilitat.js` només llig els RF de «Requisits funcionals» i
  donava error perquè el pla cita RF-10 i RF-11 a E-05.
