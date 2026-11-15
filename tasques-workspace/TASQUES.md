# Tasques — correu web sense Gmail, v1

Pla: [`doc-projecte/producte/2026-11-correu-sense-gmail-v1/pla.md`](../doc-projecte/producte/2026-11-correu-sense-gmail-v1/pla.md)
· Branca: `SENSE-ID-correu-sense-gmail-v1` (no hi ha ID de sol·licitud)

Si esta llista no coincidix amb el disc, val el disc.

## E-01 — Spike i entorn

- [ ] Muntar `docker compose` amb Roundcube 1.7, un Dovecot de proves i un capturador de correu, sense
      dades reals.
- [ ] Crear el `composer.json` del repositori i deixar que `composer` i `vendor/bin/phpunit`
      s'executen amb codi 0. Escriure eixes ordes a `CONTEXT-IA.md` § Build, test i verificació.
- [ ] Comprovar a PRE, amb un compte de prova, si l'IMAP admet _keywords_ arbitràries
      (`PERMANENTFLAGS \*`) i noms amb `/` (risc I1).
- [ ] Comprovar a PRE que dos sessions sobre la mateixa bústia de prova veuen «Enviats» i la marca de
      contestat (RF-01 i RF-02 sense codi).
- [ ] Buscar plugins de tercers d'etiquetes i d'enviament diferit compatibles amb Roundcube 1.7 i
      decidir si se'n pot fer servir algun sense modificar-lo.
- [ ] Prova de concepte de desfer en 30 segons (`fastcgi_finish_request` i espera) i mesura de la
      càrrega (risc O1). Comprovar que el servidor PHP de PRE fa servir PHP-FPM.
- [ ] Fixar els noms dels plugins i registrar a `DECISIONS.md` el que s'haja decidit a E-01.

## Fora d'E-01, pendent de tercers

- [ ] L'owner consulta Sistemes i el responsable de seguretat sobre B1 (credencials per a enviar sense
      sessió). Data límit: 2026-12-01.
- [ ] L'owner consulta el SI o el responsable de seguretat sobre la contrasenya compartida i la §2 de
      les condicions d'ús (risc I3).
- [ ] L'owner consulta qui respon de la dada, la base legal i el temps de conservació (risc I5).
