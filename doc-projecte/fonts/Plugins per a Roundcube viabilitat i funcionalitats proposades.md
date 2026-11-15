# Plugins per a Roundcube: viabilitat i funcionalitats proposades

Nov 12, 2026 · @Linxun

## Resposta curta

Sí, és perfectament factible: el sistema de plugins és un dels punts forts de Roundcube.

El límit és que Roundcube és un client web que parla amb IMAP i SMTP, sense cap procés en segon pla. Les funcionalitats que han de passar quan l'usuari no està connectat (enviament programat, posposar, recordatoris) necessiten un component de servidor a banda: un cron, un worker o regles Sieve.

## Com funcionen els plugins

Un plugin és una classe PHP que estén `rcube_plugin`; al mètode `init()` registra els hooks, les accions i els scripts de client. Els hooks s'executen en diversos moments del processament i poden modificar o ampliar el comportament per defecte. A la part de client, jQuery ja està integrat.

Amb això un plugin pot:

- afegir botons, menús i panells a la interfície (skin Elastic)
- crear accions i pantalles pròpies, fins i tot una «task» nova
- afegir seccions a Preferències
- interceptar l'enviament, la lectura, el renderitzat i el desament de missatges
- tindre taules pròpies a la base de dades i una configuració pròpia

**Versió de referència:** Roundcube 1.7.0 es va publicar el 10 de maig de 2026 i la branca 1.6.x ha passat a manteniment LTS, només amb actualitzacions de seguretat. La 1.7 inclou alguns canvis incompatibles, així que convé desenvolupar directament sobre la 1.7.

## Què ja existeix

Abans de crear res, convé descartar el que ja ofereixen plugins inclosos o de tercers.

| Necessitat | Plugin existent |
| --- | --- |
| Filtres i resposta automàtica | `managesieve` |
| Xifratge PGP | `enigma` |
| Marcar com a correu brossa | `markasjunk` |
| Descarregar adjunts en ZIP | `zipdownload` |
| Editor Markdown per a redactar | Inclòs a la 1.7 |
| Calendari i tasques | Plugins de Kolab |

## Funcionalitats proposades

La majoria es poden fer només amb plugin; unes quantes necessiten un component de servidor i les d'IA, un acord clar sobre protecció de dades.

| Funcionalitat | Què fa | Requereix | Cost |
| --- | --- | --- | --- |
| Desfer l'enviament | Reté l'enviament 10–30 s amb un botó «Desfés» | Plugin | Baix |
| Avís d'adjunt oblidat | Detecta «allègue/adjunte» sense fitxer (comprovar si l'actual basta) | Plugin | Baix |
| Avís de destinatari extern o resposta a tots massiva | Evita errors i fugues de dades | Plugin | Baix |
| Etiquetes de colors | Keywords IMAP, compatibles amb Thunderbird | Plugin | Mitjà |
| Plantilles amb variables | Plantilles compartides per servei i bilingües | Plugin | Mitjà |
| Bàner antiphishing | Remitent extern, domini semblant a ua.es, SPF/DKIM/DMARC fallits | Plugin | Mitjà |
| Adjunts grans com a enllaç | Puja el fitxer a l'emmagatzematge UA i inserix l'enllaç | Plugin + emmagatzematge | Mitjà |
| Vista prèvia d'adjunts | PDF, Office i imatges en panell lateral | Plugin | Mitjà |
| Dreceres de teclat estil Gmail | j/k, e, r, a, # | Plugin | Baix |
| Cancel·lar subscripcions amb un clic | Usa la capçalera `List-Unsubscribe` | Plugin | Baix |
| Enviament programat | Guarda el missatge i un cron l'envia a l'hora | Plugin + servidor | Alt |
| Posposar un correu | Carpeta oculta; un procés el torna a l'hora indicada | Plugin + servidor | Alt |
| Recordatoris de seguiment | Avisa si no hi ha resposta en N dies | Plugin + servidor | Alt |
| Safata amb categories | Classifica en Principal, Notificacions, Llistes… | Plugin + Sieve o classificador | Alt |
| Resum de fils llargs | IA | Plugin + model d'IA | Mitjà |
| Ajuda per a redactar i corregir | IA en valencià, castellà i anglés | Plugin + model d'IA | Mitjà |
| Respostes suggerides | IA | Plugin + model d'IA | Mitjà |
| Cerca en llenguatge natural | IA | Plugin + model d'IA | Alt |

En les funcionalitats d'IA cal definir on es processa el contingut del correu (model propi o proveïdor amb garanties RGPD) i que siguen opcionals per a cada persona usuària.

## Funcionalitats pròpies de la UA

- **Integració amb UACloud:** directori institucional com a llibreta d'adreces, grups docents com a llistes de distribució i enllaços a expedients o tràmits.
- **Skin Elastic adaptat al sistema de disseny UACloud**, perquè el correu no semble una aplicació a banda.
- **Integració amb l'editor de correus institucionals:** un botó «Redacta amb plantilla UA» que obriga el generador de correus HTML bilingües i retorne el resultat al redactor de Roundcube.

## Recomanació

1. **Fase 1, només plugin:** desfer l'enviament, avís de destinatari extern, bàner antiphishing i plantilles UA. Servix també per a assentar l'estructura comuna (repositori, proves, desplegament).
2. **Fase 2, amb component de servidor:** enviament programat i posposar.
3. **Fase 3, IA:** només després de decidir on es processen les dades.

## Fonts

- [Plugin API – Roundcube wiki (GitHub)](https://github.com/roundcube/roundcubemail/wiki/Plugin-API)
- [Roundcube Project News – Stable releases](https://roundcube.net/news/stable/)
- [Anunci de Roundcube 1.7.0 (llista de correu)](https://lists.roundcube.net/hyperkitty/list/dev@lists.roundcube.net/message/W7IFBIQPXBWG5M3GBD3GE7SFZSBMO2EJ/)
- [Roundcube 1.7.0 – fòrum DirectAdmin](https://forum.directadmin.com/posts/400455/)
