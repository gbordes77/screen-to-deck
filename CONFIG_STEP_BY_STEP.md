# 🔧 **CONFIGURATION FINALE - ÉTAPES PRÉCISES**

## 📁 **MODIFIER LE FICHIER .env**

### **Étape 1 - Ouvrir le fichier** :
- ✅ Naviguer vers : `discord-bot/env.production`
- ✅ Ouvrir avec **TextEdit** ou **VS Code**

### **Étape 2 - Remplacer les clés** :

**Ligne à modifier** :
```bash
DISCORD_BOT_TOKEN=your-bot-token-here
```
**Remplacer par** :
```bash
DISCORD_BOT_TOKEN=MTgz... (ton token Discord copié)
```

**Ligne à modifier** :
```bash
OPENAI_API_KEY=your-openai-api-key-here  
```
**Remplacer par** :
```bash
OPENAI_API_KEY=sk-proj-... (ta clé OpenAI copiée)
```

### **Étape 3 - Sauvegarder** :
- ✅ **Cmd+S** (Mac) ou **Ctrl+S** (Windows)
- ✅ **Fermer** le fichier

---

## 🧪 **TEST FINAL**

### **Commande à exécuter** :
```bash
cd discord-bot
python bot.py
```

### **✅ Si ça marche** :
- Console affiche : `✅ Bot connecté !`
- Bot apparaît **en ligne** sur Discord
- Tu peux poster une image + emoji 📷

### **❌ Si erreur** :
- Vérifier les **clés copiées** (pas d'espaces)
- Vérifier **permissions Discord**
- Vérifier **crédit OpenAI** > $0

---

## 🎯 **UTILISATION**

### **Dans Discord** :
1. ✅ **Poster** une image de deck MTG
2. ✅ **Ajouter** emoji 📷 à l'image  
3. ✅ **Attendre** 3-5 secondes
4. ✅ Bot répond avec **liste cartes** + boutons export

**🏆 TON BOT MTG EST PRÊT !** 