# Règles d'extraction OCR pour Screen To Deck (STD)

## Règle fondamentale
- **Si aucun chiffre (x2, x3, x4, etc.) n'est affiché à côté du nom de la carte, alors il n'y a qu'UN exemplaire de cette carte (quantité = 1), même si la carte apparaît plusieurs fois visuellement.**

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