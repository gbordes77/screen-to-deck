#!/bin/bash

# Quick test runner for real image validation
# This script runs the test suite with real MTG images

echo "🎴 MTG OCR Real Image Test Suite"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Function to run tests with nice output
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${BLUE}Running: ${test_name}${NC}"
    echo "-----------------------------------"
    
    if eval $test_command; then
        echo -e "${GREEN}✅ ${test_name} passed${NC}"
        return 0
    else
        echo -e "${RED}❌ ${test_name} failed${NC}"
        return 1
    fi
    echo ""
}

# Generate test images if needed
echo -e "${YELLOW}Step 1: Preparing test images...${NC}"
if [ ! -d "server/tests/test-images" ] || [ ! -f "server/tests/test-images/arena-standard.png" ]; then
    echo "Generating test images..."
    cd server && npm run test:generate-images
    cd ..
else
    echo "Test images already exist ✓"
fi
echo ""

# Run web service tests
echo -e "${YELLOW}Step 2: Testing Web Service...${NC}"
cd server
run_test "Web Service Real Images" "npm run test:real"
web_result=$?
cd ..
echo ""

# Run Discord bot tests
echo -e "${YELLOW}Step 3: Testing Discord Bot...${NC}"
cd discord-bot
run_test "Discord Bot Real Images" "python -m pytest tests/test_real_images.py -v"
bot_result=$?
cd ..
echo ""

# Summary
echo -e "${BLUE}=================================="
echo "          TEST SUMMARY"
echo -e "==================================${NC}"

if [ $web_result -eq 0 ] && [ $bot_result -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
    echo -e "${GREEN}✅ 60+15 guarantee validated${NC}"
    echo -e "${GREEN}✅ Both services working correctly${NC}"
    exit 0
else
    echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
    [ $web_result -ne 0 ] && echo -e "${RED}❌ Web service tests failed${NC}"
    [ $bot_result -ne 0 ] && echo -e "${RED}❌ Discord bot tests failed${NC}"
    exit 1
fi