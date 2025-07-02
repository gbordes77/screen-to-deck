#!/bin/bash

# ===========================================
# SCRIPT DÉVELOPPEMENT RAPIDE - SCREEN TO DECK
# ===========================================
# Lance tous les services de développement en parallèle
# Usage: ./scripts/dev.sh [--clean] [--logs] [--stop]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$PROJECT_ROOT/scripts/.dev-pids"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Arguments
CLEAN_MODE=false
LOGS_MODE=false
STOP_MODE=false

for arg in "$@"; do
    case $arg in
        --clean) CLEAN_MODE=true ;;
        --logs) LOGS_MODE=true ;;
        --stop) STOP_MODE=true ;;
    esac
done

print_header() {
    clear
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════╗"
    echo "║     🚀 SCREEN TO DECK - DEV MODE      ║"
    echo "║        Développement Full Stack        ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] 🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}[$(date '+%H:%M:%S')] ℹ️  $1${NC}"
}

# ===========================================
# FONCTION STOP
# ===========================================

stop_services() {
    print_step "Arrêt des services de développement..."
    
    if [[ -f "$PID_FILE" ]]; then
        while IFS= read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                print_info "Arrêt du processus $pid..."
                kill -TERM "$pid" 2>/dev/null || true
                sleep 2
                if kill -0 "$pid" 2>/dev/null; then
                    kill -KILL "$pid" 2>/dev/null || true
                fi
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    # Arrêter les processus par port
    for port in 3000 3001 5173; do
        pid=$(lsof -ti:$port 2>/dev/null || true)
        if [[ -n "$pid" ]]; then
            print_info "Arrêt du service sur le port $port (PID: $pid)..."
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done
    
    print_success "Services arrêtés"
    exit 0
}

# ===========================================
# FONCTION LOGS
# ===========================================

show_logs() {
    print_step "Affichage des logs en temps réel..."
    echo -e "${CYAN}Press Ctrl+C to stop${NC}"
    echo ""
    
    # Créer des fichiers de logs s'ils n'existent pas
    mkdir -p "$PROJECT_ROOT/scripts/logs"
    touch "$PROJECT_ROOT/scripts/logs/client.log"
    touch "$PROJECT_ROOT/scripts/logs/server.log"
    touch "$PROJECT_ROOT/scripts/logs/discord-bot.log"
    
    # Afficher les logs en parallèle avec couleurs
    tail -f "$PROJECT_ROOT/scripts/logs/client.log" | sed 's/^/[CLIENT] /' &
    tail -f "$PROJECT_ROOT/scripts/logs/server.log" | sed 's/^/[SERVER] /' &
    tail -f "$PROJECT_ROOT/scripts/logs/discord-bot.log" | sed 's/^/[BOT] /' &
    
    wait
}

# ===========================================
# TRAITEMENT DES ARGUMENTS
# ===========================================

if [[ "$STOP_MODE" = true ]]; then
    stop_services
fi

if [[ "$LOGS_MODE" = true ]]; then
    show_logs
fi

print_header

# ===========================================
# NETTOYAGE (SI DEMANDÉ)
# ===========================================

if [[ "$CLEAN_MODE" = true ]]; then
    print_step "🧹 Nettoyage complet..."
    
    # Arrêter les services existants
    stop_services > /dev/null 2>&1 || true
    
    # Nettoyer les dossiers
    cd "$PROJECT_ROOT"
    
    if [[ -d "client/node_modules" ]]; then
        print_info "Nettoyage client..."
        cd client
        rm -rf node_modules dist .cache
        npm install
        cd ..
    fi
    
    if [[ -d "server/node_modules" ]]; then
        print_info "Nettoyage serveur..."
        cd server
        rm -rf node_modules dist .cache
        npm install
        cd ..
    fi
    
    if [[ -d "discord-bot/venv" ]]; then
        print_info "Nettoyage bot Discord..."
        cd discord-bot
        rm -rf venv __pycache__ *.pyc
        python -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        cd ..
    fi
    
    print_success "Nettoyage terminé"
fi

# ===========================================
# VÉRIFICATIONS PRÉALABLES
# ===========================================

print_step "Vérification des prérequis..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js n'est pas installé!"
    exit 1
fi

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    print_error "Python3 n'est pas installé!"
    exit 1
fi

# Vérifier les dépendances
cd "$PROJECT_ROOT"

if [[ -f "client/package.json" ]] && [[ ! -d "client/node_modules" ]]; then
    print_info "Installation des dépendances client..."
    cd client && npm install && cd ..
fi

if [[ -f "server/package.json" ]] && [[ ! -d "server/node_modules" ]]; then
    print_info "Installation des dépendances serveur..."
    cd server && npm install && cd ..
fi

if [[ -f "discord-bot/requirements.txt" ]] && [[ ! -d "discord-bot/venv" ]]; then
    print_info "Création de l'environnement Python..."
    cd discord-bot
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

print_success "Prérequis validés"

# ===========================================
# CRÉATION DES DOSSIERS DE LOGS
# ===========================================

mkdir -p "$PROJECT_ROOT/scripts/logs"
rm -f "$PID_FILE"

# ===========================================
# LANCEMENT DES SERVICES
# ===========================================

print_step "🚀 Lancement des services de développement..."

# Service 1: Client React (Vite)
if [[ -f "$PROJECT_ROOT/client/package.json" ]]; then
    print_info "Démarrage du client React (port 5173)..."
    cd "$PROJECT_ROOT/client"
    npm run dev > "$PROJECT_ROOT/scripts/logs/client.log" 2>&1 &
    CLIENT_PID=$!
    echo $CLIENT_PID >> "$PID_FILE"
    cd "$PROJECT_ROOT"
    sleep 2
    print_success "Client React démarré (PID: $CLIENT_PID)"
fi

# Service 2: Serveur Node.js
if [[ -f "$PROJECT_ROOT/server/package.json" ]]; then
    print_info "Démarrage du serveur Node.js (port 3001)..."
    cd "$PROJECT_ROOT/server"
    npm run dev > "$PROJECT_ROOT/scripts/logs/server.log" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID >> "$PID_FILE"
    cd "$PROJECT_ROOT"
    sleep 2
    print_success "Serveur Node.js démarré (PID: $SERVER_PID)"
fi

# Service 3: Bot Discord
if [[ -f "$PROJECT_ROOT/discord-bot/bot.py" ]] && [[ -d "$PROJECT_ROOT/discord-bot/venv" ]]; then
    print_info "Démarrage du bot Discord..."
    cd "$PROJECT_ROOT/discord-bot"
    source venv/bin/activate
    python bot.py > "$PROJECT_ROOT/scripts/logs/discord-bot.log" 2>&1 &
    BOT_PID=$!
    echo $BOT_PID >> "$PID_FILE"
    cd "$PROJECT_ROOT"
    sleep 2
    print_success "Bot Discord démarré (PID: $BOT_PID)"
fi

# ===========================================
# HEALTH CHECKS
# ===========================================

print_step "Vérification de la santé des services..."

sleep 5

# Check Client
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    print_success "✅ Client React: OK (http://localhost:5173)"
else
    print_warning "⚠️  Client React: En attente..."
fi

# Check Server
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    print_success "✅ Serveur API: OK (http://localhost:3001)"
else
    print_warning "⚠️  Serveur API: En attente..."
fi

# Check Bot (via logs)
if grep -q "Bot is ready" "$PROJECT_ROOT/scripts/logs/discord-bot.log" 2>/dev/null; then
    print_success "✅ Bot Discord: OK"
else
    print_warning "⚠️  Bot Discord: En cours de démarrage..."
fi

# ===========================================
# INTERFACE UTILISATEUR
# ===========================================

print_success "🎉 Tous les services sont lancés!"
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════╗"
echo -e "║               🌟 SERVICES ACTIFS               ║"
echo -e "╠═══════════════════════════════════════════════╣"
echo -e "║ 📱 Frontend:    http://localhost:5173        ║"
echo -e "║ 🖥️  Backend:     http://localhost:3001        ║"
echo -e "║ 📊 API Health:  http://localhost:3001/health  ║"
echo -e "║ 🤖 Discord Bot: Démarré                      ║"
echo -e "╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}💡 Commandes utiles:${NC}"
echo "  • Logs temps réel:  ./scripts/dev.sh --logs"
echo "  • Arrêter services: ./scripts/dev.sh --stop"
echo "  • Nettoyage:       ./scripts/dev.sh --clean"
echo "  • Commit auto:     ./scripts/auto-commit.sh"
echo "  • Déploiement:     ./scripts/deploy.sh staging"
echo ""
echo -e "${GREEN}✨ Développement prêt! Bon code! ✨${NC}"

# ===========================================
# MONITORING CONTINU
# ===========================================

# Fonction de monitoring en arrière-plan
monitor_services() {
    while true; do
        sleep 30
        
        if [[ -f "$PID_FILE" ]]; then
            while IFS= read -r pid; do
                if ! kill -0 "$pid" 2>/dev/null; then
                    print_warning "Service $pid arrêté inattenduement"
                fi
            done < "$PID_FILE"
        fi
    done
}

# Lancer le monitoring en arrière-plan
monitor_services &
MONITOR_PID=$!
echo $MONITOR_PID >> "$PID_FILE"

# Attendre que l'utilisateur interrompe
print_info "Services en cours d'exécution... (Ctrl+C pour arrêter)"

# Trap pour gérer l'interruption proprement
trap 'print_step "Interruption détectée..."; stop_services' INT TERM

# Attendre indéfiniment
wait 