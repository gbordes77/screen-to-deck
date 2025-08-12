# Zone Detection Patterns Documentation

## Overview

This document describes the visual patterns and detection strategies for identifying different zones in MTG Arena (MTGA) and MTG Online (MTGO) interfaces. These patterns are crucial for accurate OCR extraction of deck lists from screenshots.

## Table of Contents

1. [Platform Detection](#platform-detection)
2. [MTGA Detection Patterns](#mtga-detection-patterns)
3. [MTGO Detection Patterns](#mtgo-detection-patterns)
4. [Resolution Adaptation](#resolution-adaptation)
5. [Implementation Guidelines](#implementation-guidelines)
6. [Troubleshooting](#troubleshooting)

---

## Platform Detection

### Automatic Platform Recognition

The system automatically detects the platform based on visual characteristics:

#### Brightness Analysis
- **MTGA**: Dark backgrounds (avg brightness < 200)
  - Gradient backgrounds (#2c1810 to #1a0f08)
  - Dark theme with glowing elements
  
- **MTGO**: Light backgrounds (avg brightness > 200)
  - Solid or subtle gradient (#f5f5f5)
  - Classic Windows application appearance

#### Layout Patterns
- **MTGA**: Grid-based card layout
- **MTGO**: Text list with columns

#### Color Distribution
- **MTGA**: Rich colors, card artwork visible
- **MTGO**: Monochromatic, text-focused

---

## MTGA Detection Patterns

### Visual Characteristics

#### 1. Card Grid Layout
```
Main Deck Area (60 cards max):
┌─────────────────────────────┐
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │ <- Row 1 (7 cards)
│ └──┘ └──┘ └──┘ └──┘ └──┘  │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │ <- Row 2 (7 cards)
│ └──┘ └──┘ └──┘ └──┘ └──┘  │
│ ...                         │
└─────────────────────────────┘

Sideboard (15 cards max):
┌───┐
│┌─┐│ <- Single column
│└─┘│
│┌─┐│
│└─┘│
│...│
└───┘
```

#### 2. Card Recognition Features
- **Rounded corners** (border-radius: 8-12px)
- **Drop shadows** for depth
- **Quantity badges** (bottom-right corner)
- **Hover glow effect** (when applicable)
- **Overlapping cards** (~30% overlap vertically)

#### 3. Zone Coordinates (Relative)

| Zone | X | Y | Width | Height |
|------|---|---|-------|--------|
| Main Deck | 15% | 20% | 65% | 55% |
| Sideboard | 82% | 20% | 15% | 55% |
| Deck Name | 15% | 10% | 65% | 8% |
| Card Preview | 82% | 78% | 15% | 20% |

#### 4. Color Patterns
- Background gradient: Vertical, dark brown tones
- Card frames: Varies by card color (W/U/B/R/G/Colorless/Multi)
- Text: White (#FFFFFF) on dark backgrounds
- Quantity badges: Black background with white text

### Detection Algorithm for MTGA

```typescript
// Pseudo-code for MTGA detection
function detectMTGAZones(image) {
  // 1. Identify main deck grid
  const mainGrid = findGridPattern(image, {
    rows: 10,
    cols: 7,
    cardShape: 'rounded_rectangle'
  });
  
  // 2. Identify sideboard column
  const sideboardColumn = findVerticalList(image, {
    maxItems: 15,
    position: 'right',
    width: '15%'
  });
  
  // 3. Extract individual cards
  for (each card in grid) {
    extractCardName(card);
    extractQuantity(card.bottomRight);
  }
}
```

---

## MTGO Detection Patterns

### Visual Characteristics

#### 1. Text List Layout
```
┌─────────────────┬─────────────────┐
│     Deck        │   Sideboard     │
├─────────────────┼─────────────────┤
│ 4 Lightning Bolt│ 2 Tormod's Crypt│
│ 4 Path to Exile │ 3 Rest in Peace │
│ 2 Snapcaster    │ 2 Surgical Ext. │
│ ...             │ ...             │
└─────────────────┴─────────────────┘
```

#### 2. Text Recognition Features
- **Fixed-width font** (typically Arial or similar)
- **Column format**: [Quantity] [Card Name] [Set] [Collector #]
- **Alternating row colors** (#FFFFFF / #F9F9F9)
- **Header sections** with bold text ("Deck", "Sideboard")
- **Line height**: ~2.2% of image height

#### 3. Zone Coordinates (Relative)

| Zone | X | Y | Width | Height |
|------|---|---|-------|--------|
| Main List | 5% | 25% | 43% | 65% |
| Sideboard List | 52% | 25% | 43% | 65% |
| Deck Header | 5% | 18% | 43% | 6% |
| Sideboard Header | 52% | 18% | 43% | 6% |

#### 4. Text Patterns
- Quantity: `^\d+$` (1-4 typically)
- Card name: `^[\w\s,'-]+$`
- Set code: `^[A-Z0-9]{3,4}$`
- Collector number: `^\d+[a-z]?$`

### Detection Algorithm for MTGO

```typescript
// Pseudo-code for MTGO detection
function detectMTGOZones(image) {
  // 1. Find header text
  const headers = findText(image, ['Deck', 'Sideboard']);
  
  // 2. Identify list columns
  const mainList = extractTextColumn(image, {
    below: headers[0],
    width: '43%'
  });
  
  const sideboardList = extractTextColumn(image, {
    below: headers[1],
    width: '43%'
  });
  
  // 3. Parse each line
  for (each line in lists) {
    const [quantity, ...nameParts] = line.split(' ');
    const cardName = nameParts.join(' ');
  }
}
```

---

## Resolution Adaptation

### Supported Resolutions

| Resolution | Name | Aspect Ratio | Notes |
|------------|------|--------------|-------|
| 3840x2160 | 4K | 16:9 | Highest detail |
| 2560x1440 | 2K/QHD | 16:9 | Common gaming |
| 1920x1080 | Full HD | 16:9 | Most common |
| 1280x720 | HD | 16:9 | Minimum supported |

### Scaling Strategies

#### Relative Positioning
All zones use percentage-based positioning to adapt to different resolutions:
- Coordinates are stored as decimals (0.0 to 1.0)
- Multiply by actual image dimensions for pixel values

#### Dynamic Font Size
Text detection adapts based on resolution:
- 4K: 16px base font
- 2K: 14px base font
- FHD: 12px base font
- HD: 11px base font

#### Border Radius Scaling
MTGA card corners scale with resolution:
- 4K: 12px radius
- 2K: 10px radius
- FHD: 8px radius
- HD: 6px radius

---

## Implementation Guidelines

### 1. Preprocessing Pipeline

```typescript
interface PreprocessingConfig {
  enhanceContrast: {
    enabled: true,
    alpha: 1.5,
    beta: 0
  },
  denoise: {
    enabled: true,
    h: 10
  },
  sharpen: {
    enabled: true,
    kernel: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0]
    ]
  }
}
```

### 2. Zone Extraction Process

1. **Load image** and detect metadata
2. **Identify platform** using brightness/layout analysis
3. **Determine resolution** from image dimensions
4. **Load configuration** for platform/resolution combo
5. **Extract zones** using configured coordinates
6. **Preprocess zones** based on platform needs
7. **Apply OCR** to each zone
8. **Validate results** against known patterns

### 3. Confidence Scoring

Calculate confidence based on:
- Number of zones successfully detected
- OCR confidence scores
- Pattern matching success rate
- Expected card count validation

```typescript
function calculateConfidence(results) {
  let score = 0.7; // Base confidence
  
  if (results.mainDeckCards >= 40) score += 0.1;
  if (results.mainDeckCards === 60) score += 0.1;
  if (results.sideboardCards === 15) score += 0.1;
  
  return Math.min(score, 1.0);
}
```

### 4. Error Handling

Common issues and solutions:

| Issue | Detection | Solution |
|-------|-----------|----------|
| Partial screenshot | Zone count < expected | Request full screenshot |
| Wrong resolution | Dimension mismatch | Find closest supported |
| Mixed platforms | Conflicting patterns | Prioritize text detection |
| Low quality | OCR confidence < 0.5 | Apply enhancement filters |

---

## Troubleshooting

### Common Detection Failures

#### MTGA Issues
1. **Animated backgrounds**: Can interfere with edge detection
   - Solution: Use multiple frames or request static screenshot
   
2. **Card animations**: Cards in motion blur OCR
   - Solution: Wait for animation completion
   
3. **Overlapping cards**: Hidden text in stacked views
   - Solution: Use partial text matching with Scryfall API

#### MTGO Issues
1. **Custom themes**: Non-standard colors affect detection
   - Solution: Convert to grayscale before processing
   
2. **Scrolled lists**: Partial deck visibility
   - Solution: Detect scroll indicators and request full view
   
3. **Font rendering**: ClearType can affect OCR
   - Solution: Apply anti-aliasing filters

### Debug Mode

Enable debug mode to save intermediate results:

```typescript
const detector = new ZoneDetectionService(debugMode: true);
// Saves extracted zones to /debug/zones/
```

### Validation Checklist

- [ ] Platform correctly identified
- [ ] Resolution properly detected
- [ ] All zones extracted
- [ ] Main deck has 40-100 cards
- [ ] Sideboard has 0-15 cards
- [ ] Card names validate against Scryfall
- [ ] Total cards match expected format

---

## API Usage

### Basic Usage

```typescript
import zoneDetectionService from './services/zoneDetectionService';

// Automatic detection
const result = await zoneDetectionService.extractZones(imageBuffer);

// Manual override
const result = await zoneDetectionService.extractZones(
  imageBuffer,
  'mtga',  // platform
  '1920x1080'  // resolution
);

// Generate debug overlay
const overlayImage = await zoneDetectionService.generateDebugOverlay(
  imageBuffer,
  'mtga',
  '1920x1080'
);
```

### Configuration Access

```typescript
import zoneConfig from './config/zoneDetectionConfig.json';

// Access platform-specific settings
const mtgaConfig = zoneConfig.platforms.mtga;
const mtgoConfig = zoneConfig.platforms.mtgo;

// Get resolution-specific zones
const zones = mtgaConfig.resolutions['1920x1080'].zones;
```

### Integration with OCR Service

```typescript
// Extract zones first
const detection = await zoneDetectionService.extractZones(imageBuffer);

// Process each zone with OCR
for (const zone of detection.zones.main) {
  const text = await ocrService.processZone(zone.buffer);
  // Parse and validate card names
}
```

---

## Visual Template Tool

Access the interactive visual template tool at:
- **Local**: `http://localhost:5173/zone-detection-templates.html`
- **Purpose**: Visualize and test zone detection configurations
- **Features**:
  - Platform switching (MTGA/MTGO)
  - Resolution selection
  - Grid overlay toggle
  - Configuration export
  - Real-time zone visualization

---

## Updates and Maintenance

### Adding New Resolutions

1. Update `zoneDetectionConfig.json` with new resolution entry
2. Test with sample screenshots
3. Adjust coordinates if needed
4. Update documentation

### Platform Updates

When MTGA or MTGO updates their UI:
1. Collect new screenshots
2. Analyze layout changes
3. Update zone coordinates
4. Test detection accuracy
5. Update visual patterns documentation

---

## Conclusion

This zone detection system provides robust, resolution-independent extraction of deck information from MTG screenshots. The modular design allows for easy updates when platforms change their UI, and the visual templates help developers understand and debug the detection process.