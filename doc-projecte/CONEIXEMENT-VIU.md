# CONEIXEMENT-VIU.md — Roundcube (plantilla)

> Generat per `ua-docs-projecte`. Nivell 2 -actualitza quan es descobrisca alguna cosa sorprenent.
> **No és un changelog**: un bug corregit hui pot tornar a introduir-se demà si ningú recorda per què
> calia la regla. És, per disseny, el document amb menys autoritat de tot el kit (vegeu "Orde de
> precedència" a `doc-projecte/CONTEXT-IA.md`) -una nota sorprenent no és un compromís.
>
> **Owner**: hector.gie · **Last-review**: 2026-11-12

Pendent -gotchas de domini i bugs no evidents, en format breu (símptoma → causa → regla).

## Format de cada entrada

```
### [títol curt del gotcha]
Símptoma: [què es veu]
Causa: [causa arrel, una frase]
Regla: [què cal fer/evitar a partir d'ara]
```

## On va cada cosa

Quatre documents reben el que ha anat malament, i cadascun respon a un moment distint. Si dubtes,
mira la primera columna:

| Què tens                                                           | On va                                                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Un error mentre es treballa, sense lliçó encara                    | `doc-projecte/REGISTRE-ERRORS.md`, si el projecte l'ha adoptat (l'escriu la IA)                        |
| Un comportament sorprenent, i la regla perquè no torne a passar    | Ací, en el format de dalt                                                                              |
| Una cosa que se sap mal feta i es deixa així a posta               | `doc-projecte/TECH-DEBT.md` (impacte, cost, quan revisar-la)                                           |
| La història sencera d'un bug quan la seua regla ja és ací          | `doc-projecte/historial-bugs.md`, i ací només la regla                                                 |
| Una regla aplicada diverses vegades sense excepció                 | Puja a `doc-projecte/DECISIONS.md` (tècnica) o `doc-projecte/ARCHITECTURE.md` (estructura), i ix d'ací |
| Una regla que es detecta amb un patró sobre el diff, sense criteri | Un patró de `comprova-antipatrons.js`: el check la para sense que ningú la llija                       |

Cap entrada viu en dos documents alhora: quan puja o es trasllada, s'esborra d'on era.
