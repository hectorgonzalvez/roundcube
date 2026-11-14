# doc-projecte/prompts/ — Roundcube

> Prompts reutilitzables que han funcionat de veres -no un historial de xat, ni tot el que
> s'escriu: només allò que val la pena tornar a usar o compartir amb l'equip. Guardar-los en
> Markdown els fa cercables i editables, a diferència d'una captura de pantalla o d'una conversa
> perduda en l'historial de l'eina.

**Format**: un fitxer `.md` per prompt, amb data i tema al nom:

```
doc-projecte/prompts/2026-09-13-migra-controlador-a-async.md
```

Amb tres blocs:

```markdown
## Context
Per a quina faena servia (projecte, mòdul, situació de partida).

## Prompt
El prompt tal qual es va enviar.

## Resultat
Va funcionar? Calia algun /model o /effort concret? Què cal ajustar si es reutilitza.
```

**Qui decidix què es guarda**: sempre la persona, mai un mecanisme automàtic -la longitud d'un
prompt no diu si val la pena guardar-lo, i el que de veres ho decidix (si ha funcionat) només se
sap després d'usar-lo.
