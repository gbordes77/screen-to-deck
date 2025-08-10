#!/bin/bash

# MTG Screen-to-Deck Critical Test Suite Runner
# This script runs all critical tests to validate the 60+15 card guarantee

set -e

echo "==========================================="
echo "🎯 MTG SCREEN-TO-DECK CRITICAL TEST SUITE"
echo "==========================================="
echo ""
echo "📋 Testing Requirements:"
echo "  ✓ MUST extract exactly 60 mainboard cards"
echo "  ✓ MUST extract exactly 15 sideboard cards"
echo "  ✓ MUST handle OCR failures gracefully"
echo "  ✓ MUST maintain consistency across interfaces"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test suite
run_test() {
    local name=$1
    local command=$2
    local directory=$3
    
    echo "▶️  Running: $name"
    echo "  Directory: $directory"
    echo "  Command: $command"
    echo ""
    
    cd "$directory"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ $name: PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $name: FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    
    echo ""
    echo "-------------------------------------------"
    echo ""
}

# Create test summary file
REPORT_FILE="test-results-$(date +%Y%m%d-%H%M%S).md"

echo "# Critical Test Results Report" > $REPORT_FILE
echo "Date: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# 1. Backend Jest Tests
echo "🔧 BACKEND TESTS (Node.js/Jest)"
echo "================================"

run_test \
    "Enhanced OCR Service Unit Tests" \
    "npm test -- tests/services/enhancedOcrService.test.ts --coverage" \
    "server"

run_test \
    "E2E OCR Guarantee Tests" \
    "npm test -- tests/e2e/ocr-guarantee.test.ts" \
    "server"

# 2. Discord Bot Python Tests
echo ""
echo "🤖 DISCORD BOT TESTS (Python/pytest)"
echo "====================================="

run_test \
    "OCR Parser Guarantee Tests" \
    "python -m pytest tests/test_ocr_guarantee.py -v" \
    "discord-bot"

run_test \
    "Scryfall Integration Tests" \
    "python tests/test_scryfall.py" \
    "discord-bot"

# 3. Integration Tests
echo ""
echo "🔗 INTEGRATION TESTS"
echo "===================="

# Check if services are running
echo "Checking service availability..."

if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is running${NC}"
    
    # Run integration test
    run_test \
        "API Integration Test" \
        "curl -X POST http://localhost:3001/api/ocr/test-guarantee" \
        "."
else
    echo -e "${YELLOW}⚠️  Backend API not running - skipping integration tests${NC}"
fi

# 4. Generate Coverage Report
echo ""
echo "📊 COVERAGE REPORT"
echo "=================="

if [ -d "server/coverage" ]; then
    echo "Backend coverage report available at: server/coverage/index.html"
    
    # Extract coverage summary
    if [ -f "server/coverage/coverage-summary.json" ]; then
        echo ""
        echo "Coverage Summary:"
        node -e "
        const coverage = require('./server/coverage/coverage-summary.json');
        const total = coverage.total;
        console.log('  Lines:     ' + total.lines.pct + '%');
        console.log('  Statements:' + total.statements.pct + '%');
        console.log('  Functions: ' + total.functions.pct + '%');
        console.log('  Branches:  ' + total.branches.pct + '%');
        "
    fi
fi

# 5. Final Summary
echo ""
echo "==========================================="
echo "📈 TEST SUMMARY"
echo "==========================================="
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! ($TESTS_PASSED/$TOTAL_TESTS)${NC}"
    echo ""
    echo "✅ The 60+15 card guarantee is validated!"
    
    # Update report
    echo "## ✅ Test Status: PASSED" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "All critical tests passed successfully." >> $REPORT_FILE
else
    echo -e "${RED}⚠️  SOME TESTS FAILED! ($TESTS_FAILED/$TOTAL_TESTS failed)${NC}"
    echo ""
    echo "❌ The 60+15 card guarantee is NOT validated!"
    echo "   Please fix the failing tests before deployment."
    
    # Update report
    echo "## ❌ Test Status: FAILED" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "$TESTS_FAILED out of $TOTAL_TESTS tests failed." >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "### Test Results:" >> $REPORT_FILE
echo "- Tests Passed: $TESTS_PASSED" >> $REPORT_FILE
echo "- Tests Failed: $TESTS_FAILED" >> $REPORT_FILE
echo "- Total Tests: $TOTAL_TESTS" >> $REPORT_FILE

# 6. Critical Issues Check
echo ""
echo "🔍 CHECKING CRITICAL ISSUES"
echo "============================"

echo "" >> $REPORT_FILE
echo "## Critical Issues Status" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check if enhanced OCR service guarantees 60+15
if grep -q "neverGiveUpMode" server/src/services/enhancedOcrService.ts; then
    echo -e "${GREEN}✅ Never Give Up mode implemented${NC}"
    echo "- ✅ Never Give Up mode implemented" >> $REPORT_FILE
else
    echo -e "${RED}❌ Never Give Up mode NOT found${NC}"
    echo "- ❌ Never Give Up mode NOT found" >> $REPORT_FILE
fi

# Check if validation enforces totals
if grep -q "validateAndFix" server/src/services/enhancedOcrService.ts; then
    echo -e "${GREEN}✅ Validation and auto-fix implemented${NC}"
    echo "- ✅ Validation and auto-fix implemented" >> $REPORT_FILE
else
    echo -e "${RED}❌ Validation and auto-fix NOT found${NC}"
    echo "- ❌ Validation and auto-fix NOT found" >> $REPORT_FILE
fi

# Check Discord bot consistency
if [ -f "discord-bot/ocr_parser_unified.py" ]; then
    echo -e "${GREEN}✅ Unified OCR parser exists${NC}"
    echo "- ✅ Unified OCR parser exists" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  Unified OCR parser not found - potential inconsistency${NC}"
    echo "- ⚠️ Unified OCR parser not found" >> $REPORT_FILE
fi

echo ""
echo "==========================================="
echo "📄 Full report saved to: $REPORT_FILE"
echo "==========================================="

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi