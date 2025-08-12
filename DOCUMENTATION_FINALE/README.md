# 📚 Documentation MTG Screen-to-Deck v2.1.0

**Status**: Production Ready - 100% OCR Accuracy Achieved ✅  
**Qualité**: 0 doublon, 0 contradiction, Score conformité 92/100

## ⚠️ RÈGLES DE DOCUMENTATION - IMPORTANT

### Principes Fondamentaux
1. **AUCUN DOUBLON** - Chaque document a un rôle unique et spécifique
2. **AUCUNE CONTRADICTION** - Métriques cohérentes partout (100% OCR, 3.2s, v2.1.0)
3. **SOURCE DE VÉRITÉ** - Utiliser `CURRENT_STATE.md` pour toutes les métriques
4. **MISE À JOUR > CRÉATION** - Toujours mettre à jour plutôt que créer
5. **ARCHIVES AVEC WARNING** - Documents obsolètes dans ARCHIVES_2025_07 ont des avertissements

### Documents Essentiels et Leur Rôle
| Document | Rôle Unique | Emplacement |
|----------|-------------|-------------|
| USER_GUIDE.md | Guide utilisateur complet | 01_QUICK_START/ |
| ADMIN_GUIDE.md | Guide administrateur technique | 01_QUICK_START/ |
| MASTER_OCR_RULES.md | Les 6 règles pour 100% succès | 02_OCR_RULES/ |
| CURRENT_STATE.md | **Métriques officielles** | Racine |
| CHANGELOG.md | Historique versions | Racine |
| TESTING.md | Stratégie tests | Racine |
| GLOSSARY.md | Termes MTG/techniques | Racine |

## 🎯 Navigation Rapide

- [Quick Start Guide](01_QUICK_START/README.md) - Démarrage en 5 minutes
- [Règles OCR Maîtres](02_OCR_RULES/MASTER_OCR_RULES.md) - Les 6 règles pour 100% de succès
- [Architecture Technique](03_ARCHITECTURE/README.md) - Comprendre le système
- [Guide de Déploiement](04_DEPLOYMENT/README.md) - Mise en production
- [Documentation Développeur](05_DEVELOPMENT/README.md) - Pour contribuer

## 📂 Structure de la Documentation

### 01_QUICK_START/
Guides de démarrage rapide pour tous les utilisateurs.
- `README.md` - Guide principal de démarrage
- `USER_GUIDE.md` - **NOUVEAU** Guide utilisateur complet avec toutes les fonctionnalités
- `ADMIN_GUIDE.md` - **NOUVEAU** Guide administrateur pour installation et maintenance

### 02_OCR_RULES/ 
Les 6 règles OCR qui garantissent 100% de précision.
- `MASTER_OCR_RULES.md` - Document consolidé avec toutes les règles
- `RULE_1_SUPER_RESOLUTION.md` - Amélioration d'image 4x
- `RULE_2_ZONE_DETECTION.md` - Détection mainboard/sideboard
- `RULE_3_PARALLEL_PROCESSING.md` - Pipelines parallèles
- `RULE_4_SMART_CACHE.md` - Cache intelligent 95% hit rate
- `RULE_5_MTGO_LAND_FIX.md` - Correction bug MTGO
- `RULE_6_SCRYFALL_VALIDATION.md` - Validation avec Never Give Up Mode™

### 03_ARCHITECTURE/
Documentation technique complète du système.
- `README.md` - Vue d'ensemble de l'architecture
- `WEB_APP.md` - Application web React/Express
- `DISCORD_BOT.md` - Bot Discord Python
- `API_SERVER.md` - Serveur API Node.js
- `DATA_FLOW.md` - Flux de données complet
- `SERVICES.md` - Description des services clés

### 04_DEPLOYMENT/
Guides de déploiement et configuration.
- `README.md` - Options de déploiement
- `DOCKER.md` - Déploiement Docker
- `SELF_HOSTING.md` - Auto-hébergement
- `PRODUCTION.md` - Configuration production
- `ENVIRONMENT.md` - Variables d'environnement
- `SECURITY.md` - Sécurité et best practices

### 05_DEVELOPMENT/
Documentation pour les développeurs.
- `README.md` - Guide du contributeur
- `SETUP.md` - Configuration environnement dev
- `TESTING.md` - Tests et validation
- `API_REFERENCE.md` - Référence API complète
- `CONTRIBUTING.md` - Comment contribuer

### 06_RAPPORTS/
Rapports techniques et analyses.
- `PERFORMANCE.md` - Rapport de performance
- `VALIDATION_100_PERCENT.md` - Validation 100% OCR
- `OPTIMIZATION.md` - Optimisations appliquées

### ARCHIVES/
Documentation historique et anciens rapports.

## 🚀 Points Clés du Projet

### ✅ Fonctionnalités Principales
- **OCR 100% Précis** sur screenshots MTGA/MTGO
- **Auto-Copie Presse-Papier** instantanée
- **Export Multi-Format** (MTGA, Moxfield, Archidekt, etc.)
- **Bot Discord** avec commandes slash
- **Performance** : 3.2s en moyenne par deck

### 🛠 Stack Technique
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, OpenAI Vision API
- **Discord Bot**: Python, EasyOCR, discord.py
- **Services**: Scryfall API, Redis (optionnel)

### 📊 Métriques de Performance
- **Précision OCR**: 100% sur 14 decks de test
- **Temps moyen**: 3.2s (réduit de 8.5s)
- **Cache Hit Rate**: 95%
- **Uptime**: 99.9% en production

## 📝 Changelog

### v2.1.0 (Juillet 2025)
- ✅ 100% précision OCR atteinte
- ✅ Never Give Up Mode™ implémenté
- ✅ Correction automatique bug MTGO lands
- ✅ Auto-copie presse-papier
- ✅ Performance optimisée (3.2s)

## 🔗 Liens Utiles

- [GitHub Repository](https://github.com/yourusername/screen-to-deck)
- [Discord Support](https://discord.gg/yourserver)
- [API Documentation](03_ARCHITECTURE/API_SERVER.md)
- [Scryfall API](https://scryfall.com/docs/api)

## 📞 Support

Pour toute question ou problème :
1. Consultez le [Guide de Troubleshooting](01_QUICK_START/TROUBLESHOOTING.md)
2. Ouvrez une issue sur GitHub
3. Rejoignez notre Discord

---

*Documentation maintenue à jour - Dernière révision : Août 2025*