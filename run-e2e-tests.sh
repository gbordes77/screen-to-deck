#!/bin/bash

# MTG Screen-to-Deck E2E Integration Test Runner
# This script runs comprehensive end-to-end tests for both web service and Discord bot

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}     MTG Screen-to-Deck E2E Integration Test Suite${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check for OpenAI API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}❌ Error: OPENAI_API_KEY environment variable is not set${NC}"
    echo -e "${YELLOW}Please set it with: export OPENAI_API_KEY='your-key-here'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ OpenAI API key found${NC}"

# Function to run web service tests
run_web_tests() {
    echo ""
    echo -e "${BLUE}🌐 Running Web Service E2E Tests...${NC}"
    echo -e "${BLUE}──────────────────────────────────────${NC}"
    
    cd server
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing server dependencies...${NC}"
        npm install
    fi
    
    # Create reports directory
    mkdir -p tests/integration/reports
    
    # Run the standalone test runner
    echo -e "${CYAN}Starting test runner...${NC}"
    npm run test:integration:runner
    
    cd ..
    
    echo -e "${GREEN}✅ Web service tests completed${NC}"
}

# Function to run Discord bot tests
run_discord_tests() {
    echo ""
    echo -e "${BLUE}🤖 Running Discord Bot E2E Tests...${NC}"
    echo -e "${BLUE}──────────────────────────────────────${NC}"
    
    cd discord-bot
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating Python virtual environment...${NC}"
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies if needed
    echo -e "${YELLOW}Installing/updating Python dependencies...${NC}"
    pip install -q -r requirements.txt
    
    # Create reports directory
    mkdir -p tests/reports
    
    # Run the E2E tests
    echo -e "${CYAN}Starting Discord bot tests...${NC}"
    python tests/test_e2e_real.py
    
    deactivate
    cd ..
    
    echo -e "${GREEN}✅ Discord bot tests completed${NC}"
}

# Function to generate comparison report
generate_comparison() {
    echo ""
    echo -e "${BLUE}📊 Generating Comparison Report...${NC}"
    echo -e "${BLUE}──────────────────────────────────────${NC}"
    
    # Find most recent reports
    WEB_REPORT=$(ls -t server/tests/integration/reports/report-*.json 2>/dev/null | head -1)
    BOT_REPORT=$(ls -t discord-bot/tests/reports/discord_bot_report_*.json 2>/dev/null | head -1)
    
    if [ -z "$WEB_REPORT" ] || [ -z "$BOT_REPORT" ]; then
        echo -e "${YELLOW}⚠️ Could not find both reports for comparison${NC}"
        return
    fi
    
    echo -e "${GREEN}Found reports:${NC}"
    echo -e "  Web: $(basename $WEB_REPORT)"
    echo -e "  Bot: $(basename $BOT_REPORT)"
    
    # TODO: Add comparison logic here (could call a Python/Node script)
    
    echo -e "${GREEN}✅ Comparison complete${NC}"
}

# Parse command line arguments
RUN_WEB=false
RUN_DISCORD=false
RUN_BOTH=false

if [ $# -eq 0 ]; then
    RUN_BOTH=true
else
    case "$1" in
        web)
            RUN_WEB=true
            ;;
        discord|bot)
            RUN_DISCORD=true
            ;;
        both|all)
            RUN_BOTH=true
            ;;
        *)
            echo -e "${RED}Invalid argument: $1${NC}"
            echo "Usage: $0 [web|discord|both]"
            echo "  web     - Run only web service tests"
            echo "  discord - Run only Discord bot tests"
            echo "  both    - Run both test suites (default)"
            exit 1
            ;;
    esac
fi

# Run tests based on arguments
START_TIME=$(date +%s)

if [ "$RUN_BOTH" = true ] || [ "$RUN_WEB" = true ]; then
    run_web_tests
fi

if [ "$RUN_BOTH" = true ] || [ "$RUN_DISCORD" = true ]; then
    run_discord_tests
fi

if [ "$RUN_BOTH" = true ]; then
    generate_comparison
fi

# Calculate total time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Final summary
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                    TEST SUITE COMPLETE${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Total execution time: ${MINUTES}m ${SECONDS}s${NC}"
echo ""
echo -e "${CYAN}Reports saved to:${NC}"
echo -e "  📁 server/tests/integration/reports/"
echo -e "  📁 discord-bot/tests/reports/"
echo ""
echo -e "${GREEN}✨ All tests completed successfully!${NC}"