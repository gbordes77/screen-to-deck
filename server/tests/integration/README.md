# E2E Integration Tests

## Overview

This directory contains comprehensive end-to-end integration tests for the MTG Screen-to-Deck OCR system. These tests use **NO MOCKS** and test the complete flow with real images and real API calls.

## Test Coverage

The test suite validates:
- ✅ Complete OCR pipeline (Upload → OCR → Validation → Export)
- ✅ 60+15 card guarantee (60 mainboard + 15 sideboard)
- ✅ Multiple image sources (MTGA, MTGO, MTGGoldfish, Paper cards, Websites)
- ✅ All export formats (MTGA, Moxfield, Archidekt, TappedOut, JSON)
- ✅ Performance metrics and memory usage
- ✅ API reliability and concurrent load handling

## Prerequisites

1. **OpenAI API Key**: Required for OCR processing
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

2. **Test Images**: Located in `/validated_decklists` directory
   - 9 representative images from different sources
   - Various resolutions and qualities

3. **Dependencies**: Install all required packages
   ```bash
   cd server
   npm install
   ```

## Running Tests

### Option 1: Jest Integration Tests
Run the full integration test suite using Jest:
```bash
npm run test:integration
```

This runs `ocr-e2e.test.ts` with a 5-minute timeout per test.

### Option 2: Standalone Test Runner
Run tests without Jest using the standalone runner:
```bash
npm run test:integration:runner
```

This provides:
- Colored terminal output
- Real-time progress updates
- Detailed performance metrics
- JSON and CSV reports

### Option 3: Run Specific Test Files
```bash
# Run only the E2E tests
npx jest tests/integration/ocr-e2e.test.ts

# Run with specific timeout
npx jest tests/integration/ocr-e2e.test.ts --testTimeout=600000
```

## Test Images

The test suite uses carefully selected images from `/validated_decklists`:

| Category | Files | Description |
|----------|-------|-------------|
| **MTGA** | 2 images | Arena screenshots at different resolutions |
| **MTGO** | 2 images | MTGO client exports, including low-height variants |
| **MTGGoldfish** | 2 images | Website decklists at various resolutions |
| **Paper** | 2 images | Physical card photos, including partially hidden |
| **Website** | 1 image | Large website screenshot |

## Metrics Captured

Each test captures:
- **Success Rate**: Pass/fail status
- **Processing Time**: End-to-end duration in milliseconds
- **Memory Usage**: Heap memory consumed during processing
- **OCR Accuracy**: Percentage of correctly identified cards
- **Card Counts**: Mainboard, sideboard, and total
- **Export Success**: Which formats successfully exported
- **API Calls**: Number of API requests made

## Reports

Test results are saved to:
- **JSON Report**: `tests/integration/reports/report-{timestamp}.json`
- **CSV Report**: `tests/integration/reports/report-{timestamp}.csv`

### Report Contents

```json
{
  "summary": {
    "totalTests": 9,
    "successfulTests": 9,
    "successRate": 100.0,
    "avgProcessingTime": 3500,
    "avgMemoryUsage": 25.5,
    "avgOcrAccuracy": 95.2,
    "all60_15": true
  },
  "byCategory": {...},
  "results": [...]
}
```

## Expected Results

### Success Criteria
- ✅ 100% of tests maintain 60+15 guarantee
- ✅ Average OCR accuracy > 90%
- ✅ Average processing time < 5 seconds
- ✅ All export formats functional
- ✅ No memory leaks detected

### Performance Benchmarks
- **Fast**: < 2 seconds
- **Normal**: 2-5 seconds
- **Slow**: 5-10 seconds
- **Timeout**: > 10 seconds

## Discord Bot Comparison

Run the Discord bot E2E tests to compare performance:

```bash
cd discord-bot/tests
python test_e2e_real.py
```

This will:
1. Test the same images using EasyOCR
2. Generate a comparison report
3. Identify performance differences

## Troubleshooting

### Common Issues

1. **Server not starting**
   - Ensure port 3001 is available
   - Check environment variables are set
   - Verify Node.js version >= 18

2. **OCR timeouts**
   - Check OpenAI API key is valid
   - Verify network connectivity
   - Increase timeout in test configuration

3. **Image not found**
   - Ensure `/validated_decklists` directory exists
   - Check file permissions
   - Verify image paths are correct

4. **Memory issues**
   - Monitor system memory during tests
   - Run tests individually if needed
   - Check for memory leaks in results

## CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Run E2E Tests
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: |
    cd server
    npm install
    npm run test:integration:runner
    
- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: server/tests/integration/reports/
```

## Development Tips

1. **Run single category**: Modify test to filter by category
2. **Debug mode**: Add `console.log` statements in test flow
3. **Performance profiling**: Use `--inspect` flag with Node.js
4. **Memory profiling**: Use `--expose-gc` to force garbage collection

## Contributing

When adding new test cases:
1. Add test images to `/validated_decklists`
2. Update `TEST_IMAGE_SETS` configuration
3. Document expected results
4. Run full test suite to verify