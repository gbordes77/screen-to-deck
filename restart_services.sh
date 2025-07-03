#!/bin/bash
# Script fiable pour arrêter et relancer tous les services de développement.
# A exécuter depuis la racine du projet.

# Chemin vers le sous-répertoire du projet
PROJECT_DIR="screen-to-deck"

# Vérifie si le répertoire du projet existe
if [ ! -d "$PROJECT_DIR" ]; then
  echo "Erreur: Le répertoire '$PROJECT_DIR' n'a pas été trouvé."
  echo "Veuillez exécuter ce script depuis la racine du projet."
  exit 1
fi

echo "--- [SCREEN TO DECK] Arrêt des services ---"
cd "$PROJECT_DIR" || exit
./scripts/dev.sh --stop
echo "--- [SCREEN TO DECK] Services arrêtés ---"

echo ""

echo "--- [SCREEN TO DECK] Démarrage des services ---"
./scripts/dev.sh
echo "--- [SCREEN TO DECK] Services en cours de démarrage en arrière-plan ---" 