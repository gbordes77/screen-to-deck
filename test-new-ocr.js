#!/usr/bin/env node

// Test script for the new OCR service that doesn't invent cards
const path = require('path');
const fs = require('fs');

// Import the service (with TypeScript transpilation)
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs'
  }
});

async function testOCR() {
  console.log('🧪 Testing new OCR service (NO FAKE CARDS)...\n');
  
  // Load the service
  const { default: ocrService } = require('./server/src/services/enhancedOcrServiceGuaranteed');
  
  // Test image path (you can change this)
  const testImage = process.argv[2] || path.join(__dirname, 'uploads/test-mono-green.png');
  
  if (!fs.existsSync(testImage)) {
    console.error(`❌ Image not found: ${testImage}`);
    console.log('Usage: node test-new-ocr.js <path-to-image>');
    process.exit(1);
  }
  
  console.log(`📸 Testing with image: ${testImage}\n`);
  
  // Test 1: Normal mode (with retries)
  console.log('═══════════════════════════════════════════');
  console.log('TEST 1: NORMAL MODE (with retries)');
  console.log('═══════════════════════════════════════════\n');
  
  const result1 = await ocrService.processImage(testImage, false);
  
  console.log('Result:');
  console.log(`- Success: ${result1.success}`);
  console.log(`- Cards found: ${result1.cards.length}`);
  console.log(`- Confidence: ${(result1.confidence * 100).toFixed(1)}%`);
  console.log(`- Processing time: ${result1.processing_time}ms`);
  
  const counts1 = calculateCounts(result1.cards);
  console.log(`\n📊 Card counts:`);
  console.log(`- Mainboard: ${counts1.mainboard} / 60`);
  console.log(`- Sideboard: ${counts1.sideboard} / 15`);
  console.log(`- Total: ${counts1.total} / 75`);
  
  if (result1.warnings && result1.warnings.length > 0) {
    console.log(`\n⚠️ Warnings:`);
    result1.warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  if (result1.errors && result1.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    result1.errors.forEach(e => console.log(`  - ${e}`));
  }
  
  // Show first few cards
  console.log(`\n📋 First few cards found:`);
  const mainboardCards = result1.cards.filter(c => c.section === 'mainboard').slice(0, 5);
  mainboardCards.forEach(card => {
    console.log(`  - ${card.quantity}x ${card.name}`);
  });
  
  // Test 2: Strict mode (no retries)
  console.log('\n═══════════════════════════════════════════');
  console.log('TEST 2: STRICT MODE (no retries)');
  console.log('═══════════════════════════════════════════\n');
  
  const result2 = await ocrService.processImage(testImage, true);
  
  console.log('Result:');
  console.log(`- Success: ${result2.success}`);
  console.log(`- Cards found: ${result2.cards.length}`);
  console.log(`- Confidence: ${(result2.confidence * 100).toFixed(1)}%`);
  console.log(`- Processing time: ${result2.processing_time}ms`);
  
  const counts2 = calculateCounts(result2.cards);
  console.log(`\n📊 Card counts:`);
  console.log(`- Mainboard: ${counts2.mainboard} / 60`);
  console.log(`- Sideboard: ${counts2.sideboard} / 15`);
  console.log(`- Total: ${counts2.total} / 75`);
  
  // Compare results
  console.log('\n═══════════════════════════════════════════');
  console.log('COMPARISON');
  console.log('═══════════════════════════════════════════\n');
  
  console.log(`Mode           | Cards | Mainboard | Sideboard | Confidence`);
  console.log(`---------------|-------|-----------|-----------|------------`);
  console.log(`Normal (retry) | ${String(result1.cards.length).padEnd(5)} | ${String(counts1.mainboard).padEnd(9)} | ${String(counts1.sideboard).padEnd(9)} | ${(result1.confidence * 100).toFixed(1)}%`);
  console.log(`Strict (once)  | ${String(result2.cards.length).padEnd(5)} | ${String(counts2.mainboard).padEnd(9)} | ${String(counts2.sideboard).padEnd(9)} | ${(result2.confidence * 100).toFixed(1)}%`);
  
  // Check for invented cards
  console.log('\n🔍 Checking for invented cards...');
  const hasInventedCards = checkForInventedCards(result1.cards);
  if (hasInventedCards) {
    console.log('❌ FAIL: Service is still inventing cards!');
  } else {
    console.log('✅ PASS: No invented cards detected');
  }
  
  console.log('\n✨ Test complete!');
}

function calculateCounts(cards) {
  const mainboard = cards
    .filter(c => c.section !== 'sideboard')
    .reduce((sum, c) => sum + c.quantity, 0);
  
  const sideboard = cards
    .filter(c => c.section === 'sideboard')
    .reduce((sum, c) => sum + c.quantity, 0);
  
  return { mainboard, sideboard, total: mainboard + sideboard };
}

function checkForInventedCards(cards) {
  // Check for suspicious patterns that indicate invented cards
  const suspiciousPatterns = [
    // All Mountains (the old bug)
    cards.filter(c => c.name === 'Mountain').reduce((sum, c) => sum + c.quantity, 0) === 60,
    // Generic red sideboard cards that were always added
    cards.some(c => c.name === 'Abrade' && c.section === 'sideboard' && c.quantity === 3),
    cards.some(c => c.name === 'Roiling Vortex' && c.section === 'sideboard'),
    // Check if we have exactly 60+15 (suspicious if image doesn't contain that many)
    calculateCounts(cards).mainboard === 60 && calculateCounts(cards).sideboard === 15
  ];
  
  return suspiciousPatterns.some(p => p);
}

// Run the test
testOCR().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});