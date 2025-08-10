# MTG OCR Real Image Test Suite

## Overview

Comprehensive test suite for validating the 60+15 card guarantee using real MTG images. This suite tests both the web service and Discord bot with identical images to ensure consistent results.

## Test Images

The suite includes 6 realistic test scenarios:

1. **arena-standard.png** - Standard Arena deck screenshot (1920x1080)
2. **mtgo-modern.png** - Modern MTGO deck export (1280x720)
3. **low-quality.jpg** - Blurry/low quality image to test OCR robustness
4. **partial-deck.png** - Incomplete deck to test padding logic
5. **oversized-deck.png** - 80+20 cards to test trimming logic
6. **empty-image.png** - Empty image to test emergency fallback

## Quick Start

### Run All Tests
```bash
# Comprehensive validation (recommended)
./validate-production.js

# Quick test runner
./run-real-tests.sh

# Generate HTML report
./generate-test-report.js
```

### Run Specific Tests

#### Web Service Tests
```bash
cd server
npm run test:e2e  # Generate images + run tests
npm run test:real  # Run tests only
```

#### Discord Bot Tests
```bash
cd discord-bot
python -m pytest tests/test_real_images.py -v
```

### Generate Test Images Only
```bash
cd server/tests/test-images
node create-mtg-test-images.js
```

## Test Coverage

### Critical Scenarios Tested

- ✅ **Standard decks** - Verify exact 60+15 output
- ✅ **Low quality images** - Ensure OCR handles blur/noise
- ✅ **Partial decks** - Validate padding to 60+15
- ✅ **Oversized decks** - Confirm trimming to 60+15
- ✅ **Empty images** - Test emergency fallback deck
- ✅ **Service synchronization** - Compare web vs Discord results
- ✅ **Performance** - All images process in <5 seconds
- ✅ **Memory usage** - No memory leaks after multiple runs
- ✅ **Consistency** - Same image returns same results

## Success Metrics

All tests validate these requirements:

1. **100% Guarantee**: Every image returns exactly 60 mainboard + 15 sideboard
2. **Synchronization**: Web service and Discord bot return identical results
3. **Performance**: Average processing time <5 seconds per image
4. **Reliability**: No crashes on invalid/corrupted images
5. **Recognition Rate**: >80% card recognition on real images

## Test Output

### Console Output
- Real-time test progress
- Individual test results
- Performance metrics
- Success/failure summary

### Generated Reports
- **validation-report.json** - Detailed JSON results
- **test-report.html** - Beautiful HTML dashboard
- **test-report.json** - Test data in JSON format

## File Structure

```
/server/tests/
├── test-images/
│   ├── create-mtg-test-images.js    # Image generator
│   ├── arena-standard.png           # Test image 1
│   ├── mtgo-modern.png             # Test image 2
│   ├── low-quality.jpg             # Test image 3
│   ├── partial-deck.png            # Test image 4
│   ├── oversized-deck.png          # Test image 5
│   ├── empty-image.png             # Test image 6
│   └── test-images-metadata.json   # Image metadata
├── e2e/
│   ├── real-images.test.ts         # Web service tests
│   └── ocr-guarantee.test.ts       # Original tests
└── setup.ts                         # Jest setup

/discord-bot/tests/
├── test_real_images.py              # Discord bot tests
├── test_ocr_guarantee.py            # Guarantee tests
└── test_parser.py                   # Parser tests

/project-root/
├── validate-production.js           # Main validation script
├── run-real-tests.sh               # Quick test runner
├── generate-test-report.js         # HTML report generator
└── TEST-SUITE-README.md            # This file
```

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run OCR Tests
  run: |
    npm install
    ./validate-production.js
```

## Troubleshooting

### Test Images Not Found
```bash
cd server/tests/test-images
node create-mtg-test-images.js
```

### Python Dependencies Missing
```bash
cd discord-bot
pip install -r requirements.txt
```

### OpenAI API Key Not Set
```bash
export OPENAI_API_KEY="your-key-here"
```

### Permission Denied
```bash
chmod +x validate-production.js
chmod +x run-real-tests.sh
chmod +x generate-test-report.js
```

## Test Development

### Adding New Test Images

1. Edit `server/tests/test-images/create-mtg-test-images.js`
2. Add new deck configuration to `TEST_DECKS`
3. Create image generation call in `generateAllTestImages()`
4. Update metadata in `test-images-metadata.json`

### Adding New Test Cases

1. Web service: Edit `server/tests/e2e/real-images.test.ts`
2. Discord bot: Edit `discord-bot/tests/test_real_images.py`
3. Add assertions for new scenarios

## Success Criteria

The test suite passes when:

- ✅ All 6 test images return exactly 60+15 cards
- ✅ Web service and Discord bot results match
- ✅ Average processing time <5 seconds
- ✅ No memory leaks detected
- ✅ 100% success rate achieved

## Notes

- Tests use realistic MTG card names and formats
- Images simulate real-world conditions (blur, partial visibility, etc.)
- Both services must pass for production deployment
- Report generation provides visual confirmation of results