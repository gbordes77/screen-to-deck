# MTG Screen-to-Deck Testing Documentation

## Overview

This document describes the comprehensive testing strategy for the MTG Screen-to-Deck OCR system. Our testing approach ensures the **60+15 card guarantee** is maintained across all image types and processing scenarios.

## Test Philosophy

**NO MOCKS** - All integration tests use real API calls and real image processing to ensure production reliability.

## Test Structure

```
├── server/tests/
│   ├── integration/          # E2E integration tests
│   │   ├── ocr-e2e.test.ts  # Jest-based integration tests
│   │   ├── test-runner.ts   # Standalone test runner
│   │   └── reports/          # Test results and metrics
│   ├── e2e/                  # Existing E2E tests
│   └── services/             # Unit tests
│
├── discord-bot/tests/
│   ├── test_e2e_real.py     # Discord bot E2E tests
│   ├── test_ocr_guarantee.py # 60+15 guarantee tests
│   └── reports/              # Bot test results
│
└── validated_decklists/      # Real test images
```

## Running Tests

### Quick Start

```bash
# Run all E2E tests (web + Discord bot)
./run-e2e-tests.sh

# Run only web service tests
./run-e2e-tests.sh web

# Run only Discord bot tests
./run-e2e-tests.sh discord
```

### Web Service Tests

```bash
cd server

# Run integration tests with Jest
npm run test:integration

# Run standalone test runner (recommended)
npm run test:integration:runner

# Run all tests
npm run test:all
```

### Discord Bot Tests

```bash
cd discord-bot

# Run E2E tests
python tests/test_e2e_real.py

# Run specific test modules
python tests/test_ocr_guarantee.py
python tests/test_robust_ocr.py
```

## Test Coverage

### Image Types Tested

| Source | Count | Resolutions | Special Cases |
|--------|-------|-------------|---------------|
| MTGA | 2 | 1334x886 - 1920x1080 | Special layouts |
| MTGO | 2 | 1254x432 - 1763x791 | Low height variants |
| MTGGoldfish | 2 | 1239x1362 - 1383x1518 | Website exports |
| Paper Cards | 2 | 2048x1542 - 2336x1098 | Partially hidden |
| Websites | 1 | 2300x2210 | Large screenshots |

### Scenarios Tested

1. **Complete Flow**
   - Upload → OCR → Validation → Export
   - All export formats (MTGA, Moxfield, Archidekt, TappedOut, JSON)

2. **60+15 Guarantee**
   - Mainboard: Exactly 60 cards
   - Sideboard: Exactly 15 cards
   - Padding/trimming as needed

3. **Edge Cases**
   - Empty images → Emergency deck
   - Partial decks → Padded with lands
   - Oversized decks → Trimmed to 75
   - Low quality images → Best effort OCR

4. **Performance**
   - Processing time < 5 seconds
   - Memory usage < 100MB
   - Concurrent request handling
   - No memory leaks

5. **Reliability**
   - Consistent results across runs
   - API error handling
   - Network timeout resilience

## Metrics Captured

### Per-Test Metrics

- **Success Rate**: Pass/fail status
- **Processing Time**: End-to-end duration (ms)
- **Memory Usage**: Heap memory consumed (MB)
- **OCR Accuracy**: % of correctly identified cards
- **Card Counts**: Main/side/total
- **Export Success**: Format availability
- **API Calls**: Request count

### Aggregate Metrics

- **Category Performance**: Success rate by image type
- **Average Times**: Processing speed benchmarks
- **Accuracy Trends**: OCR quality over time
- **Memory Patterns**: Leak detection

## Quality Gates

All tests must pass these criteria:

| Metric | Requirement | Severity |
|--------|-------------|----------|
| 60+15 Guarantee | 100% compliance | Critical |
| Success Rate | ≥ 100% | Critical |
| OCR Accuracy | ≥ 90% average | Major |
| Processing Time | < 5s average | Minor |
| Memory Usage | < 100MB average | Minor |
| Export Formats | All functional | Major |

## Test Reports

### JSON Report Structure

```json
{
  "summary": {
    "totalTests": 9,
    "successfulTests": 9,
    "successRate": 100.0,
    "avgProcessingTime": 3500,
    "avgMemoryUsage": 25.5,
    "avgOcrAccuracy": 95.2,
    "all60_15": true,
    "timestamp": "2024-01-10T10:30:00Z"
  },
  "byCategory": {
    "MTGA": { ... },
    "MTGO": { ... }
  },
  "results": [
    {
      "file": "MTGA deck list 4_1920x1080.jpeg",
      "success": true,
      "duration": 3200,
      "mainboard": 60,
      "sideboard": 15,
      "accuracy": 96.5
    }
  ]
}
```

### Report Locations

- **Web Service**: `server/tests/integration/reports/`
- **Discord Bot**: `discord-bot/tests/reports/`
- **Comparisons**: `discord-bot/tests/reports/comparison_*.json`

## CI/CD Integration

### GitHub Actions

The `.github/workflows/e2e-tests.yml` workflow:

1. Runs on push, PR, and daily schedule
2. Tests both web service and Discord bot
3. Generates comparison reports
4. Enforces quality gates
5. Creates issues on failure

### Required Secrets

```yaml
OPENAI_API_KEY: Your OpenAI API key for OCR
```

## Performance Benchmarks

### Expected Performance

| Metric | Excellent | Good | Acceptable | Poor |
|--------|-----------|------|------------|------|
| Time | < 2s | 2-3s | 3-5s | > 5s |
| Accuracy | > 95% | 90-95% | 85-90% | < 85% |
| Memory | < 20MB | 20-50MB | 50-100MB | > 100MB |

### Service Comparison

| Aspect | Web Service (OpenAI) | Discord Bot (EasyOCR) |
|--------|---------------------|----------------------|
| Speed | Faster (API-based) | Slower (local model) |
| Accuracy | Higher (GPT-4V) | Good (specialized) |
| Cost | Per-request | Free (local) |
| Dependencies | API key | GPU recommended |

## Troubleshooting

### Common Issues

1. **OCR Timeout**
   ```bash
   # Increase timeout in test config
   jest --testTimeout=600000
   ```

2. **Memory Issues**
   ```bash
   # Run with increased heap
   NODE_OPTIONS="--max-old-space-size=4096" npm test
   ```

3. **API Rate Limits**
   ```bash
   # Add delays between tests
   RATE_LIMIT_DELAY=2000 npm test
   ```

4. **Image Not Found**
   ```bash
   # Verify image directory
   ls -la validated_decklists/
   ```

## Development Workflow

### Adding New Tests

1. **Add test image** to `/validated_decklists`
2. **Update test configuration** in test files
3. **Document expected results** in this file
4. **Run full test suite** to verify
5. **Update CI/CD** if needed

### Debugging Tests

```bash
# Run with debug output
DEBUG=* npm run test:integration:runner

# Run specific test
jest -t "MTGA deck list 4"

# Profile memory usage
node --expose-gc --inspect tests/integration/test-runner.ts
```

## Best Practices

1. **Always test with real images** - No synthetic test data
2. **Verify 60+15 on every test** - Core guarantee
3. **Capture all metrics** - Performance tracking
4. **Save all reports** - Historical analysis
5. **Compare services** - Consistency checks
6. **Document failures** - Improvement tracking

## Future Improvements

- [ ] Visual regression testing
- [ ] Load testing with 100+ concurrent requests
- [ ] Multi-language card testing
- [ ] Mobile screenshot testing
- [ ] Video frame extraction testing
- [ ] Batch processing optimization
- [ ] A/B testing framework
- [ ] Automated performance regression detection

## Contact

For questions about testing:
- Review test files in `/server/tests` and `/discord-bot/tests`
- Check CI/CD logs in GitHub Actions
- Review test reports in respective `reports/` directories