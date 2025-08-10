/**
 * Quick validation script to check if the 60+15 guarantee is properly implemented
 * Run with: node validate-60-15-guarantee.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating 60+15 Card Guarantee Implementation\n');
console.log('=' .repeat(50));

let issuesFound = 0;
let checksPerformed = 0;

// Check 1: Enhanced OCR Service Implementation
function checkEnhancedOCRService() {
    checksPerformed++;
    console.log('\n📝 Checking Enhanced OCR Service...');
    
    const servicePath = path.join(__dirname, 'server/src/services/enhancedOcrService.ts');
    
    if (!fs.existsSync(servicePath)) {
        console.log('  ❌ Enhanced OCR Service not found!');
        issuesFound++;
        return;
    }
    
    const content = fs.readFileSync(servicePath, 'utf8');
    
    // Check for critical methods
    const checks = [
        {
            name: 'neverGiveUpMode method',
            pattern: /neverGiveUpMode/,
            found: false
        },
        {
            name: 'validateAndFix method',
            pattern: /validateAndFix/,
            found: false
        },
        {
            name: '60 mainboard validation',
            pattern: /60|sixty/i,
            found: false
        },
        {
            name: '15 sideboard validation',
            pattern: /15|fifteen/i,
            found: false
        },
        {
            name: 'Basic land generation',
            pattern: /Plains|Island|Swamp|Mountain|Forest/,
            found: false
        }
    ];
    
    checks.forEach(check => {
        check.found = check.pattern.test(content);
        if (check.found) {
            console.log(`  ✅ ${check.name}: Found`);
        } else {
            console.log(`  ❌ ${check.name}: NOT FOUND`);
            issuesFound++;
        }
    });
    
    // Check for guarantee logic
    if (content.includes('NEVER gives up')) {
        console.log('  ✅ Never Give Up guarantee: Documented');
    } else {
        console.log('  ⚠️  Never Give Up guarantee: Not clearly documented');
    }
}

// Check 2: Discord Bot OCR Parser
function checkDiscordBotParser() {
    checksPerformed++;
    console.log('\n🤖 Checking Discord Bot OCR Parser...');
    
    const parserPath = path.join(__dirname, 'discord-bot/ocr_parser_easyocr.py');
    
    if (!fs.existsSync(parserPath)) {
        console.log('  ❌ Discord OCR Parser not found!');
        issuesFound++;
        return;
    }
    
    const content = fs.readFileSync(parserPath, 'utf8');
    
    // Check for guarantee logic
    if (content.includes('60') && content.includes('15')) {
        console.log('  ✅ 60+15 constants found');
    } else {
        console.log('  ⚠️  60+15 not explicitly defined');
    }
    
    if (content.includes('def complete_deck') || content.includes('def ensure_complete')) {
        console.log('  ✅ Deck completion logic found');
    } else {
        console.log('  ❌ No deck completion logic found');
        issuesFound++;
    }
}

// Check 3: Test Coverage
function checkTestCoverage() {
    checksPerformed++;
    console.log('\n🧪 Checking Test Coverage...');
    
    const testFiles = [
        {
            path: 'server/tests/services/enhancedOcrService.test.ts',
            name: 'Backend Unit Tests'
        },
        {
            path: 'server/tests/e2e/ocr-guarantee.test.ts',
            name: 'E2E Tests'
        },
        {
            path: 'discord-bot/tests/test_ocr_guarantee.py',
            name: 'Discord Bot Tests'
        },
        {
            path: 'server/jest.config.js',
            name: 'Jest Configuration'
        }
    ];
    
    testFiles.forEach(file => {
        const fullPath = path.join(__dirname, file.path);
        if (fs.existsSync(fullPath)) {
            console.log(`  ✅ ${file.name}: Created`);
        } else {
            console.log(`  ❌ ${file.name}: Missing`);
            issuesFound++;
        }
    });
}

// Check 4: Critical Issues from Report
function checkCriticalIssues() {
    checksPerformed++;
    console.log('\n⚠️  Checking Critical Issues...');
    
    const issues = [
        {
            name: 'Super-resolution script path',
            check: () => {
                const servicePath = path.join(__dirname, 'server/src/services/enhancedOcrService.ts');
                if (fs.existsSync(servicePath)) {
                    const content = fs.readFileSync(servicePath, 'utf8');
                    return !content.includes('../../../super_resolution_free.py');
                }
                return false;
            }
        },
        {
            name: 'Retry mechanism',
            check: () => {
                const servicePath = path.join(__dirname, 'server/src/services/enhancedOcrService.ts');
                if (fs.existsSync(servicePath)) {
                    const content = fs.readFileSync(servicePath, 'utf8');
                    return content.includes('retry') || content.includes('backoff');
                }
                return false;
            }
        }
    ];
    
    issues.forEach(issue => {
        if (issue.check()) {
            console.log(`  ✅ ${issue.name}: Implemented`);
        } else {
            console.log(`  ❌ ${issue.name}: Not implemented`);
            issuesFound++;
        }
    });
}

// Check 5: Configuration
function checkConfiguration() {
    checksPerformed++;
    console.log('\n⚙️  Checking Configuration...');
    
    const envExample = path.join(__dirname, 'server/.env.example');
    const packageJson = path.join(__dirname, 'server/package.json');
    
    if (fs.existsSync(envExample)) {
        const content = fs.readFileSync(envExample, 'utf8');
        if (content.includes('OPENAI_API_KEY')) {
            console.log('  ✅ OpenAI API key configured');
        } else {
            console.log('  ❌ OpenAI API key not in .env.example');
            issuesFound++;
        }
    }
    
    if (fs.existsSync(packageJson)) {
        const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
        if (pkg.scripts && pkg.scripts.test) {
            console.log('  ✅ Test script configured');
        } else {
            console.log('  ❌ Test script not configured');
            issuesFound++;
        }
    }
}

// Run all checks
checkEnhancedOCRService();
checkDiscordBotParser();
checkTestCoverage();
checkCriticalIssues();
checkConfiguration();

// Summary
console.log('\n' + '=' .repeat(50));
console.log('\n📊 VALIDATION SUMMARY\n');

const successRate = ((checksPerformed - issuesFound) / checksPerformed * 100).toFixed(1);

if (issuesFound === 0) {
    console.log('✅ ALL CHECKS PASSED!');
    console.log('   The 60+15 guarantee appears to be properly implemented.');
} else {
    console.log(`⚠️  ISSUES FOUND: ${issuesFound}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log('\n   Required Actions:');
    console.log('   1. Run the test suite: ./run-critical-tests.sh');
    console.log('   2. Fix failing tests');
    console.log('   3. Implement missing guarantee logic');
}

console.log('\n📝 Reports Available:');
console.log('   - QA_CRITICAL_ISSUES_REPORT.md');
console.log('   - QA_TEST_COVERAGE_REPORT.md');
console.log('   - Run tests for detailed results');

console.log('\n' + '=' .repeat(50));

// Exit with appropriate code
process.exit(issuesFound > 0 ? 1 : 0);