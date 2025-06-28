# État des lieux OCR - Screen To Deck (STD)

## 1. Résumé général
- **Pipeline global** : Fonctionnel (Discord, Scryfall, exports, configuration)
- **OCR** : Fonctionne partiellement, mais la reconnaissance des noms de cartes est très instable selon les images

## 2. Résultats des derniers tests OCR

### ✅ Test réussi (extraction correcte)
- **Cartes extraites** :
  - Fragment Reality (x3)
  - Containment Priest 1 (x3)
- **Cartes uniques reconnues** : 2
- **Validation Scryfall** : 100% (toutes les cartes reconnues)

### ❌ Tests problématiques (extraction incorrecte)
- **Exemples de lignes extraites :**
  - "y Creature - Cat Nightmare"
  - "on - Each permanent card in"
  - "ing each of your turns, you"
  - "a permanent speli with mana"
  - "y Ghosts"
  - "eee" (plusieurs fois)
  - "y,l0Ult(i:iR"
- **Cartes uniques reconnues** : 0 à 3
- **Validation Scryfall** : 0% (aucune carte reconnue)

## 3. Analyse technique
- **Quand ça marche** :
  - Les zones de scan OCR sont bien alignées sur les titres des cartes
  - Les noms de cartes sont extraits en entier
- **Quand ça échoue** :
  - L'OCR lit des fragments de texte de règles ou des caractères parasites
  - Les zones de scan ne sont pas alignées sur les titres des cartes

## 4. Hypothèses sur la cause
- Mauvais calibrage des zones de scan (`zone_definitions` dans `ocr_parser.py`)
- Variabilité des screenshots (résolution, interface, langue, etc.)
- Hauteur/position des titres de cartes différente selon la source

## 5. Prochaines actions recommandées
- **Montrer visuellement où lire le nom des cartes** (capture annotée)
- Utiliser la fonction `debug_show_scan_zones` pour ajuster les zones
- Tester sur plusieurs types de screenshots
- Documenter les paramètres qui fonctionnent pour chaque type d'image

---

*Document généré automatiquement pour servir de point de reprise sur l'amélioration de l'OCR.* 