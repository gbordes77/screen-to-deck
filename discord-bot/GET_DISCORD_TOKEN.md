# 🤖 Comment obtenir votre Discord Bot Token

## Étapes pour créer un bot Discord et obtenir son token

### 1. Créer une application Discord
1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Connectez-vous avec votre compte Discord
3. Cliquez sur **"New Application"** (bouton bleu en haut à droite)
4. Donnez un nom à votre application (ex: "MTG Deck Scanner")
5. Cliquez sur **"Create"**

### 2. Créer le bot
1. Dans le menu de gauche, cliquez sur **"Bot"**
2. Cliquez sur **"Add Bot"**
3. Confirmez en cliquant **"Yes, do it!"**

### 3. Obtenir le token
1. Dans la section Bot, trouvez **"Token"**
2. Cliquez sur **"Reset Token"** (ou "Copy" si c'est votre première fois)
3. ⚠️ **IMPORTANT**: Copiez le token immédiatement, il ne sera plus visible après !
4. Le token ressemble à : `[EXEMPLE_TOKEN_NE_PAS_UTILISER]`

### 4. Configurer le token dans le projet
1. Ouvrez le fichier `/discord-bot/.env`
2. Remplacez `your_bot_token_here` par votre token :
   ```
   DISCORD_BOT_TOKEN=[VOTRE_TOKEN_ICI]
   ```
3. Sauvegardez le fichier

### 5. Configurer les permissions du bot
1. Dans le Developer Portal, allez dans **"OAuth2"** > **"URL Generator"**
2. Dans **"Scopes"**, cochez :
   - ✅ `bot`
   - ✅ `applications.commands`
3. Dans **"Bot Permissions"**, cochez :
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ Use Slash Commands
   - ✅ Add Reactions
4. Copiez l'URL générée en bas

### 6. Inviter le bot sur votre serveur
1. Ouvrez l'URL copiée dans votre navigateur
2. Sélectionnez le serveur où ajouter le bot
3. Cliquez sur **"Authorize"**
4. Complétez le captcha si demandé

### 7. Tester le bot
```bash
cd discord-bot
source venv/bin/activate  # Sur macOS/Linux
python bot.py
```

Le bot devrait apparaître en ligne sur votre serveur Discord !

## 🔒 Sécurité

**IMPORTANT - Ne jamais partager votre token !**
- Ne commitez jamais le fichier `.env` sur Git
- Ne partagez jamais votre token publiquement
- Si votre token est compromis, régénérez-le immédiatement dans le Developer Portal

## 🆘 Problèmes courants

### Le bot n'apparaît pas en ligne
- Vérifiez que le token est correct dans `.env`
- Assurez-vous que Python a accès à Internet
- Vérifiez les logs dans le terminal

### Erreur "Invalid token"
- Le token a peut-être été régénéré
- Vérifiez qu'il n'y a pas d'espaces avant/après le token
- Assurez-vous d'utiliser `DISCORD_BOT_TOKEN` et non `DISCORD_TOKEN`

### Le bot ne répond pas aux commandes
- Vérifiez que le bot a les permissions nécessaires sur le serveur
- Assurez-vous que les slash commands sont activées
- Attendez 1-2 minutes après le démarrage pour que les commandes se synchronisent