#!/usr/bin/env node

/**
 * Test direct de ocrService pour vérifier la détection mainboard/sideboard
 */

const path = require('path');

// Charger les variables d'environnement
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

// Charger ocrService après les variables d'environnement
const ocrService = require('./server/dist/services/ocrService').default;

async function testOCR() {
  const testImage = path.join(__dirname, 'test-images/day0-validation-set/MTGA deck list 4_1920x1080.jpeg');
  
  console.log('🧪 Testing OCR with:', testImage);
  console.log('⏳ Processing...\n');
  
  try {
    const result = await ocrService.processImage(testImage);
    
    console.log('✅ OCR Result:');
    console.log('================');
    console.log(`Success: ${result.success}`);
    console.log(`Processing time: ${result.processing_time}ms`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Format detected: ${result.format || 'unknown'}`);
    console.log(`Guaranteed 60+15: ${result.guaranteed ? '✅' : '❌'}`);
    
    // Afficher mainboard
    if (result.mainboard && result.mainboard.length > 0) {
      console.log(`\n📋 MAINBOARD (${result.mainboard.reduce((sum, c) => sum + c.quantity, 0)} cards):`);
      result.mainboard.forEach(card => {
        console.log(`  ${card.quantity}x ${card.name}`);
      });
    } else {
      console.log('\n❌ No mainboard detected');
    }
    
    // Afficher sideboard
    if (result.sideboard && result.sideboard.length > 0) {
      console.log(`\n📋 SIDEBOARD (${result.sideboard.reduce((sum, c) => sum + c.quantity, 0)} cards):`);
      result.sideboard.forEach(card => {
        console.log(`  ${card.quantity}x ${card.name}`);
      });
    } else {
      console.log('\n❌ No sideboard detected');
    }
    
    // Afficher les warnings
    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    // Résumé
    const totalMain = result.mainboard ? result.mainboard.reduce((sum, c) => sum + c.quantity, 0) : 0;
    const totalSide = result.sideboard ? result.sideboard.reduce((sum, c) => sum + c.quantity, 0) : 0;
    console.log('\n📊 Summary:');
    console.log(`  Total cards: ${totalMain + totalSide}`);
    console.log(`  Mainboard: ${totalMain}/60`);
    console.log(`  Sideboard: ${totalSide}/15`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

// Lancer le test
testOCR();