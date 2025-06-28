# 🔄 Guide de Migration – Regroupement Intelligent & Validation Stricte

## 📋 Vue d'ensemble
Ce guide explique comment intégrer le nouveau système de regroupement intelligent dans votre bot pour garantir un comportement identique à l'analyse humaine.

---

## 🎯 Problèmes résolus
- Doublons dans le sideboard (ex : `1 Fragment Reality` × 4 → `4 Fragment Reality`)
- Validation stricte des totaux (60/15)
- Export propre sans doublons
- Logs détaillés pour debug

---

## 📁 Fichiers à ajouter ou mettre à jour

### 1. `deck_processor.py`
Le cœur du système de regroupement et validation. Placez ce fichier à la racine du projet.

### 2. `ocr_parser_enhanced.py`
Remplacez votre `ocr_parser.py` par ce module, ou intégrez les changements (utilisation de DeckProcessor après l'OCR).

### 3. Mise à jour de `bot.py`
- Utilisez l'export pré-généré (`parse_result.export_text`)
- Affichez les erreurs/avertissements de validation dans l'embed Discord

### 4. `requirements_updated.txt`
Mettez à jour vos dépendances pour garantir la compatibilité.

---

## 🔧 Changements de code principaux

### a. Regroupement et validation
```python
from deck_processor import DeckProcessor
# ...
self.deck_processor = DeckProcessor(strict_mode=True)
# ...
processed_cards, validation = self.deck_processor.process_deck(main_cards, side_cards, format_hint)
```

### b. Export sans doublons
```python
export_text = self.deck_processor.export_to_format(processed_cards, 'mtga')
```

### c. Affichage des erreurs/avertissements
```python
if parse_result.validation:
    if parse_result.validation.errors:
        # Afficher dans l'embed Discord
    if parse_result.validation.warnings:
        # Afficher dans l'embed Discord
```

---

## 🧪 Tests recommandés
- `python test_regroupement.py` : Vérifie le regroupement automatique
- `python demo_comparison.py` : Démo visuelle avant/après
- `python test_ocr_final.py votre_screenshot.png` : Test complet sur une image réelle

---

## 📊 Résumé exécutif
- **Avant** : Doublons, validation partielle, export non conforme
- **Après** : Regroupement intelligent, validation stricte, export propre, logs détaillés

---

## ✅ Checklist de migration
- [ ] Copier `deck_processor.py` dans le projet
- [ ] Remplacer/mettre à jour `ocr_parser.py`
- [ ] Mettre à jour les imports dans `bot.py`
- [ ] Modifier l'export pour utiliser le texte pré-généré
- [ ] Ajouter l'affichage des validations dans l'embed Discord
- [ ] Tester avec `test_regroupement.py` et de vrais screenshots
- [ ] Vérifier les logs pour le regroupement

---

## 🚀 Résultat attendu
Après migration, votre bot :
- ✅ Regroupe automatiquement les cartes identiques
- ✅ Valide les totaux (60/15)
- ✅ Exporte sans doublons
- ✅ Affiche des erreurs/avertissements clairs
- ✅ Se comporte exactement comme l'IA humaine

---

**Pour toute question, consultez les logs détaillés ou contactez l'auteur du guide.** 