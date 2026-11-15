# ARCHITECTURE.md — Roundcube (plantilla)

> Generat per `ua-docs-projecte`. Nivell 3 -actualitza en afegir/moure/reestructurar alguna cosa
> significativa. En un legacy, este és el fitxer que la sessió d'arqueologia genera quasi sencer des
> del codi (vegeu el skill `ua-dotnet-api` per a les capes). És on un desenvolupador nou aprén "com és este
> repositori" sense preguntar-ho a ningú.
>
> **Owner**: hector.gie · **Last-review**: 2026-11-12

## Stack tecnològic

Pendent.

## Estructura de fitxers

Pendent -taula fitxer/carpeta → contingut.

## Pipeline de build i distribució

- **Build i distribució**: pendent -encara no hi ha codi de plugins.
- **CI de qualitat (activa)**: `.github/workflows/qualitat.yml`, a cada PR de GitHub. Corre els
  checks de `kit-si-ua/ci-plantilla/` (documentació, secrets, antipatrons, higiene...) contra la
  branca de destí. No porta `comprova-descripcio-mr.js` ni `comprova-origen-mr.js`
  (vegeu `DECISIONS.md`, «MR a GitHub en lloc de TFS»).
- **CI de qualitat (en repòs)**: `azure-pipelines-qualitat.yml`, per a quan el projecte torne a
  TFS. No corre enlloc mentres les MR es facen a GitHub.

> 💬 _Per a arrancar (les 3 seccions de dalt)_: este és el fitxer que la sessió d'arqueologia
> genera quasi sencer des del codi -demana a l'agent "llig l'estructura d'este repositori i els
> fitxers de build i ompli Stack/Estructura/Pipeline d'ARCHITECTURE.md" (vegeu el skill
> `ua-dotnet-api` i `ua-docs-projecte` § legacy). Revisa el resultat: descriu l'estat real, no
> l'ideal.

## Design System

Si este projecte consumix el Design System de la UA, no dupliques ací `doc-projecte/tokens.md`, `doc-projecte/components.md`,
`doc-projecte/accessibilitat-principis.md`, `doc-projecte/ux-writing.md` ni `doc-projecte/moviment.md`
-eixe contingut té font única al propi DS; remet-hi des d'ací en lloc de crear-ne còpia. Anota
quina versió del DS consumix el projecte, que és el que un agent necessita saber.
Marca esta secció "No aplica" si el projecte no té UI pròpia.
