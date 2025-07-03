#!/bin/bash

# 🤖 Script de lancement du bot Discord MTG
# Version robuste avec gestion des erreurs

echo "🚀 Démarrage du bot Discord MTG Scanner..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "bot.py" ]; then
    echo "❌ Erreur: bot.py non trouvé dans le répertoire courant"
    exit 1
fi

# Vérifier que les dépendances sont installées
python3 -c "import discord, openai, easyocr" >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Erreur: Dépendances manquantes"
    exit 1
fi

# Arrêter les anciennes instances
pkill -f "python3 bot.py" 2>/dev/null

# Attendre que le processus se termine
sleep 2

# Lancer le bot
echo "🎯 Lancement du bot..."
python3 bot.py &

# Sauvegarder le PID
echo $! > bot.pid

echo "✅ Bot lancé avec PID: $(cat bot.pid)"
echo "📋 Pour arrêter le bot: kill $(cat bot.pid)"
echo "📊 Pour voir les logs: tail -f bot.log"

# Attendre quelques secondes et vérifier que ça marche
sleep 5

if ps -p $(cat bot.pid) > /dev/null 2>&1; then
    echo "✅ Bot en cours d'exécution"
else
    echo "❌ Le bot s'est arrêté"
    exit 1
fi 