# 📚 Documentation Complète - MTG Screen-to-Deck

## Structure de la Documentation

Ce dossier contient **TOUTE** la documentation technique et utilisateur du projet MTG Screen-to-Deck.

### 📂 Contenu du Dossier

| Fichier | Description | Public Cible |
|---------|-------------|--------------|
| **01_WEB_APP_COMPLETE_GUIDE.md** | Guide complet de l'application web (installation, utilisation, API, déploiement) | Développeurs, Utilisateurs avancés |
| **02_MASTER_OCR_RULES.md** | Règles et méthodologie OCR (ne jamais abandonner, toutes les méthodes) | Développeurs OCR |
| **03_OCR_METHODS_TECHNICAL.md** | Documentation technique des méthodes OCR (résolutions, Scryfall, super-res) | Développeurs techniques |
| **04_MTGO_SPECIFIC_GUIDE.md** | Guide spécifique pour MTGO (interface, règles, détection) | Développeurs MTGO |
| **05_ENHANCED_OCR_SUMMARY.md** | Résumé du système Enhanced OCR dans la web app | Tous |
| **06_ORIGINAL_OCR_RULES.md** | Règles OCR originales (quantités, validation) | Référence historique |

### 🎯 Guide de Lecture Recommandé

#### Pour Commencer Rapidement
1. Lire **05_ENHANCED_OCR_SUMMARY.md** pour comprendre les capacités
2. Suivre **01_WEB_APP_COMPLETE_GUIDE.md** section "Installation"

#### Pour Développer
1. **01_WEB_APP_COMPLETE_GUIDE.md** - Architecture et API
2. **02_MASTER_OCR_RULES.md** - Comprendre les règles
3. **03_OCR_METHODS_TECHNICAL.md** - Implémenter des méthodes

#### Pour Débugger
1. **02_MASTER_OCR_RULES.md** - Section "Ne jamais abandonner"
2. **04_MTGO_SPECIFIC_GUIDE.md** - Si problème MTGO
3. **01_WEB_APP_COMPLETE_GUIDE.md** - Section "Troubleshooting"

### 📊 Statistiques de la Documentation

- **Total de pages** : ~200 pages
- **Lignes de documentation** : 5000+
- **Diagrammes** : 15+
- **Exemples de code** : 50+
- **Commandes documentées** : 30+

### 🔍 Recherche Rapide

#### Installation
→ Voir **01_WEB_APP_COMPLETE_GUIDE.md** Section 3

#### API Endpoints
→ Voir **01_WEB_APP_COMPLETE_GUIDE.md** Section 5

#### Règles OCR
→ Voir **02_MASTER_OCR_RULES.md** Section 3

#### Problème MTGO
→ Voir **04_MTGO_SPECIFIC_GUIDE.md**

#### Super-Résolution
→ Voir **03_OCR_METHODS_TECHNICAL.md** Section "Super-Résolution"

### ✅ Points Clés à Retenir

1. **Le système ne donne JAMAIS un deck incomplet** (60+15 garantis)
2. **Super-résolution automatique** pour images < 1200px
3. **Support complet** Arena, MTGO, et papier
4. **Mode "Never Give Up"** qui essaie toutes les méthodes

### 🚀 Quick Start

```bash
# 1. Installation
npm install

# 2. Configuration
cp .env.example .env
# Ajouter OPENAI_API_KEY dans .env

# 3. Lancement
npm run dev

# 4. Accès
http://localhost:5173/enhanced
```

### 📝 Dernière Mise à Jour

- **Date** : Novembre 2024
- **Version** : 2.0.0
- **Auteur** : MTG Tools Team

---

*Pour toute question, consulter d'abord cette documentation. Si la réponse n'y est pas, c'est qu'elle n'existe pas encore !*