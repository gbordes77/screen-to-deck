#!/bin/bash

# Enhanced MTG Discord Scanner Bot - Startup Script
# Phase 1 with intelligent Scryfall integration

echo "🃏 Enhanced MTG Discord Scanner Bot - Phase 1"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "bot.py" ]; then
    echo -e "${RED}❌ Error: bot.py not found!"
    echo -e "Please run this script from the discord-bot directory${NC}"
    exit 1
fi

# Check Python version
echo -e "${BLUE}🐍 Checking Python version...${NC}"
python_version=$(python3 --version 2>&1 | awk '{print $2}')
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Python 3 not found! Please install Python 3.8+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Python version: $python_version${NC}"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to create virtual environment${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Activate virtual environment
echo -e "${BLUE}🚀 Activating virtual environment...${NC}"
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to activate virtual environment${NC}"
    exit 1
fi

# Check if requirements are installed
echo -e "${BLUE}📋 Checking dependencies...${NC}"
pip install -q -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️ Installing dependencies...${NC}"
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Check for Tesseract
echo -e "${BLUE}🔍 Checking Tesseract OCR...${NC}"
tesseract --version >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tesseract OCR not found!${NC}"
    echo -e "${YELLOW}Please install Tesseract:${NC}"
    echo "  Ubuntu/Debian: sudo apt-get install tesseract-ocr"
    echo "  macOS: brew install tesseract"
    echo "  Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki"
    exit 1
fi
echo -e "${GREEN}✅ Tesseract OCR found${NC}"

# Check environment file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️ .env file not found, creating template...${NC}"
    cat > .env << EOL
# Enhanced MTG Discord Scanner Configuration
DISCORD_BOT_TOKEN=your_bot_token_here

# Optional: API Configuration
API_BASE_URL=http://localhost:3001/api

# Optional: OCR Configuration
OCR_LANGUAGE=eng
SCRYFALL_CACHE_HOURS=24

# Optional: Logging
LOG_LEVEL=INFO
MAX_IMAGE_SIZE_MB=10

# Optional: Performance
RATE_LIMIT_DELAY=0.05
CACHE_TTL_HOURS=2
EOL
    echo -e "${YELLOW}📝 Please edit .env file and add your Discord bot token${NC}"
    echo -e "${BLUE}You can get a token from: https://discord.com/developers/applications${NC}"
    exit 1
fi

# Check if token is set
source .env
if [ -z "$DISCORD_BOT_TOKEN" ] || [ "$DISCORD_BOT_TOKEN" = "your_bot_token_here" ]; then
    echo -e "${RED}❌ Discord bot token not configured!${NC}"
    echo -e "${YELLOW}Please edit the .env file and set DISCORD_BOT_TOKEN${NC}"
    exit 1
fi

# Display configuration
echo -e "${GREEN}✅ Configuration loaded${NC}"
echo ""
echo -e "${BLUE}🔧 Enhanced Features Enabled:${NC}"
echo "  • 🧠 AI-powered card correction"
echo "  • 🎲 Automatic format detection"
echo "  • 🔍 Intelligent Scryfall validation"
echo "  • 📊 Comprehensive deck analysis"
echo "  • 🔧 Real-time auto-corrections"
echo "  • 💰 Price estimation"
echo "  • ⚖️ Format legality checking"
echo ""

# Start the bot
echo -e "${GREEN}🚀 Starting Enhanced MTG Discord Scanner Bot...${NC}"
echo "Press Ctrl+C to stop the bot"
echo ""

# Run with proper error handling
python3 bot.py

# Handle exit
exit_code=$?
if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}👋 Bot shut down cleanly${NC}"
else
    echo -e "${RED}❌ Bot exited with error code: $exit_code${NC}"
fi

deactivate 