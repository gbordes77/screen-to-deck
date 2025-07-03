#!/bin/bash
# reset-bot-env.sh - Script de réinitialisation complète

set -e  # Arrêt sur erreur

# Configuration
BOT_DIR="$(cd "$(dirname "$0")" && pwd)/discord-bot"
VENV_DIR="$BOT_DIR/venv"
REQUIREMENTS_FILE="$BOT_DIR/requirements-frozen.txt"
DEBUG_DIR="$BOT_DIR/ocr_debug"

echo "🔧 Réinitialisation complète de l'environnement bot..."
echo "📁 Répertoire: $BOT_DIR"

# 1. Arrêt des services
echo "📛 Arrêt des processus existants..."
pkill -f "python.*bot.py" || echo "Aucun processus à arrêter"

# 2. Sauvegarde et nettoyage
if [ -d "$VENV_DIR" ]; then
    echo "💾 Sauvegarde de l'ancien environnement..."
    mv "$VENV_DIR" "$VENV_DIR.backup.$(date +%Y%m%d_%H%M%S)"
fi

# 3. Création du debug directory
mkdir -p "$DEBUG_DIR"

# 4. Nettoyage cache pip
echo "🧹 Nettoyage du cache pip..."
python3 -m pip cache purge

# 5. Création nouvel environnement
echo "🏗️ Création de l'environnement virtuel propre..."
cd "$BOT_DIR"
python3 -m venv venv
source venv/bin/activate

# 6. Mise à jour pip
pip install --upgrade pip setuptools wheel

# 7. Installation des dépendances EXACTES
echo "📦 Installation des dépendances figées..."
if [ -f "$REQUIREMENTS_FILE" ]; then
    pip install -r "$REQUIREMENTS_FILE"
else
    echo "❌ ERREUR: $REQUIREMENTS_FILE introuvable!"
    exit 1
fi

# 8. Validation post-installation
echo "✅ Validation de l'installation..."
python validate_env.py

# 9. Test OCR de référence (NOTE: désactivé car le script n'existe pas encore)
# echo "🧪 Test OCR de référence..."
# if [ -f "test_images/reference_deck.png" ]; then
#     python debug_ocr_diff.py test_images/reference_deck.png
# fi

echo "✨ Environnement réinitialisé avec succès!"
deactivate 