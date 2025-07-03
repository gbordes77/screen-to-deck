#!/bin/bash

echo "🧹 LANCEMENT PROPRE - VERSION 29 JUIN QUI MARCHAIT"
echo "=================================================="

# 1. Nettoyage total des anciens processus
echo "🛑 Arrêt de toutes les instances précédentes..."
pkill -f "python3.*bot.py" 2>/dev/null
pkill -f "python.*bot.py" 2>/dev/null
sleep 3

# 2. Vérification qu'aucun processus ne tourne
RUNNING=$(ps aux | grep -E "python.*bot\.py" | grep -v grep | wc -l | tr -d ' ')
if [ "$RUNNING" -gt 0 ]; then
    echo "❌ ERREUR: Des processus bot tournent encore"
    ps aux | grep -E "python.*bot\.py" | grep -v grep
    exit 1
fi

echo "✅ Aucun processus bot en cours"

# 3. Test des dépendances critiques
echo "🔍 Test des dépendances..."
python3 -c "
from ocr_parser_easyocr import MTGOCRParser, ParseResult, ParsedCard
from scryfall_service import ScryfallService
import discord
import easyocr
print('✅ Toutes les dépendances OK')
" || {
    echo "❌ ERREUR: Dépendances manquantes"
    exit 1
}

# 4. Lancement du bot
echo "🚀 Lancement du bot (version 29 juin)..."
python3 bot.py &
BOT_PID=$!

# 5. Vérification que le bot démarre bien
sleep 5
if ps -p $BOT_PID > /dev/null 2>&1; then
    echo "✅ BOT LANCÉ AVEC SUCCÈS - PID: $BOT_PID"
    echo "📋 Pour l'arrêter: kill $BOT_PID"
    echo "📊 Status: Le bot devrait maintenant être en ligne sur Discord"
    echo ""
    echo "🧪 PROCÉDURE DE TEST:"
    echo "1. Va dans Discord #test-screen-to-deck"
    echo "2. Upload une image de deck MTG"
    echo "3. Clique sur l'emoji 📷"
    echo "4. Résultat attendu: 85% des cartes détectées"
    echo ""
    echo "💡 Cette version a été testée le 29 juin avec succès !"
else
    echo "❌ ERREUR: Le bot n'a pas démarré correctement"
    exit 1
fi 