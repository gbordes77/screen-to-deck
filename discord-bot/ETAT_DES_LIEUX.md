# Atteindre la Parité Humaine dans la Reconnaissance Automatisée de Decklists : Un Guide Architectural et Méthodologique

## Introduction
Ce rapport aborde un défi technique fondamental : combler le fossé entre la nature probabiliste de la reconnaissance optique de caractères (OCR) automatisée et la précision déterministe de la compréhension contextuelle humaine, appliquée à des documents semi-structurés complexes comme les listes de decks de Magic: The Gathering. L'analyse comparative fournie entre les capacités d'un assistant IA idéal et celles d'un bot Python actuel sert de cadre fondamental à la stratégie d'amélioration détaillée dans ce document. L'objectif n'est pas de trouver un outil unique et miraculeux, mais de concevoir un pipeline multi-étapes et tolérant aux pannes, où chaque phase affine systématiquement les données et réduit l'incertitude.

Atteindre une fiabilité équivalente à celle d'un humain exige une transformation architecturale. Le système doit évoluer d'un simple script linéaire vers une application modulaire où chaque composant est spécialisé, robuste et testable. Ce rapport présente une feuille de route pour cette transformation, en se concentrant sur trois piliers : la fortification du moteur OCR par un prétraitement d'image avancé, la transformation des données brutes en une structure canonique et validée, et l'intégration de pratiques d'ingénierie logicielle pour garantir la résilience et la maintenabilité du système. En suivant cette approche holistique, le bot peut passer d'un outil fonctionnel mais fragile à un système de reconnaissance de haute-fidélité, capable de garantir des exports conformes et précis à 100 %.

---

## Section 1: Fortifier le Moteur OCR : Un Pipeline de Prétraitement d'Image Multi-Étapes
(Détail complet du pipeline, techniques OpenCV, code Python, voir message précédent)

---

## Section 2: Du Texte Brut aux Données Structurées : Analyse, Validation et Agrégation Avancées
(Détail sur l'utilisation de regex, Scryfall, agrégation avec defaultdict/Counter, code Python, voir message précédent)

---

## Section 3: Intégrité Architecturale : Construire un Bot Résilient et Méthodique
(Journalisation structurée, validation stricte, tests automatisés, recommandations, voir message précédent)

---

## Conclusion et Recommandations Stratégiques
Pour élever le bot de reconnaissance de decklists au niveau de fiabilité d'un assistant humain, une refonte architecturale est nécessaire. La stratégie proposée repose sur l'abandon d'un script linéaire simple au profit d'un pipeline modulaire, multi-étapes, dont chaque phase est distincte, robuste et testable. Cette architecture s'articule autour de cinq étapes fondamentales : Ingestion & Prétraitement -> OCR -> Analyse & Validation -> Agrégation -> Export.

Les recommandations clés pour cette transformation sont les suivantes :
- Reconstruire le module OCR autour d'un pipeline de prétraitement d'image intensif.
- Traiter la sortie de l'OCR comme des données non fiables et utiliser l'API Scryfall comme un moteur de canonicalisation.
- Réarchitecturer le flux de données pour que l'agrégation soit la dernière étape avant l'export.
- Intégrer des pratiques d'ingénierie logicielle professionnelles (journalisation, validation, tests).

La modularité inhérente à cette architecture est la pierre angulaire d'un système qui est non seulement précis, mais aussi maintenable et extensible. En mettant en œuvre systématiquement ces améliorations — en fortifiant le moteur OCR, en aseptisant le flux de données et en intégrant une résilience architecturale — le bot peut combler avec succès le fossé de fiabilité, le transformant d'une preuve de concept en un outil puissant et digne de confiance, capable de rivaliser avec la performance humaine.

---

# 📋 État des lieux technique – Screen To Deck (juin 2024)

## 1️⃣ Installation & Environnement
- Environnement virtuel créé :
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```
- Dépendances à jour :
  ```bash
  pip install -r requirements.txt
  ```

## 2️⃣ Architecture du projet
- Modules principaux :
  - `deck_processor.py` : Regroupement intelligent, validation stricte, export sans doublons.
  - `ocr_parser_enhanced.py` : Extraction OCR, parsing, intégration du regroupement, validation Scryfall.
  - `bot.py` : Interface Discord, gestion des commandes, affichage des résultats.
  - `MIGRATION_GUIDE.md` : Guide complet pour la migration et l'intégration du nouveau système.
  - `ONGOING_ISSUES.md` : Suivi des problématiques en cours.
- Fichiers de tests et de démo :
  - `test_regroupement.py`, `demo_comparison.py` : Pour valider le regroupement et la conformité de l'export.

## 3️⃣ Logs & Diagnostic
- Niveau de logs configuré : INFO (général), DEBUG (regroupement, parsing)
- Les logs montrent :
  - Lignes extraites par l'OCR
  - Regroupements effectués
  - Validations (totaux main/side, erreurs, avertissements)
  - Exports générés
- Exemples de logs :
  ```
  [INFO] 🔍 Traitement OCR du screenshot: deck.png
  [INFO] 📊 OCR terminé: 23 cartes main, 15 cartes side
  [INFO] 🎯 Traitement du deck - Format: standard
  [INFO] Main: 23 cartes uniques après regroupement
  [INFO] Sideboard: 7 cartes uniques après regroupement
  [INFO] MAIN DECK (60 cartes):
    4x Lightning Bolt
    ...
  [INFO] SIDEBOARD (15 cartes):
    4x Fragment Reality
    ...
  [INFO] VALIDATION: ✅ VALIDE
  ```
  ```
  [ERROR] Main deck incorrect: 58 cartes (attendu: 60)
  [ERROR] Sideboard incorrect: 13 cartes (attendu: 15)
  [WARNING] 'Teferi's Protection': 5 copies (max autorisé: 4)
  ```

## 4️⃣ Points de vigilance / Problèmes connus
- Synchronisation logique humaine / bot : le regroupement et la validation stricte sont assurés par `deck_processor.py`, mais il faut s'assurer que le bot l'utilise à chaque étape.
- OCR : la qualité dépend de la config Tesseract et du découpage des zones. Les logs aident à diagnostiquer.
- Attributs manquants : tous les objets de résultat doivent avoir les champs attendus.
- Validation stricte : le bot bloque l'export si le deck n'est pas conforme (main ≠ 60, side ≠ 15), et affiche des erreurs/avertissements détaillés.

## 5️⃣ Checklist pour l'expert
- [x] Environnement virtuel créé et activé
- [x] Dépendances installées (`requirements.txt`)
- [x] Modules de regroupement et parsing intégrés
- [x] Logs détaillés activés
- [x] Tests de regroupement et d'export passés
- [x] Guide de migration et suivi des problèmes à jour

## 6️⃣ À faire / À surveiller
- Vérifier que tous les exports passent par le regroupement (`DeckProcessor`)
- S'assurer que les logs sont bien remontés dans Discord
- Ajouter des tests automatisés sur des images réelles
- Mettre à jour `ONGOING_ISSUES.md` à chaque nouvelle problématique

---

**Ce document fait foi de l'état du projet avant arrêt ce soir.**

# État des lieux - Screen To Deck (juin 2025)

## 1. Fonctionnalités principales
- **Bot Discord** qui scanne des screenshots de decks Magic: The Gathering et exporte la liste des cartes.
- **OCR IA** : Passage de Tesseract à EasyOCR (deep learning) pour une reconnaissance nettement supérieure.
- **Recherche fuzzy Scryfall** : Tolérance aux fautes d'OCR, correction automatique des noms de cartes.
- **Regroupement intelligent** : Plus de doublons, main/sideboard séparés, export MTGA propre.
- **Anti-crash** : Gestion des erreurs Discord (limite 1024 caractères, etc.), plus de plantage même avec OCR raté.

## 2. Derniers résultats (29 juin 2025)
- **OCR EasyOCR** :
  - 61 blocs de texte détectés sur un screenshot deck réel
  - 46 lignes retenues après nettoyage
  - 41 entrées deck parsées (main)
- **Validation Scryfall** :
  - 35/41 cartes validées automatiquement (85%)
  - Corrections automatiques appliquées (ex : "Lurrus of the Dream-DenLOG" → "Lurrus of the Dream-Den")
  - 6 entrées non reconnues (ex : noms de joueurs, bruit OCR)
- **Regroupement** :
  - 41 cartes → 28 cartes uniques après fusion
- **Export** :
  - Export MTGA généré, prêt à l'emploi
  - Export Moxfield, stats, analyse détaillée disponibles
- **Interface Discord** :
  - Plus de double scan (patch anti-doublon appliqué)
  - Boutons interactifs : export, stats, analyse

## 3. Points forts
- Robustesse : plus de crash, gestion des erreurs propre
- Qualité OCR : très nette amélioration (EasyOCR)
- Correction automatique efficace (fuzzy Scryfall)
- UX : interface claire, anti-doublon, feedback utilisateur

## 4. Limites et axes d'amélioration
- Quelques noms bruités restent non reconnus (noms propres, artefacts OCR)
- OCR encore perfectible sur images très dégradées
- Pas de support voice (PyNaCl non installé)
- Pas de gestion multi-langue OCR (pour l'instant)

## 5. Prochaines étapes possibles
- Améliorer le filtrage des lignes bruitées (noms de joueurs, etc.)
- Ajouter un mode "correction manuelle" pour l'utilisateur
- Support multi-langue OCR (français, espagnol...)
- Optimisation GPU (EasyOCR)
- Ajout d'un historique des scans

---

**Statut :**
- Le bot est **fonctionnel, robuste et prêt à l'usage** pour la majorité des screenshots deck Magic Arena.
- Les exports sont fiables, la correction automatique fonctionne, et l'expérience utilisateur est fluide. 