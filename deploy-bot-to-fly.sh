#!/bin/bash
# Ce script déploie le bot Discord sur Fly.io en utilisant sa configuration spécifique.
set -e

echo "🚀 Déploiement du bot 'screen-to-deck-bot' sur Fly.io..."

# Le flag --ha=false est important pour un bot qui ne nécessite pas de haute disponibilité,
# cela permet d'utiliser le plan gratuit de Fly.io avec une seule machine.
flyctl deploy --config ./fly.bot.toml --dockerfile ./discord-bot/Dockerfile --ha=false

echo "✅ Déploiement initié. Vérification du statut de l'application..."
flyctl status --app screen-to-deck-bot 