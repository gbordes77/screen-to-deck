# État des Lieux : Divergence entre le Pipeline OCR Local et le Bot Discord

**Date :** 3 Juillet 2025  
**Auteur :** Gemini  
**Pour :** Expert en débogage

## Contexte

Après une série de tests et de débogages intensifs, nous avons réussi à stabiliser le bot Discord et à obtenir une reconnaissance OCR fonctionnelle. Cependant, des différences de comportement importantes ont été observées entre l'environnement de développement local de l'utilisateur (où les scripts fonctionnaient) et l'environnement d'exécution du bot.

Il est important de noter qu'en date du 29/06, le système était fonctionnel. La difficulté rencontrée pour identifier et restaurer précisément cet état fonctionnel a mis en évidence le manque de reproductibilité de l'environnement, un point que ce document vise à adresser.

## 1. Synthèse du Problème

L'objectif est d'extraire une liste de cartes Magic: The Gathering à partir d'une capture d'écran via un bot Discord.

Nous faisons face à une situation de **divergence de résultats critiques** :

-   **En local :** Le pipeline de reconnaissance d'image (`OCR`) fonctionne de manière très satisfaisante. Il identifie correctement une majorité de cartes, même avec des erreurs mineures.
-   **Via le bot Discord :** Le **même code**, déclenché par l'envoi d'une image au bot, produit des résultats de très mauvaise qualité. Le bot ne plante plus, mais le texte extrait est inexploitable.

L'hypothèse la plus forte est que cette divergence n'est pas due à une erreur de logique dans le code, mais à une **incohérence entre l'environnement de développement local et l'environnement virtuel Python utilisé par le bot.**

## 2. Le Pipeline Fonctionnel (Référence Locale)

Le processus qui a prouvé son efficacité est documenté en détail dans deux fichiers de référence :

-   **`OCR_PIPELINE_EXPLAINED.md`** : Décrit le pipeline actuel basé sur `EasyOCR` qui a montré de bons résultats.
-   **`OCR_TARGET_ARCHITECTURE.md`** : Décrit l'architecture cible, plus avancée, vers laquelle nous souhaitons tendre.

Pour résumer, la logique fonctionnelle est la suivante :
1.  Une image est traitée par le script `screen-to-deck/discord-bot/ocr_parser_easyocr.py`.
2.  Ce script utilise le moteur **`EasyOCR`** pour extraire le texte brut **sans prétraitement d'image agressif**.
3.  Il nettoie le texte, l'analyse pour trouver les paires quantité/nom.
4.  Il valide et corrige les noms via une recherche floue sur l'API **`Scryfall`**.

Lorsqu'un script de test local exécute cette logique (ex: `test_real_deck.py`), les résultats sont excellents.

## 3. Le Pipeline du Bot (Constat Actuel)

Le code du bot a été corrigé pour être **identique à la logique locale**.

-   **Fichier concerné :** `screen-to-deck/discord-bot/bot.py`
-   **Processus :**
    1.  Le bot reçoit une image en pièce jointe.
    2.  Il la télécharge dans un répertoire temporaire.
    3.  Il instancie le parser `MTGOCRParser` depuis `ocr_parser_easyocr.py`.
    4.  Il appelle la fonction `parse_deck_image()` sur le chemin de l'image.

**Le code exécuté est le même. Le résultat est radicalement différent.**

Voici un exemple du résultat obtenu via le bot :

![Résultat du Bot](https://i.imgur.com/rL4kC3G.png)

**Analyse du résultat du bot :**
-   Le bot ne plante pas, il termine son analyse.
-   Le système de validation Scryfall fonctionne (il a autocorrigé "Huen" en "Notorious Throng").
-   Cependant, le texte brut extrait par `EasyOCR` est de très mauvaise qualité, comme en témoigne la section "Needs Review" qui contient du charabia.

## 4. Analyse de la Cause Racine : L'Environnement

Après avoir éliminé les erreurs de code, les problèmes de chemin d'accès et les crashs, la seule conclusion logique restante est une **différence d'environnement d'exécution**.

Le fichier de dépendances du bot, `screen-to-deck/discord-bot/requirements.txt`, utilise des versions non figées :

```
discord.py>=2.0.0
python-dotenv>=0.20.0
aiohttp
Pillow
requests
easyocr
scikit-image
opencv-python-headless
memory-profiler
```

L'utilisation de `>=` (supérieur ou égal) signifie que lors de l'installation des dépendances dans l'environnement virtuel du bot (`venv`), `pip` a pu installer des versions mineures ou des patchs de `opencv-python-headless`, `Pillow`, `scikit-image` ou `easyocr` qui sont **différentes** de celles installées sur la machine locale où les tests sont concluants.

Une différence, même mineure, dans l'une de ces bibliothèques de traitement d'image peut radicalement altérer le résultat de l'OCR.

## 5. Recommandation et Prochaines Étapes

Pour garantir la **reproductibilité** de l'environnement et synchroniser la version du bot avec la version locale qui fonctionne, il est impératif de "geler" les dépendances.

**Plan d'action recommandé :**

1.  **Sur la machine locale où l'OCR fonctionne correctement**, se placer dans l'environnement virtuel activé et exécuter la commande suivante pour créer un fichier de dépendances exactes :
    ```bash
    pip freeze > screen-to-deck/discord-bot/requirements.lock
    ```

2.  **Arrêter les services du bot** pour pouvoir modifier l'environnement :
    ```bash
    /Users/guillaumebordes/Documents/screen\ to\ deck/restart_services.sh --stop 
    ```
    (ou via le script `dev.sh`)

3.  **Supprimer l'environnement virtuel corrompu** du bot pour garantir une réinstallation propre :
    ```bash
    rm -rf screen-to-deck/discord-bot/venv
    ```

4.  **Recréer l'environnement et installer les dépendances figées** :
    - Le script `restart_services.sh` ou `dev.sh` gère la création du `venv`.
    - Modifier le script d'installation pour qu'il utilise `pip install -r requirements.lock` au lieu de `requirements.txt`.
    
5.  **Relancer les services et tester à nouveau.**

Cette procédure standard devrait synchroniser les deux environnements et, par conséquent, les résultats de l'OCR. 

---

# Guide du Pipeline de Reconnaissance Optique (OCR)

Ce document explique, étape par étape, le fonctionnement du pipeline de traitement d'image et de texte utilisé par le bot pour analyser une capture d'écran de decklist et en extraire les cartes. Ce pipeline est contenu dans le fichier `screen-to-deck/discord-bot/ocr_parser_easyocr.py`.

## Vue d'ensemble

Le pipeline se déroule en 4 grandes étapes :

1.  **Étape 1 : Extraction du Texte Brut** - Le moteur `EasyOCR` lit l'image et en extrait tout le texte qu'il peut trouver.
2.  **Étape 2 : Nettoyage & Filtrage** - Le texte brut, souvent "bruyant", est nettoyé pour ne garder que les lignes qui ressemblent à des noms de cartes.
3.  **Étape 3 : Analyse (Parsing)** - Les lignes nettoyées sont analysées pour séparer le nom de la carte de sa quantité (ex: "2 Solitude" -> Quantité: 2, Nom: "Solitude").
4.  **Étape 4 : Validation & Correction** - Les noms extraits sont validés contre la base de données de cartes `Scryfall` en utilisant une recherche "floue" pour corriger les fautes de frappe et trouver les correspondances exactes.

---

## Étape 1 : Extraction du Texte Brut (`UltraAdvancedOCR.extract_text_from_image`)

C'est le cœur de la reconnaissance.

1.  **Chargement du Moteur** : Au démarrage, le bot charge le modèle de reconnaissance de la langue anglaise (`en`) du moteur `EasyOCR`.
    - `self.reader = easyocr.Reader(['en'], gpu=False)`
2.  **Lecture de l'image** : L'image fournie est lue directement par `EasyOCR`, sans aucun prétraitement d'image (comme la conversion en noir et blanc ou l'augmentation du contraste). C'est un point crucial : `EasyOCR` fonctionne mieux sur l'image originale.
    - `results = self.reader.readtext(image, detail=1, paragraph=True)`
3.  **Filtrage par Confiance** : `EasyOCR` retourne le texte détecté avec un score de confiance. Pour éviter d'analyser du "charabia", le pipeline ne conserve que les blocs de texte ayant une confiance supérieure à **30%**.
    - `text_blocks = [res[1] for res in results if res[2] > 0.3]`
4.  **Sauvegarde pour Débogage** : Le texte brut complet, avec les scores de confiance, est sauvegardé dans le fichier `easyocr_debug_output.txt` pour permettre une analyse manuelle en cas de problème.

## Étape 2 : Nettoyage & Filtrage (`_filter_and_clean_text`)

Le texte extrait contient beaucoup d'informations inutiles. Cette étape fait le tri.

1.  **Filtrage par longueur** : Toutes les lignes de moins de 3 caractères sont supprimées.
2.  **Filtrage par contenu** : Les lignes qui ne contiennent aucune lettre (ex: "---" ou "123") sont ignorées.
3.  **Nettoyage des caractères** : Les caractères spéciaux qui ne sont jamais dans des noms de cartes (sauf l'apostrophe, le tiret et le slash) sont supprimés pour ne pas perturber l'analyse.

## Étape 3 : Analyse & Parsing (`_parse_raw_text`)

Cette fonction transforme une liste de lignes de texte en une liste structurée de cartes potentielles.

1.  **Détection du Sideboard** : La fonction recherche des mots-clés comme `sideboard`, `side`, `reserve` pour savoir si les cartes qui suivent appartiennent au deck principal ou à la réserve.
2.  **Reconnaissance Quantité/Nom** : Pour chaque ligne, plusieurs schémas (expressions régulières) sont testés pour extraire la quantité et le nom :
    - `2 Solitude` (chiffre au début)
    - `2x Solitude` (chiffre avec un 'x')
    - `Solitude x2` (chiffre à la fin)
    - `Solitude` (pas de chiffre, la quantité est 1 par défaut)
3.  **Filtrage final** : Des filtres de bon sens sont appliqués : un nom de carte ne peut pas faire plus de 6 mots pour éviter d'analyser des phrases de description.

## Étape 4 : Validation & Correction (`_validate_and_normalize_cards`)

C'est l'étape finale qui garantit la fiabilité du résultat.

1.  **Appel à Scryfall** : Chaque nom de carte extrait est envoyé à l'API Scryfall en utilisant un point d'accès de recherche "floue".
    - `ScryfallService.fuzzy_search()`
2.  **Correction automatique** : Si Scryfall retourne une correspondance unique avec une haute certitude, le nom de la carte est automatiquement corrigé (ex: `Notorious Thrng` -> `Notorious Throng`).
3.  **Gestion des ambiguïtés** : Si Scryfall retourne plusieurs résultats possibles (ex: "Bolt"), la carte est marquée comme "Nécessite une revue" et les suggestions sont proposées à l'utilisateur.
4.  **Enrichissement des données** : Une fois la carte validée, ses informations complètes (type, coût, etc.) sont récupérées depuis Scryfall et attachées au résultat.

Ce pipeline, en combinant la puissance de `EasyOCR` avec la logique de nettoyage et la validation de Scryfall, permet d'obtenir des résultats robustes même à partir d'images imparfaites. 

---

# Architecture Cible : Pipeline OCR Hybride (EasyOCR + OpenAI Vision)

Ce document décrit l'architecture **cible** pour le système de reconnaissance de cartes. L'objectif est d'atteindre une précision de **95-98%** en combinant la rapidité de l'OCR local (`EasyOCR`) avec la puissance de compréhension contextuelle de l'IA (`OpenAI Vision`).

## Schéma Général

![Architecture Cible](https://i.imgur.com/rL4kC3G.png)

## Étapes du Pipeline

### 1. Prétraitement de l'Image

Toute image envoyée par l'utilisateur subit une première étape de standardisation.

-   **Outil** : `Sharp` (bibliothèque de traitement d'image haute performance).
-   **Action** : L'image est redimensionnée à une taille optimisée (ex: 1600x1200 pixels) pour garantir des performances constantes et éviter les problèmes de mémoire avec des images trop grandes.

### 2. Exécution des Pipelines Parallèles

L'image prétraitée est envoyée **simultanément** à deux moteurs de reconnaissance distincts.

#### A. Pipeline EasyOCR

-   **Rôle** : Fournir une première analyse rapide et fiable. C'est notre "solution à 85%".
-   **Processus** :
    1.  Un script Python (`easyocr_wrapper.py`) encapsule la logique `EasyOCR`.
    2.  Il exécute le pipeline décrit dans le document `OCR_PIPELINE_EXPLAINED.md`.
-   **Résultat** : Extrait le meilleur nom de carte possible, un score de confiance et des métadonnées (ex: position sur l'image).

#### B. Pipeline OpenAI Vision

-   **Rôle** : Comprendre le contexte global de la liste de cartes, en particulier pour les cas complexes où `EasyOCR` échoue.
-   **Processus** :
    1.  L'image est envoyée à l'API `OpenAI Vision`.
    2.  Un prompt spécialisé est utilisé, demandant à l'IA de se concentrer **uniquement** sur les noms de cartes et leurs quantités, en ignorant le reste.
-   **Résultat** : Une réponse structurée en `JSON` contenant les noms de cartes, les quantités, et le contexte (main deck / sideboard).

### 3. Fusion Intelligente

C'est le cerveau du système. Il compare les résultats des deux pipelines et choisit le meilleur en fonction des scores de confiance.

-   **Si la confiance d'OpenAI est > 80%** :
    -   Le résultat d'OpenAI est considéré comme le plus fiable.
    -   **Action** : On utilise le résultat d'OpenAI, et on lui applique un bonus de confiance.
-   **Sinon, si la confiance d'EasyOCR est > 70%** :
    -   Le résultat d'EasyOCR est considéré comme suffisamment bon.
    -   **Action** : On utilise le résultat d'EasyOCR, mais on le "valide" avec les informations d'OpenAI pour confirmer.
-   **Sinon (les deux confiances sont basses)** :
    -   Aucun des deux moteurs n'est sûr.
    -   **Action** : On prend le "moins mauvais" des deux résultats et on lui applique une pénalité de confiance pour indiquer qu'il est peu fiable.

### 4. Corrections Spécifiques MTG

Avant la validation finale, des corrections spécifiques à Magic: The Gathering sont appliquées (ex: corriger des erreurs communes que les OCR font sur les symboles de mana ou les noms de cartes complexes).

### 5. Validation Scryfall

Le nom de carte choisi est validé contre la base de données officielle de `Scryfall`.

-   **Étape 1 : Recherche Exacte**
    -   Le système tente de trouver une correspondance parfaite via l'API.
-   **Étape 2 : Recherche Floue (si la recherche exacte échoue)**
    -   Une recherche par similarité est effectuée.
    -   **Si la similarité est > 70%** : Le résultat est considéré comme "validé avec avertissement". Des alternatives sont proposées à l'utilisateur.
    -   **Si la similarité est < 70%** : Le résultat est marqué comme "non valide". Une forte pénalité de confiance est appliquée, et des suggestions sont tout de même proposées.

### 6. Résultat Final

Le processus se termine par la génération d'un résultat final pour l'utilisateur.

-   **Résultat Validé** : Si une correspondance exacte est trouvée, un bonus de confiance de +15% est appliqué. Le nom "canonique" de la carte est utilisé.
-   **Cible de Précision** : L'objectif de cette architecture est d'atteindre une précision globale de **95% à 98%**.

### 7. Métriques & Logging

À chaque étape, des informations détaillées sont enregistrées pour la surveillance et l'amélioration continue du système :
-   Blocs de texte détectés par EasyOCR.
-   Nombre de "tokens" utilisés par l'API OpenAI.
-   Temps de traitement total.
-   Score de confiance final. 