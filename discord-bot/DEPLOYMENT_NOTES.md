# 🚀 Notes de Déploiement - Clipboard Feature

## Changements Apportés

### Nouveaux Fichiers
1. **clipboard_service.py** - Service principal pour la gestion de la copie
2. **tests/test_clipboard.py** - Tests unitaires pour le service
3. **demo_clipboard.py** - Script de démonstration
4. **validate_bot.py** - Script de validation pré-déploiement
5. **CLIPBOARD_FEATURE.md** - Documentation de la fonctionnalité

### Fichiers Modifiés
1. **bot.py**
   - Import du `ClipboardService`
   - Ajout de l'instance `bot.clipboard_service`
   - Nouveaux boutons "Copy MTGA" et "Copy Moxfield"
   - Nouvelles commandes slash: `/copy_last_deck`, `/scan`, `/deck_help`
   - Cache automatique des decks après scan

## Configuration Requise

### Variables d'Environnement (.env)
Aucune nouvelle variable d'environnement n'est requise. Les variables existantes suffisent:
```env
DISCORD_BOT_TOKEN=your_bot_token_here
API_BASE_URL=http://localhost:3001/api
```

### Dépendances Python
Aucune nouvelle dépendance n'est requise. Le service utilise uniquement:
- `discord.py` (déjà installé)
- `dataclasses` (standard library)
- `hashlib` (standard library)
- `datetime` (standard library)

## Instructions de Déploiement

### 1. Test Local
```bash
# Activer l'environnement virtuel
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Vérifier les imports
python3 validate_bot.py

# Lancer les tests
python3 tests/test_clipboard.py

# Démarrer le bot
python3 bot.py
```

### 2. Déploiement Production

#### Docker
Si vous utilisez Docker, aucun changement n'est nécessaire au Dockerfile:
```bash
docker-compose build discord-bot
docker-compose up -d discord-bot
```

#### Déploiement Manuel
```bash
# Sur le serveur de production
cd /path/to/discord-bot

# Pull les changements
git pull

# Redémarrer le bot
supervisorctl restart discord-bot
# ou
systemctl restart discord-bot
# ou
pm2 restart discord-bot
```

## Utilisation de la Nouvelle Fonctionnalité

### Pour les Utilisateurs

1. **Scanner un deck** - Upload une image et clic sur 📷
2. **Copier le deck** - Clic sur "Copy MTGA" ou "Copy Moxfield"
3. **Coller** - Le deck apparaît dans un code block, facile à copier

### Commandes Slash Disponibles

- `/copy_last_deck [format]` - Copie le dernier deck scanné
  - Formats: mtga, moxfield, plain
  
- `/scan [image] [format]` - Scan direct avec upload d'image
  - Formats: mtga, moxfield, enhanced
  
- `/deck_help` - Affiche l'aide complète

## Fonctionnalités Clés

### 1. Cache Intelligent
- Cache de 30 minutes par utilisateur
- Nettoyage automatique des caches expirés
- Pas de base de données requise (in-memory)

### 2. Messages Ephémères
- Les popups de copie sont privés (ephemeral)
- Seul l'utilisateur qui a demandé le scan peut voir le deck

### 3. Support Multi-Format
- MTGA (Magic Arena)
- Moxfield
- Plain text
- Extensible pour d'autres formats

## Monitoring

### Logs à Surveiller
```python
# Succès de cache
"📦 Deck mis en cache pour l'utilisateur {user_id}"

# Cache expiré
"🗑️ Cache expiré pour l'utilisateur {user_id}"

# Nettoyage
"🧹 Nettoyage du cache: {n} entrées supprimées"
```

### Métriques Suggérées
- Nombre de copies par jour
- Format le plus utilisé
- Temps moyen avant copie
- Taux d'utilisation du cache

## Troubleshooting

### Problème: "No recent deck found"
**Cause**: Le cache a expiré (>30 min) ou l'utilisateur n'a pas scanné de deck
**Solution**: Scanner un nouveau deck

### Problème: Deck tronqué dans Discord
**Cause**: Limite de caractères Discord (4096 pour embed description)
**Solution**: Utiliser le bouton "Export File" pour les gros decks

### Problème: Boutons non cliquables
**Cause**: Timeout de la vue (10 minutes)
**Solution**: Re-scanner le deck

## Performance

- **Mémoire**: ~1KB par deck en cache
- **CPU**: Négligeable (<1ms par opération)
- **Réseau**: Aucun appel externe supplémentaire
- **Stockage**: Aucun (tout en mémoire)

## Sécurité

- ✅ Pas de stockage persistant de données
- ✅ Cache isolé par utilisateur
- ✅ Messages ephémères pour la confidentialité
- ✅ Validation des permissions utilisateur
- ✅ Nettoyage automatique des données

## Rollback

Si nécessaire, pour revenir en arrière:
1. Restaurer l'ancien `bot.py` depuis git
2. Supprimer `clipboard_service.py`
3. Redémarrer le bot

Les changements sont isolés et n'affectent pas les fonctionnalités existantes.

## Support

Pour toute question ou problème:
1. Vérifier les logs du bot
2. Lancer `validate_bot.py` pour diagnostiquer
3. Consulter `CLIPBOARD_FEATURE.md` pour la documentation complète

## Prochaines Améliorations Possibles

1. **Historique des Decks** - Garder les 5 derniers scans
2. **Partage par Lien** - Générer un lien temporaire pour partager
3. **Conversion de Format** - Convertir entre formats à la volée
4. **Export vers Sites** - Intégration directe avec Moxfield/Archidekt API
5. **QR Code** - Générer un QR code pour mobile