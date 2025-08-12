# 📖 Glossaire - MTG Screen-to-Deck

**Guide des termes techniques et Magic: The Gathering utilisés dans le projet**

---

## 🎮 Termes Magic: The Gathering

### Formats de Jeu

**MTGA (Magic: The Gathering Arena)**
- Client de jeu officiel en ligne de Wizards of the Coast
- Interface moderne avec decks affichés en grille
- Format d'export : `4 Lightning Bolt (MH2) 401`

**MTGO (Magic: The Gathering Online)**
- Client de jeu en ligne historique (depuis 2002)
- Interface classique avec liste textuelle
- Bug connu : compte total inclut les lands non listés

**Standard**
- Format rotatif avec les 5-8 derniers sets
- 60 cartes minimum mainboard
- 15 cartes maximum sideboard

**Commander/EDH**
- Format singleton 100 cartes
- 1 commandant légendaire
- Pas de sideboard traditionnel

### Structure de Deck

**Mainboard**
- Deck principal de 60 cartes minimum
- Affiché à gauche ou en premier dans les screenshots
- Contient le core strategy du deck

**Sideboard**
- Réserve de 0-15 cartes
- Affiché à droite ou après "Sideboard:" 
- Utilisé entre les games d'un match

**Mana Base**
- Ensemble des terrains (lands) du deck
- Généralement 20-27 cartes selon l'archétype
- Souvent omis dans l'affichage MTGO (bug)

### Types de Cartes

**Lands (Terrains)**
- Produisent du mana
- Types : Basic, Dual, Fetch, Shock, etc.
- Correction automatique pour MTGO

**Creatures (Créatures)**
- Permanents avec force/endurance
- Peuvent attaquer et bloquer

**Spells (Sorts)**
- Instant : jouable à tout moment
- Sorcery : jouable à son tour uniquement
- Enchantment : permanent avec effet continu
- Artifact : permanent colorless généralement
- Planeswalker : permanent avec loyauté

**DFC (Double-Faced Cards)**
- Cartes avec deux faces
- Format : "Card Name // Back Name"

**Split Cards**
- Deux sorts sur une carte
- Format : "Fire // Ice"

---

## 💻 Termes Techniques

### OCR (Optical Character Recognition)

**OCR**
- Reconnaissance optique de caractères
- Conversion d'images en texte éditable
- Précision : 100% sur MTGA/MTGO

**OpenAI Vision API**
- Service d'IA pour analyse d'images
- Utilisé par le backend web
- Comprend le contexte MTG

**EasyOCR**
- Bibliothèque Python open source
- Utilisé par le Discord bot
- Support multi-langues

**Tesseract**
- Moteur OCR historique de Google
- Remplacé par EasyOCR dans v2.0
- Moins précis sur les cartes MTG

### Architecture

**Pipeline OCR**
- Chaîne de traitement : Image → Preprocessing → OCR → Parsing → Validation → Export
- 7 étapes avec 6 règles critiques
- Garantit 60+15 cartes

**Never Give Up Mode™**
- Système itératif exclusif
- Relance OCR jusqu'à obtenir exactement 75 cartes
- Maximum 3 tentatives avec GPT-4o

**Super-Resolution**
- Upscaling 4x des images < 1200px
- Améliore la précision OCR de 15%
- Utilise des algorithmes de deep learning

**Zone Detection**
- Identification automatique mainboard/sideboard
- Analyse de la structure spatiale
- Adaptation selon le format (MTGA/MTGO)

### Validation et Correction

**Scryfall API**
- Base de données officielle de cartes MTG
- 80,000+ cartes référencées
- Validation en temps réel

**Fuzzy Matching**
- Correspondance approximative de texte
- Corrige les typos automatiquement
- Seuil de similarité : 0.85

**Levenshtein Distance**
- Mesure la différence entre deux chaînes
- Nombre minimum d'éditions nécessaires
- Utilisé pour fuzzy matching

**Jaro-Winkler**
- Algorithme de similarité de chaînes
- Favorise les préfixes communs
- Optimal pour les noms de cartes

**Phonetic Matching**
- Comparaison basée sur la prononciation
- Algorithmes : Soundex, Metaphone
- Corrige les fautes phonétiques

### Cache et Performance

**Cache Hit Rate**
- Pourcentage de requêtes servies depuis le cache
- Actuel : 95%
- Économise les appels API

**LRU Cache**
- Least Recently Used
- Garde les 1000 items les plus récents
- Cache mémoire rapide

**Redis**
- Base de données clé-valeur en mémoire
- Cache distribué
- TTL : 30 minutes par défaut

**TTL (Time To Live)**
- Durée de vie d'une entrée cache
- Cards : 30 minutes
- Images : 7 jours

### Formats d'Export

**MTGA Format**
```
4 Lightning Bolt (MH2) 401
2 Counterspell (MH2) 267
```
- Quantité + Nom + (Set) + Collector Number

**Moxfield Format**
```
4x Lightning Bolt
2x Counterspell
```
- Quantité + x + Nom

**Plain Text**
```
4 Lightning Bolt
2 Counterspell
```
- Format universel simple

**JSON Format**
```json
{
  "mainboard": [
    {"name": "Lightning Bolt", "quantity": 4}
  ]
}
```
- Structure programmable

---

## 🔧 Développement

### Stack Technique

**Node.js**
- Runtime JavaScript côté serveur
- Version 20.x LTS utilisée
- Backend API

**Express**
- Framework web pour Node.js
- Gestion des routes API
- Middleware pour auth et validation

**React**
- Bibliothèque UI JavaScript
- Version 18 avec hooks
- Frontend web app

**TypeScript**
- JavaScript avec typage statique
- Améliore la maintenabilité
- Utilisé frontend et backend

**Python**
- Langage pour le Discord bot
- Version 3.8+ requise
- Excellentes libs ML/OCR

**Discord.py**
- Bibliothèque Python pour Discord
- Support slash commands
- Gestion événements et interactions

**Docker**
- Conteneurisation d'applications
- Déploiement reproductible
- docker-compose pour orchestration

### Métriques

**Processing Time**
- Temps total OCR + validation
- Moyenne actuelle : 3.2 secondes
- Objectif : < 5 secondes

**Accuracy Rate**
- Pourcentage de cartes correctement identifiées
- Actuel : 100% sur MTGA/MTGO
- Minimum acceptable : 95%

**Memory Usage**
- Consommation RAM de l'application
- Actuel : 320MB
- Maximum : 512MB

**API Rate Limiting**
- Limite de requêtes par minute
- Scryfall : 10 req/sec
- OpenAI : 3500 req/min

### CI/CD

**GitHub Actions**
- Plateforme CI/CD intégrée
- Tests automatiques sur push
- Déploiement sur merge

**PM2**
- Process manager pour Node.js
- Auto-restart en cas de crash
- Monitoring et logs

**Supervisor**
- Process manager pour Python
- Gère le Discord bot
- Logs centralisés

---

## 🔐 Sécurité

**API Key**
- Clé d'authentification pour services externes
- OPENAI_API_KEY, DISCORD_TOKEN
- Jamais commitées dans le code

**CORS (Cross-Origin Resource Sharing)**
- Politique de sécurité navigateur
- Contrôle les domaines autorisés
- Configuration dans Express

**Rate Limiting**
- Limite le nombre de requêtes par IP
- Protection contre les abus
- 100 req/min par défaut

**Environment Variables**
- Variables de configuration externes
- Fichier .env (non versionné)
- Secrets en production

---

## 📊 Business

**SaaS (Software as a Service)**
- Modèle abandonné dans v2.0
- Remplacé par open source
- Pas de monétisation directe

**Open Source**
- Code source disponible publiquement
- License MIT
- Contributions communautaires bienvenues

**Production Ready**
- Prêt pour utilisation en production
- Tests complets validés
- Documentation complète

**KPI (Key Performance Indicators)**
- Métriques de succès business
- Users actifs, decks traités, satisfaction

---

## 🎯 Acronymes Projet

**MTG** - Magic: The Gathering
**S2D** - Screen-to-Deck
**OCR** - Optical Character Recognition
**API** - Application Programming Interface
**UI** - User Interface
**UX** - User Experience
**CI** - Continuous Integration
**CD** - Continuous Deployment
**E2E** - End-to-End (tests)
**DFC** - Double-Faced Card
**EDH** - Elder Dragon Highlander (Commander)
**LRU** - Least Recently Used
**TTL** - Time To Live
**SLA** - Service Level Agreement
**KPI** - Key Performance Indicator

---

*Glossaire v2.1.0 - Dernière mise à jour : 11 Août 2025*