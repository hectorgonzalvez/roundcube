# DECISIONS.md — Roundcube (plantilla)

> Generat per `ua-docs-projecte`. Nivell 1 -actualitza en prendre, canviar o reobrir una decisió.
> Format breu: decisió + opcions considerades + conseqüències + "NO REOBRIR" si aplica. **No és el
> lloc per a la narrativa completa** (dates, rondes de feedback successives, raonament pas a pas) -eixe
> historial va a `doc-projecte/historial-decisions.md`, consultat només sota demanda. Qui edita este fitxer:
> sempre una persona, mai la IA en autonomia (vegeu "Orde de precedència" a `doc-projecte/CONTEXT-IA.md`).
>
> **Quan val una entrada** (decisions preses): quan es complixen les tres condicions -costa desfer-la
> (canviar d'idea després té un cost real), sense context sorprén o convida a «corregir-la», i hi
> havia una alternativa real que es va descartar per un motiu concret. Si en falta una, no és una
> entrada: una regla de codi va a `doc-projecte/ESTANDARDS.md`, un gotcha de domini a `doc-projecte/CONEIXEMENT-VIU.md`, i el
> que és fàcil de desfer o no tenia alternativa no s'anota.
>
> `Com es verifica` diu què avisa quan el codi incomplix la decisió. Les entrades que conviden a
> «corregir-les» són les que un agent desfaria sense haver-les llegides, i sense un test o un check
> això només es veu en una revisió.
> `NO REOBRIR` diu quin argument obri el debat; `Revisar quan` diu quina dada ja existent l'obri
> encara que ningú el demane. En actualitzar `Last-review` es miren els senyals de les entrades que
> en tenen; si la dada no ha canviat res, s'anota «es manté» i la data -revisar no és reobrir. Un
> senyal sense font ni llindar no és un senyal: millor «—» que un `NO REOBRIR` repetit.
>
> **Owner**: hector.gie · **Last-review**: 2026-11-12

## Decisions preses (no reobrir sense motiu fonamentat)

Pendent -exemple de format d'una entrada:

```
### [Tema] — [data]
Opcions: [opció A] vs. [opció B]
Decisió: [què s'ha triat]
Per què: [una frase]
Conseqüències: [què implica per a la resta del codi]
Com es verifica: [el test, el check de CI o el punt de revisió que avisa si el codi la incomplix]
-o "—" si no n'hi ha cap.
NO REOBRIR sense [condició concreta, no "si algú no està d'acord"].
Revisar quan: [dada que ja existix + llindar, p. ex. "`doc-projecte/REGISTRE-ERRORS.md` suma més de 3
entrades d'este tipus en un trimestre"] -o "—" si no n'hi ha cap d'honest.
```

## Decisions obertes (prioritzades)

Pendent -decisions que cal prendre encara, ordenades per prioritat.
