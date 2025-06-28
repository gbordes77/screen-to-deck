# Règles d'extraction OCR (base technique)

## Règle de vérification du total
- **Avant de présenter la liste extraite, compter le nombre de cartes dans le main deck et le sideboard.**
- **Le main deck doit contenir 60 cartes, le sideboard 15 cartes (ou s'en approcher au mieux).**

## Règle spécifique pour l'export MTGA
- **Seuls les 'xN' de la forme graphique (comme sur l'image exemple) sur les cartes du main deck sont pris en compte pour la quantité.**
- **Dans le sideboard (liste à droite), s'il n'y a pas de 'xN' graphique, chaque carte est comptée comme 1 exemplaire.**
- **Le sideboard doit toujours contenir 15 cartes pour l'export MTGA.**

## Règle fondamentale
- **Si un chiffre (x2, x3, x4, etc.) est affiché à côté du nom de la carte, utiliser ce chiffre pour l'export.**
- **Sinon, la quantité à exporter est 1, même si la carte apparaît plusieurs fois visuellement.**

## Règle de gestion du sideboard
- **Additionner le nombre de cartes du même nom dans le sideboard (comme pour le main deck des decks MTGO).**
- **Si une carte apparaît plusieurs fois dans la liste du sideboard, additionner les occurrences pour obtenir la quantité totale.**

## Règles détaillées par type de capture

### 1. MTGO (Magic Online) – Listes de cartes ou piles de cartes
- **Nom de la carte** : Toujours le premier texte en haut de chaque carte (bandeau supérieur).
- **Quantité** :
  - Si un nombre (xN) est affiché à côté du nom, prendre ce nombre.
  - Sinon, quantité = 1 (même si la carte apparaît plusieurs fois).
- **Sideboard** :
  - Si liste textuelle, même règle : quantité affichée sinon 1.

### 2. MTGA (Arena) – Listes de deck
- **Main deck** :
  - Nom = texte du bandeau supérieur de la carte.
  - Quantité :
    - Si xN affiché, prendre ce nombre.
    - Sinon, quantité = 1.
- **Sideboard** :
  - Liste textuelle à droite :
    - Si xN affiché, prendre ce nombre.
    - Sinon, quantité = 1.

### 3. Cas général
- **Toujours privilégier le chiffre affiché** (xN) s'il existe.
- **Sinon, quantité = 1**.
- **Ne jamais compter le nombre d'occurrences visuelles** si aucun chiffre n'est affiché.

---

*Ces règles sont la base de toute extraction OCR pour ce projet et doivent être respectées dans toute évolution du code.*
