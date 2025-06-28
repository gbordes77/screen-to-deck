# Problématique actuelle et historique des tests

**Problème principal :**
- Malgré un pipeline OCR robuste et une validation Scryfall avancée, le main deck n'est pas toujours détecté (zones mal alignées, bruit OCR, etc.), alors que le sideboard l'est parfaitement.

**Tout ce qui a été testé :**
- Ajustement manuel et automatique des zones main/side (coordonnées, largeur, hauteur)
- Morphologie, seuillage, aspect ratio, whitelist Tesseract
- Debug visuel (rectangles, contours, logs ligne par ligne, texte OCR sur l'image)
- Filtrage regex, post-traitement, fusion des colonnes
- OCR global (toute l'image)
- OCR par zones fixes (main_left, main_right, sideboard)
- OCR avec auto-détection de colonnes (projection verticale)
- OCR avec ajustement manuel via éditeur web interactif
- Validation/correction Scryfall sur chaque ligne (fuzzy, suggestions, batch)
- Exports et analyse avancée (format, stats, légalité, prix)

**Constats :**
- Le sideboard est détecté à 100% (preuve que le pipeline fonctionne)
- Le main deck est partiellement ou mal détecté selon le screenshot
- Les exports et l'analyse fonctionnent si la détection est bonne

**Ce qu'on attend de l'expert :**
- Une méthode universelle pour découper les zones main/side sur tous les layouts Arena
- Des conseils pour améliorer la robustesse de l'OCR sur du bruit/règles
- Des suggestions pour fiabiliser la séparation main/side et la validation des lignes

---

# Rapport d'État du Projet – Screen To Deck (STD)

## 1. Résumé du workflow utilisateur

- L'utilisateur envoie une capture d'écran de deck MTG sur Discord.
- Le bot détecte l'image, réagit avec 📷, propose l'analyse (emoji ou commande `/scan`).
- L'analyse retourne :
  - Liste de cartes (main/side séparés)
  - Exports (formats variés)
  - Analyse avancée (stats, format, couleur, prix, légalité)
  - Gestion des erreurs et logs détaillés

## 2. Architecture technique

- **Bot Discord (Pycord)** : gestion des commandes, réactions, téléchargements d'images.
- **OCR (OpenCV + Tesseract)** : découpe zones main/side, morphologie, seuillage, extraction ligne par ligne.
- **Parsing** : patterns robustes (quantité, nom, etc.), nettoyage, détection main/side.
- **Validation Scryfall** : fuzzy, suggestions, auto-correction, batch, scoring de confiance.
- **Analyse** : format, stats, couleur, prix, légalité, export multi-format.
- **Logs** : détaillés à chaque étape (OCR, parsing, validation, analyse).

## 3. Points forts

- Pipeline OCR robuste (zones, morphologie, debug visuel possible)
- Parsing intelligent (plusieurs patterns, nettoyage, détection main/side)
- Validation Scryfall avancée (fuzzy, suggestions, auto-correction, batch)
- Intégration Discord complète (emoji, slash, feedback utilisateur)
- Exports et analyse avancée (format, stats, légalité, prix)
- Logs et gestion d'erreur (pour debug rapide)

## 4. Limites et problèmes rencontrés

- Qualité du screenshot : images floues ou compressées → OCR bruité
- Zones main/side parfois à ajuster selon le layout Arena
- Noms de cartes exotiques ou nouveaux : validation Scryfall peut échouer
- Séparation main/side parfois imparfaite si le layout change
- Logs : parfois trop verbeux ou pas assez explicites sur l'échec d'une ligne
- Fichiers de logs non générés si le bot n'a pas démarré correctement

## 5. Exemples de logs / résultats

```
2025-06-28 13:06:56,416 - ocr_parser - INFO - [ArenaOCR] main_left line 0: 'y Creature - Cat Nightmare'
2025-06-28 13:06:56,484 - ocr_parser - INFO - [ArenaOCR] main_left line 1: 'on - Each permanent card in'
2025-06-28 13:06:56,685 - ocr_parser - INFO - [ArenaOCR] main_right line 0: 'y Ghosts'
2025-06-28 13:06:56,742 - ocr_parser - INFO - [ArenaOCR] sideboard line 0: ''
2025-06-28 13:06:57,871 - ocr_parser - INFO - ✅ Main deck: 5 cartes
2025-06-28 13:06:57,871 - ocr_parser - INFO - ✅ Sideboard: 8 cartes
2025-06-28 13:06:57,872 - ocr_parser - INFO - Parsed 7 unique cards from 13 lines
2025-06-28 13:06:57,872 - scryfall_service - INFO - [Scryfall] search_card_exact: name='Y Creature Cat Nightmare' (param exact)
2025-06-28 13:06:58,139 - scryfall_service - INFO - [Scryfall] search_card_exact: response for 'Y Ghosts': None
```

## 6. Code clé (extraits)

### a) Pipeline OCR (extrait)
```python
def process_screenshot_safe(self, image_path):
    image = cv2.imread(image_path)
    # ... découpe zones, morphologie, seuillage ...
    # ... extraction ligne par ligne ...
    return {"main": main_cards, "side": side_cards, "stats": stats}
```

### b) Parsing et validation Scryfall (extrait)
```python
async def parse_deck_image(self, image_path: str, language: str = 'en', format_hint: str = None) -> ParseResult:
    extracted_lines = self.extract_text_from_image(image_path)
    parsed_cards = await self._parse_cards_enhanced(extracted_lines, language)
    validated_cards = await self._validate_cards_batch(parsed_cards, language)
    format_analysis = await self._analyze_deck_comprehensive(validated_cards, format_hint)
    return ParseResult(cards=validated_cards, format_analysis=format_analysis, ...)
```

### c) Recherche fuzzy/correction Scryfall (extrait)
```python
async def enhanced_card_search(self, card_name: str, lang: str = 'en') -> CardMatch:
    # ... exact, correction OCR, fuzzy, suggestions ...
    return CardMatch(...)
```

## 7. Prochaines pistes d'amélioration / questions à l'expert

- Comment améliorer la robustesse de l'OCR sur des images floues ou compressées ?
- Quelle stratégie recommander pour l'auto-détection des zones main/side sur des layouts Arena différents ?
- Faut-il enrichir la base de validation Scryfall (ex : noms alternatifs, tokens, promos) ?
- Conseils pour améliorer la séparation main/side de façon universelle ?
- Recommandations pour des logs plus exploitables (succès/échec ligne par ligne, stats globales, etc.) ?

---

**Fichier généré : `discord-bot/OCR_PIPELINE_REPORT.md`**

**Contact : @Holdrin / guillaumebordes**

**Pour le code complet, voir les fichiers : ocr_parser.py, bot.py, scryfall_service.py dans le repo.** 