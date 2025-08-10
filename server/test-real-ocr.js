#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Import the service
const { EnhancedOCRServiceGuaranteed } = require('./dist/services/enhancedOcrServiceGuaranteed');

async function testRealImage() {
  console.log('🚀 Starting real image OCR test...');
  console.log('API Key:', process.env.OPENAI_API_KEY ? 'Set (' + process.env.OPENAI_API_KEY.slice(0, 10) + '...)' : 'Not set');
  
  const imagePath = path.resolve(__dirname, '../uploads/mtg-1754815720547-204414186.png');
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Image not found:', imagePath);
    process.exit(1);
  }
  
  console.log('📁 Testing with image:', imagePath);
  
  const service = new EnhancedOCRServiceGuaranteed();
  
  try {
    console.log('🔄 Processing image...');
    const startTime = Date.now();
    
    // Add timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out after 30 seconds')), 30000);
    });
    
    const result = await Promise.race([
      service.processImage(imagePath),
      timeoutPromise
    ]);
    
    const elapsed = Date.now() - startTime;
    
    console.log('✅ Processing completed in', elapsed, 'ms');
    console.log('📊 Results:');
    console.log('  - Success:', result.success);
    console.log('  - Total cards:', result.cards.length);
    console.log('  - Mainboard:', result.cards.filter(c => c.section !== 'sideboard').reduce((sum, c) => sum + c.quantity, 0));
    console.log('  - Sideboard:', result.cards.filter(c => c.section === 'sideboard').reduce((sum, c) => sum + c.quantity, 0));
    console.log('  - Confidence:', result.confidence);
    console.log('  - Guaranteed:', result.guaranteed);
    
    if (result.errors) {
      console.log('  - Errors:', result.errors);
    }
    if (result.warnings) {
      console.log('  - Warnings:', result.warnings);
    }
    
    // Show first few cards
    console.log('\n📋 First 5 cards:');
    result.cards.slice(0, 5).forEach(card => {
      console.log(`  - ${card.quantity}x ${card.name} (${card.section})`);
    });
    
  } catch (error) {
    console.error('❌ Error during processing:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testRealImage().catch(console.error);