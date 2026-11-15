# Pla: correu web sense Gmail, v1 (gener de 2027)

> `ua-planificador` · Esborrany: 2026-11-15 · Estat: **confirmat per l'owner del projecte, 2026-11-15** (en el xat)
> PRD: [`../projecte/prd.md`](../projecte/prd.md), validat per l'owner el 2026-11-15 · Problema:
> [`../projecte/problema.md`](../projecte/problema.md)

## Petició original

> «Molts usuaris de la UA utilitzen el servei de Gmail que la nostra llicència Google Workspace
> ofereix. Es desvien el correu de la UA, que està en els nostres servidors Gmail. En Gmail configuren
> l'opció "envia correu com a..." perquè els correus s'envien amb el domini @ua.es. Esta funcionalitat
> de Gmail desapareix al gener del 2027. […] Ens plantegem, doncs, ampliar les funcionalitats de
> Roundcube amb plugins propis, sense abandonar la solució base de Roundcube […]. A partir d'ací tenim
> una llista de possibles funcionalitats que ens agradaria integrar en un pla a curt termini.»
> (owner del projecte, 2026-11-15)

Respostes que van canviar l'abast (totes de l'owner, 2026-11-15; el detall és al PRD, `## Canvis`):

- Col·lectius: PDI i PTGAS. L'alumnat queda fora.
- Necessitats dels cursos i converses: gestor en línia per a les bústies d'unitat, programar i desfer
  l'enviament, etiquetes.
- v1 per al gener: bústia d'unitat, desfer, programar, etiquetes, persona responsable i estats com a
  etiquetes. Nextcloud, el sistema de disseny, les safates múltiples i el tour, després.
- Thunderbird queda fora. Les etiquetes no són excloents, n'hi ha de jeràrquiques i filtrar inclou les
  filles. Les quatre etiquetes de partida apareixen en tots els comptes.
- La persona responsable és una etiqueta com qualsevol altra. Desfer: 30 segons.
- En v1 les bústies d'unitat continuen amb la contrasenya compartida.
- Roundcube s'executa en un servidor PHP, i hi ha entorn de PRE. No hi ha ID de sol·licitud.
- Entorn local amb `docker compose`.

## Problema i usuari

- **PDI i PTGAS que deixen Gmail** (més de 1.000, segons una estimació de l'equip) necessiten en
  Roundcube el que hi feien: desfer i programar l'enviament, i etiquetes.
- **Gestors de bústia d'unitat (PTGAS)**, en unes 500 adreces, necessiten veure qui gestiona cada correu,
  en quin punt està i què s'hi ha contestat, perquè no hi haja respostes duplicades o contradictòries.

**Fora d'abast** del pla, a més del «No inclou» del PRD:

- cap canvi en el nucli de Roundcube ni en la seua configuració de producció dins d'este repositori;
- cap migració de les etiquetes de Gmail a Roundcube (no ho demana el PRD);
- cap importació de dades de Gmail.

**El que el requisit assumix sense dir-ho:**

- Obrir una bústia d'unitat alhora des de diverses sessions és el funcionament normal de Roundcube (i
  de Gmail): tots veuen el mateix, també «Enviats» i la marca de contestat (owner, 2026-11-15). No hi ha
  res a construir per a compartir la bústia. Com que tots entren amb el mateix usuari IMAP, les
  preferències i les identitats també són comunes, i les etiquetes ho seran si es guarden al servidor
  IMAP o en dades lligades a eixe usuari.
- Les etiquetes s'han de guardar al servidor IMAP, als missatges. Un nom com «A fer» o «Júlia» no es
  pot guardar tal qual com a _keyword_ (espais, accents), així que cal un catàleg d'etiquetes per
  compte que relacione el nom visible amb la _keyword_.
- Programar un enviament vol dir enviar quan la persona no té sessió. Sense sessió no hi ha
  contrasenya per a l'SMTP ni per a desar a «Enviats». Vegeu el risc B1.

## Prerequisits

- Entorn local: `docker compose` amb Roundcube 1.7, un Dovecot de proves i un capturador de correu, sense
  dades reals (entrega E-01).
- Accés a l'entorn de PRE: un compte personal i una bústia d'unitat de prova en l'IMAP de PRE.
- Una resposta de Sistemes sobre B1 abans de començar RF-05 (data límit: 2026-12-01; vegeu I2). La
  consulta la fa l'owner del projecte.
- Les ordes de build i de test (`composer`, `vendor/bin/phpunit`) s'escriuen a `CONTEXT-IA.md` quan
  E-01 les haja executades amb èxit.

## Complexitat: Alta

Hi ha tres plugins nous, un component de servidor, una peça de documentació i un termini extern de
set setmanes. **Es dividix: sí.** No cap en cinc passos com una sola entrega, i les entregues
tenen riscos independents: si l'IMAP no admet _keywords_, cauen les etiquetes, però no la cua
d'enviament.

## Riscos

| #   | Risc                                                                                                                                                                                                                                                                                                                                           | Nivell                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| B1  | **Credencials per a enviar sense sessió (RF-05).** El procés que envia un missatge programat no té la contrasenya de l'usuari. Hi ha dos opcions: guardar-la xifrada (amb `des_key`), o que el servidor tinga un relay SMTP de confiança i un usuari mestre IMAP per a desar a «Enviats». Ho decidixen Sistemes i el responsable de seguretat. | Bloquejant per a E-04 (no per a la resta) |
| I1  | **L'IMAP de PRE pot no admetre _keywords_ arbitràries** (`PERMANENTFLAGS \*`). Si no les admet, el disseny de RF-06, RF-13 i RF-14 canvia (taules pròpies en lloc de l'IMAP). Ho resol E-01.                                                                                                                                                   | Important                                 |
| I2  | **Termini.** Set setmanes per a quatre entregues de construcció i un cicle de proves. Decidit (owner, 2026-11-15): si l'1 de desembre de 2026 Sistemes no ha triat una opció per a B1, RF-05 passa a Posterior i la v1 ix sense programar l'enviament. La guia ho diu, i RF-05 es reprén com a entrega a banda quan hi haja resposta.          | Important                                 |
| I3  | **Contrasenya compartida.** RF-03 (T3, toca identitat) necessita el vistiplau del SI o del responsable de seguretat sobre la pràctica que contradiu la §2 de les condicions d'ús (decisió pendent del PRD).                                                                                                                                    | Important                                 |
| I4  | **Dependència entre plugins.** E-03 posa l'etiqueta de persona a la resposta (RF-02), i les etiquetes són d'E-02. Cada plugin s'ha de poder desactivar sol: si el d'etiquetes està desactivat, el de la bústia d'unitat ha de funcionar igual, sense etiqueta.                                                                                 | Important                                 |
| I5  | **`SEGURETAT.md` §0 està buida.** Fins que s'òmpliga, tot canvi és com a mínim T2. Els RF de la v1 són T3 i necessiten el vistiplau de qui respon de la dada, que encara no se sap qui és (decisió pendent del PRD).                                                                                                                           | Important                                 |
| O1  | **Càrrega de RF-04.** Si l'opció triada per a desfer reté un procés PHP durant 30 segons per enviament, amb 4.500 persones pot ocupar processos en les hores punta. Es mesura a E-01.                                                                                                                                                          | Observació                                |

**Impacte comptat**: 3 plugins nous, 1 component de servidor (cron), 1 conjunt de taules noves amb el
prefix de cada plugin, 0 canvis al nucli, 2 tipus de compte afectats (personal i bústia d'unitat), 3
pantalles de Roundcube on s'afig interfície (llista de missatges, lectura de missatge i redactor).

**Regressió possible**: si un plugin falla, pot deixar sense resposta l'enviament (E-04) o la llista de
missatges (E-02). Per això cada plugin es pot desactivar sol, traient-lo de `$config['plugins']`.

**Reversibilitat** (`ESTANDARDS.md` §9.1):

- Les taules noves i els plugins es desfan revertint i desactivant el plugin.
- Les _keywords_ que E-02 escriu als missatges es queden al servidor IMAP encara que es reverteixi el
  codi. Són inofensives, però no s'esborren soles. No cal partir l'entrega, però consta ací.
- Un missatge que ja ha eixit (E-04) no es pot desfer de cap manera. Puja un tier, i com que ja és T3,
  la irreversibilitat consta a l'informe de revisió.

**Consumidors de codi compartit**: buscat al repositori, no hi ha cap codi de plugins. El codi de
Roundcube no es modifica, i per tant no hi ha consumidors que es puguen trencar.

## Pla

**Estratègia**: Incremental. Primer un spike que valida el risc I1 (i O1), i després una entrega per
bloc de funcionalitat. **Entrega parcial**: sí. Cada entrega es pot posar en producció sola.

1. **E-01, spike i entorn.** Muntar `docker compose` (Roundcube 1.7, Dovecot, capturador de correu) i el
   `composer.json` del repositori. Comprovar contra l'IMAP de PRE si admet _keywords_ arbitràries.
   Revisar si hi ha plugins de tercers d'etiquetes o d'enviament diferit compatibles amb la 1.7 que
   puguem fer servir sense modificar-los. Mesurar l'opció de desfer de 30 segons. Eixida: una nota
   d'E-01 a `DECISIONS.md` amb el que s'ha decidit, i les ordes de build i test a `CONTEXT-IA.md`.
2. **E-02, etiquetes**: RF-06, RF-13 i RF-14. Un plugin d'etiquetes, amb un catàleg per compte,
   jeràrquiques, filtre que inclou les filles, i les quatre etiquetes de partida.
3. **E-03, bústia d'unitat**: RF-01, RF-02 i RF-03. RF-01 i la marca de contestat de RF-02 ja les fa
   Roundcube: només es proven amb E2E de dos sessions. Es construïx el que falta: que la resposta
   quede a «Enviats» amb totes les etiquetes del correu original (si E-02 està actiu), i que des de
   la bústia no es puga enviar sense una identitat amb nom de persona (RF-03).
4. **E-04, enviament diferit**: RF-04 i RF-05. RF-04: el servidor espera 30 segons amb les credencials
   de la sessió en memòria, sense cua, i no depén de B1. RF-05: cua amb les taules del plugin i un script
   CLI que un cron executa cada minut al servidor PHP de Roundcube, que comença quan B1 estiga resolt.
5. **E-05, ajuda**: RF-10 i RF-11, en paral·lel a E-02–E-04. La guia de migració de Gmail ha d'estar
   publicada abans del gener, i el manual dels plugins s'actualitza amb cada entrega.

Després d'E-02, E-03 i E-04 hi ha un cicle de proves amb gestors de bústia d'unitat en PRE (entrega
de validació E-06).

### Alternatives

**Desfer l'enviament, RF-04.** Triada l'opció A (owner, 2026-11-15).

- **A (triada)**: el procés PHP que rep l'enviament respon de seguida al navegador
  (`fastcgi_finish_request`), espera 30 segons amb les credencials de la sessió en memòria, i envia si
  ningú l'ha desfet. No guarda cap credencial ni depén de B1, i pot entrar en v1 encara que RF-05 es
  bloquege. Cost: un procés PHP ocupat 30 segons per enviament (risc O1, es mesura a E-01).
- **B**: RF-04 fa servir la mateixa cua que RF-05. Un sol mecanisme, però depén de B1, i el cron d'un
  minut no garantix els 30 segons.

**Component de servidor per a RF-05.** Triat el cron (owner, 2026-11-15).

- **Triat**: un cron cada minut al mateix servidor PHP de Roundcube, que executa un script CLI del
  plugin. El codi és d'este repositori i l'instal·la i l'opera Sistemes junt amb Roundcube. No cal cap
  servidor ni servei nou.
- Un _worker_ permanent no aporta res amb una precisió d'un minut i és un procés més que vigilar.
- Les regles Sieve no poden enviar un missatge a una hora.

### Criteris d'acceptació del pla

- Els criteris d'acceptació de RF-01–RF-06, RF-13 i RF-14 passen en PRE (E2E), i els de RF-10 i RF-11
  els ha revisat el CAU.
- Cada plugin es pot desactivar sol sense trencar els altres ni Roundcube. Prova: E2E amb cada plugin
  desactivat.
- **Què continua igual**: amb els plugins desactivats, Roundcube es comporta exactament com hui. El
  correu d'un compte sense etiquetes, sense programats i sense bústia d'unitat no canvia. La
  configuració de Roundcube de producció no es toca des d'este repositori.
- `composer` i `vendor/bin/phpunit` acaben amb codi 0, i se n'indica el nombre de tests.

### Cadena de skills

Per a cada entrega amb interfície (E-02, E-03, E-04), sobre les pantalles de Roundcube que es
modifiquen, que són de la fila «Canvi en una pantalla o component existent»:

1. `ua-especificacio-pantalla` en mode modificació (spec delta de la llista, del missatge i del redactor),
   amb `ua-estats-pantalla`, `ua-ux-redaccio` i `ua-i18n-valencia`.
2. `ua-proves-persona`: el pla de proves, abans del codi.
3. El codi: plugins PHP, amb tests `phpunit` i E2E amb Playwright. Cap skill del catàleg cobrix PHP o
   Roundcube. `ua-vue-uacloud` i `ua-vue-datos` no hi apliquen (no hi ha Vue).
4. El full de proves (`ua-proves-persona`, Pas 5).
5. `ua-review`, que inclou `ua-accessibilitat-wcag` i `ua-ux-review`.

E-05: `ua-docs-usuari` (manual i guia) → revisió del CAU. E-01: sense cadena; acaba amb l'entrada a
`DECISIONS.md`.

## Estimació

Cap mida està calibrada: el projecte no té cap entrega feta, i `compta-factors.js` i `calibratge.js` no
troben res que comptar (2026-11-15).

| Entrega                           | Fase 1                 | Fase 2                 | Fase 3b    | Què l'encarix                                                                                                   |
| --------------------------------- | ---------------------- | ---------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| E-01: spike i entorn              | Feta                   | Baixa (no calibrada)   | —          | Muntar l'entorn des de zero; dependència de l'accés a PRE                                                       |
| E-02: etiquetes                   | Pendent (3 spec delta) | Alta (no calibrada)    | —          | Plugin nou, catàleg per compte, jerarquia, filtre amb filles, tres pantalles                                    |
| E-03: bústia d'unitat             | Pendent (1 spec delta) | Baixa (no calibrada)   | —          | La compartició ja la fa Roundcube. Queden la identitat obligatòria i l'herència de l'etiqueta, que depén d'E-02 |
| E-04: enviament diferit           | Pendent (1 spec delta) | Alta (no calibrada)    | —          | Component de servidor, cua, gestió d'errors d'enviament, credencials (B1)                                       |
| E-05: guia de migració i manual   | —                      | Mitjana (no calibrada) | —          | Tres idiomes, HTML i PDF; la guia ha d'estar abans que el codi                                                  |
| E-06: cicle de proves amb gestors | —                      | —                      | Sense mida | No hi ha cicles previs per a calibrar                                                                           |

### Entregues

| Entrega | Tipus       | RF-XX o motiu                                                                              | Mida    | Spec                       |
| ------- | ----------- | ------------------------------------------------------------------------------------------ | ------- | -------------------------- |
| E-01    | Construcció | Motiu: entorn de desenvolupament i verificació de _keywords_ IMAP i de la càrrega de RF-04 | Baixa   | —                          |
| E-02    | Construcció | RF-06, RF-13, RF-14                                                                        | Alta    | specs/etiquetes.md         |
| E-03    | Construcció | RF-01, RF-02, RF-03                                                                        | Baixa   | specs/bustia-unitat.md     |
| E-04    | Construcció | RF-04, RF-05                                                                               | Alta    | specs/enviament-diferit.md |
| E-05    | Construcció | RF-10, RF-11                                                                               | Mitjana | —                          |
| E-06    | Validació   | RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-13, RF-14                                     | —       | —                          |

### Calibratge

| Entrega | Fase | Mida estimada | Rol | Hores reals | Min. agent actiu | Min. entre torns (≤30 / >30) | Desviació i per què |
| ------- | ---- | ------------- | --- | ----------: | ---------------: | ---------------------------: | ------------------- |

### Registre d'hores

| Data | Entrega | Fase | Rol | Hores | Moment |
| ---- | ------- | ---- | --- | ----: | ------ |

## Context Delta

- **RF afectats**: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-13, RF-14, RF-10, RF-11.
- **Fitxers nous**:
  - `docker-compose.yml` i la configuració de proves;
  - `composer.json`;
  - un directori per plugin (els noms es fixen a E-01), cadascun amb el seu `composer.json`, que declara
    Roundcube 1.7 com a versió mínima, i les seues taules amb prefix propi;
  - el script CLI d'E-04;
  - tests `phpunit` i E2E.
- **Pantalles de Roundcube on s'afig interfície**: llista de missatges, lectura del missatge i redactor.
  No se sobreescriu cap plantilla d'Elastic.
- **Impacte**: Alt. Afecta l'enviament de correu de les persones que activen els plugins.
- **PRD**: signat per l'owner el 2026-11-15.
- **Tasques per rol**: totes les de la v1 tenen una pantalla on es fan. Fora: les tasques del
  responsable o coordinador d'unitat (pendents de la conversa amb gestors al PRD), Nextcloud (RF-07,
  RF-08, Posterior) i les safates múltiples (RF-15, Posterior), que és on es veuria millor el recompte
  per estat. En v1, el recompte es veu filtrant per etiqueta (RF-14).
- **Documents a revisar en tancar la faena**:
  - `ARCHITECTURE.md`: stack, estructura i pipeline;
  - `CONTEXT-IA.md`: ordes de build i test;
  - `DECISIONS.md`: on es guarden les etiquetes, el mecanisme de desfer, la credencial de RF-05 i el nom
    dels plugins;
  - `SEGURETAT.md` §0: actius, és a dir el contingut del correu i, segons B1, les credencials;
  - `CONEIXEMENT-VIU.md`, amb el que es descobrisca a E-01;
  - `PROJECTE.md`, encara buit: el context i els usuaris ja es poden traure de `problema.md`.

## Ajornat

- RF-07 i RF-08 (Nextcloud), RF-09 (sistema de disseny), RF-12 (tour), RF-15 (safates múltiples) i
  RF-16 (accés per persona a les bústies d'unitat): tots són Posterior al PRD.
- Les tasques del responsable o coordinador d'unitat: pendents de la conversa amb gestors.

## Canvis

- 2026-11-15 — E-03 — Obrir una bústia d'unitat des de diverses sessions és el funcionament normal de
  Roundcube. RF-01 i la marca de contestat de RF-02 només es proven, i la mida d'E-03 baixa a Baixa —
  Per què: aclariment de l'owner — RF-01, RF-02 — Confirmat per: owner del projecte (abans de la
  confirmació del pla).
