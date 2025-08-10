#!/usr/bin/env node

/**
 * Manual test script for Enhanced OCR Service
 * Usage: node test-enhanced-ocr.js [image-path]
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Import the service (use the compiled JS version)
const enhancedOcrService = require('./dist/services/enhancedOcrServiceGuaranteed').default;

async function createTestImage(outputPath) {
  console.log('📸 Creating test image with MTG-like content...');
  
  // Create a more realistic test image
  const width = 1920;
  const height = 1080;
  
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 45, g: 45, b: 55 } // Dark background like Arena
    }
  })
  .composite([
    {
      input: Buffer.from(`
        <svg width="${width}" height="${height}">
          <rect width="${width}" height="${height}" fill="#2d2d37"/>
          <text x="50" y="50" font-family="Arial" font-size="24" fill="white">MTG Arena Deck</text>
          <text x="50" y="100" font-family="Arial" font-size="18" fill="#ccc">Creatures (20)</text>
          <text x="50" y="130" font-family="Arial" font-size="16" fill="white">4x Monastery Swiftspear</text>
          <text x="50" y="155" font-family="Arial" font-size="16" fill="white">4x Phoenix Chick</text>
          <text x="50" y="180" font-family="Arial" font-size="16" fill="white">4x Kumano Faces Kakkazan</text>
          <text x="50" y="205" font-family="Arial" font-size="16" fill="white">4x Feldon, Ronom Excavator</text>
          <text x="50" y="230" font-family="Arial" font-size="16" fill="white">4x Squee, Dubious Monarch</text>
          
          <text x="50" y="280" font-family="Arial" font-size="18" fill="#ccc">Spells (20)</text>
          <text x="50" y="310" font-family="Arial" font-size="16" fill="white">4x Lightning Strike</text>
          <text x="50" y="335" font-family="Arial" font-size="16" fill="white">4x Play with Fire</text>
          <text x="50" y="360" font-family="Arial" font-size="16" fill="white">3x Obliterating Bolt</text>
          <text x="50" y="385" font-family="Arial" font-size="16" fill="white">3x Nahiri's Warcrafting</text>
          <text x="50" y="410" font-family="Arial" font-size="16" fill="white">3x Witchstalker Frenzy</text>
          <text x="50" y="435" font-family="Arial" font-size="16" fill="white">3x Urabrask's Forge</text>
          
          <text x="50" y="485" font-family="Arial" font-size="18" fill="#ccc">Lands (20)</text>
          <text x="50" y="515" font-family="Arial" font-size="16" fill="white">20x Mountain</text>
          
          <text x="600" y="100" font-family="Arial" font-size="18" fill="#ccc">Sideboard (15)</text>
          <text x="600" y="130" font-family="Arial" font-size="16" fill="white">3x Abrade</text>
          <text x="600" y="155" font-family="Arial" font-size="16" fill="white">2x Lithomantic Barrage</text>
          <text x="600" y="180" font-family="Arial" font-size="16" fill="white">2x Roiling Vortex</text>
          <text x="600" y="205" font-family="Arial" font-size="16" fill="white">2x Urabrask</text>
          <text x="600" y="230" font-family="Arial" font-size="16" fill="white">2x Chandra, Dressed to Kill</text>
          <text x="600" y="255" font-family="Arial" font-size="16" fill="white">2x Jaya, Fiery Negotiator</text>
          <text x="600" y="280" font-family="Arial" font-size="16" fill="white">2x Obliterating Bolt</text>
        </svg>
      `),
      top: 0,
      left: 0
    }
  ])
  .png()
  .toFile(outputPath);
  
  console.log(`✅ Test image created: ${outputPath}`);
}

async function testOCR(imagePath) {
  console.log('\n🧪 Testing Enhanced OCR Service with 60+15 Guarantee\n');
  console.log('=' . repeat(60));
  
  // Check if image exists
  if (!fs.existsSync(imagePath)) {
    console.log(`⚠️ Image not found: ${imagePath}`);
    console.log('Creating a test image...');
    await createTestImage(imagePath);
  }
  
  // Get image info
  const stats = fs.statSync(imagePath);
  const metadata = await sharp(imagePath).metadata();
  
  console.log(`\n📊 Image Information:`);
  console.log(`  Path: ${imagePath}`);
  console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`  Dimensions: ${metadata.width}x${metadata.height}`);
  console.log(`  Format: ${metadata.format}`);
  
  console.log('\n🔄 Processing image...\n');
  
  // Process with OCR service
  const startTime = Date.now();
  const result = await enhancedOcrService.processImage(imagePath);
  const elapsed = Date.now() - startTime;
  
  // Display results
  console.log('=' . repeat(60));
  console.log('\n📋 OCR Results:\n');
  
  console.log(`✅ Success: ${result.success}`);
  console.log(`🎯 Guaranteed 60+15: ${result.guaranteed}`);
  console.log(`⏱️ Processing Time: ${elapsed}ms`);
  console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`🎮 Format: ${result.format || 'unknown'}`);
  
  // Count cards
  const mainboardCards = result.cards.filter(c => c.section !== 'sideboard');
  const sideboardCards = result.cards.filter(c => c.section === 'sideboard');
  const mainboardCount = mainboardCards.reduce((sum, c) => sum + c.quantity, 0);
  const sideboardCount = sideboardCards.reduce((sum, c) => sum + c.quantity, 0);
  
  console.log(`\n📦 Card Counts:`);
  console.log(`  Mainboard: ${mainboardCount} cards (${mainboardCount === 60 ? '✅' : '❌'} Expected: 60)`);
  console.log(`  Sideboard: ${sideboardCount} cards (${sideboardCount === 15 ? '✅' : '❌'} Expected: 15)`);
  console.log(`  Total: ${mainboardCount + sideboardCount} cards`);
  console.log(`  Unique Cards: ${new Set(result.cards.map(c => c.name)).size}`);
  
  // Display mainboard
  console.log('\n🎴 MAINBOARD (60 cards):');
  console.log('-'.repeat(40));
  const mainboardByName = {};
  mainboardCards.forEach(card => {
    mainboardByName[card.name] = (mainboardByName[card.name] || 0) + card.quantity;
  });
  Object.entries(mainboardByName).forEach(([name, qty]) => {
    console.log(`  ${qty}x ${name}`);
  });
  
  // Display sideboard
  console.log('\n🎴 SIDEBOARD (15 cards):');
  console.log('-'.repeat(40));
  const sideboardByName = {};
  sideboardCards.forEach(card => {
    sideboardByName[card.name] = (sideboardByName[card.name] || 0) + card.quantity;
  });
  Object.entries(sideboardByName).forEach(([name, qty]) => {
    console.log(`  ${qty}x ${name}`);
  });
  
  // Display warnings/errors
  if (result.warnings && result.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    result.warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  if (result.errors && result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(e => console.log(`  - ${e}`));
  }
  
  // Validation summary
  console.log('\n' + '=' . repeat(60));
  console.log('\n✅ VALIDATION SUMMARY:\n');
  
  const checks = [
    { 
      name: '60 Mainboard Cards', 
      pass: mainboardCount === 60 
    },
    { 
      name: '15 Sideboard Cards', 
      pass: sideboardCount === 15 
    },
    { 
      name: 'Total 75 Cards', 
      pass: mainboardCount + sideboardCount === 75 
    },
    { 
      name: 'Guaranteed Flag Set', 
      pass: result.guaranteed === true 
    },
    { 
      name: 'Success Flag Set', 
      pass: result.success === true 
    },
    { 
      name: 'All Cards Have Names', 
      pass: result.cards.every(c => c.name && c.name.length > 0) 
    },
    { 
      name: 'All Cards Have Valid Quantities', 
      pass: result.cards.every(c => c.quantity > 0 && c.quantity <= 100) 
    },
    { 
      name: 'All Cards Have Sections', 
      pass: result.cards.every(c => c.section === 'mainboard' || c.section === 'sideboard') 
    }
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    const status = check.pass ? '✅' : '❌';
    console.log(`  ${status} ${check.name}`);
    if (!check.pass) allPassed = false;
  });
  
  console.log('\n' + '=' . repeat(60));
  if (allPassed) {
    console.log('\n🎉 ALL CHECKS PASSED! The service guarantees 60+15 cards.\n');
  } else {
    console.log('\n⚠️ Some checks failed. Please review the implementation.\n');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const imagePath = args[0] || path.join(__dirname, 'test-mtg-deck.png');
  
  try {
    await testOCR(imagePath);
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}