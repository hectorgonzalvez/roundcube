## Solicitud

<!-- ID de la solicitud: el mismo que abre el nombre de la rama. -->

## Descripción funcional

<!-- Qué cambia para quien usa la aplicación. Una o dos frases. -->

## Pruebas realizadas

<!-- Una línea por comportamiento o criterio que cambia: con qué se comprueba (nombre del test o comprobación a mano) y el resultado, con cuántos tests se han ejecutado. Un plan de pruebas no es una prueba: lo que no se ha ejecutado va a la sección siguiente. -->

## Lo que no se ha comprobado

<!-- Lo que no se ha podido verificar y por qué (un caso, un entorno, un rol, dos instancias...). Todo comportamiento tiene una prueba arriba o una línea aquí. Si no queda nada, escribe «Nada fuera de lo que cubre "Pruebas realizadas"». -->

## Lo que el agente no sabía (opcional)

<!-- Contexto que has tenido que darle o corregirle (una regla de negocio, una excepción histórica) y quién más lo sabe. Si no hubo nada, borra la sección. -->

## Pruebas que no ha escrito quien escribió el código (opcional)

<!-- Qué pruebas ha escrito o revisado otra persona, o tú sin el agente, y contra qué fuente. Si todas salen de la misma sesión que el código, dilo: en verde no quiere decir que comprueben la regla. -->

## Requisitos (RF)

<!-- Solo si el proyecto tiene RF en `doc-projecte/producte/`. Verbos fijos: `Tanca` (cumple TODOS los criterios de aceptación, con las pruebas en verde; citar no es cerrar; un criterio en «Lo que no se ha comprobado» no está cerrado), `Avança` (trabaja en él, quedan criterios), `Reobri` (uno dado por cerrado no cumple), `Cap: <motivo>` (la PR no toca ningún RF). Pon `—` en los que no uses. -->

- Tanca:
- Avança:
- Reobri:

## Nivel de revisión (ESTANDARDS.md §9.1)

- [ ] T0 · Presentación
- [ ] T1 · Pantalla administrativa
- [ ] T2 · Autenticación y autorización
- [ ] T3 · Datos personales

## Antes de completar

- [ ] Sin credenciales, datos sensibles ni binarios en la rama
- [ ] Documentación al día, o `[no-doc] motivo` en el commit
- [ ] Los RF de «Tanca» cumplen todos sus criterios de aceptación
- [ ] Si esta PR cierra la faena: revisados los documentos que lista el Context Delta del `pla.md` (`PROJECTE.md`, `DECISIONS.md`...) y llevado al `prd.md` lo que se ha descubierto, o «nada que cambiar»
- [ ] Ningún hallazgo 🔴 de la revisión sin resolver
- [ ] Validado por el solicitante
