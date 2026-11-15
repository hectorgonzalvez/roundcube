# Com es gestiona hui una bústia compartida en Gmail: etiquetes i safates múltiples

- **Font**: descripció de l'owner del projecte i captura d'una safata de Gmail, 2026-11-15. La captura
  porta dades reals i no es versiona: ací només en queda l'estructura.
- **Tipus**: exemple (com es fa hui), no normativa.

## El procediment, tal com l'explica l'owner

1. Quan arriba un correu, se li posa l'etiqueta de la persona que el gestionarà.
2. L'etiqueta queda sempre associada al correu. Així se sap de qui és la responsabilitat i qui està
   gestionant cada correu.
3. Per a saber en quin punt està cada correu, s'etiqueta amb un sistema kanban.
4. La vista de Gmail s'organitza en diverses safates segons l'etiqueta («safates múltiples»).

## Estructura que es veu a la captura

**Panell lateral**:

- Carpetes del sistema: Safata d'entrada, Destacats, Posposats, Enviats, Esborranys, Categories, Més.
- Un bloc «Etiquetes» (amb el botó per a crear-ne). Les etiquetes porten color i un número davant
  que en fixa l'orde:
  - `1 A fer`
  - `2 Esperant`
  - `3 En procés`
  - `4 Fet/…` (vist a la llista)

**Etiquetes jeràrquiques**: n'hi ha amb subnivells separats per `/`, del tipus
`4 Fet/«unitat»/«àmbit»/«tema»`, amb un color per etiqueta.

**Llista de missatges**: per a cada missatge es veu, en una sola fila:

- els participants del fil, amb el nombre de missatges;
- les etiquetes, com a pastilles de color davant de l'assumpte;
- l'assumpte i l'inici del text;
- la icona d'adjunt;
- la data.

**Safates múltiples**: la safata d'entrada a l'esquerra, i a la dreta un panell «A fer» amb seccions
plegables per etiqueta: `En procés` (1–5 de 5), `Esperant` (1–9 de 45)… Cada secció mostra els seus
missatges i el seu recompte.

## Què no es veu a la captura

- Les etiquetes de persona (el responsable del correu). L'owner diu que s'usen, però a la captura no
  apareixen.
- Si la captura és d'una bústia d'unitat o d'un compte personal que fa servir el mateix sistema.
