#!/usr/bin/env node

const OpenAI = require('openai').default;
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function testOpenAIDirect() {
  console.log('🚀 Testing OpenAI directly...');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const imagePath = path.resolve(__dirname, '../uploads/mtg-1754815720547-204414186.png');
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Image not found:', imagePath);
    process.exit(1);
  }
  
  console.log('📁 Using image:', imagePath);
  
  const base64Image = fs.readFileSync(imagePath).toString('base64');
  
  const prompt = `Extract ALL Magic: The Gathering cards from this arena screenshot.
CRITICAL: You MUST find EXACTLY 60 mainboard cards and 15 sideboard cards.

Arena Rules:
- Main deck in center area
- Sideboard on the right side
- Small numbers (x2, x3, x4) indicate quantities

If you find less than 60+15, look for:
1. Basic lands (Plains, Island, Swamp, Mountain, Forest)
2. Partially visible cards
3. Cards at screen edges
4. Similar card names

Return JSON with EXACTLY this format:
{
  "mainboard": [{"name": "Card Name", "quantity": 4}, ...],
  "sideboard": [{"name": "Card Name", "quantity": 2}, ...]
}

The totals MUST be: 60 mainboard, 15 sideboard.`;

  try {
    console.log('🔄 Calling OpenAI API...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' }}
        ]
      }],
      max_tokens: 4000,
      temperature: 0.1
    });
    
    console.log('✅ OpenAI Response received');
    const content = response.choices[0]?.message?.content;
    
    console.log('\n📄 Raw Response:');
    console.log(content);
    
    // Try to parse JSON
    console.log('\n🔍 Attempting to parse JSON...');
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('Found JSON block');
      try {
        const data = JSON.parse(jsonMatch[0]);
        console.log('\n✅ Successfully parsed JSON:');
        console.log('  - Mainboard cards:', data.mainboard?.length || 0);
        console.log('  - Sideboard cards:', data.sideboard?.length || 0);
        
        const mainboardTotal = data.mainboard?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0;
        const sideboardTotal = data.sideboard?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0;
        
        console.log('  - Total mainboard count:', mainboardTotal);
        console.log('  - Total sideboard count:', sideboardTotal);
        
        // Show first few cards
        if (data.mainboard && data.mainboard.length > 0) {
          console.log('\n📋 First 5 mainboard cards:');
          data.mainboard.slice(0, 5).forEach(card => {
            console.log(`  - ${card.quantity || 1}x ${card.name}`);
          });
        }
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError.message);
        console.log('JSON string:', jsonMatch[0].substring(0, 200) + '...');
      }
    } else {
      console.log('❌ No JSON block found in response');
    }
    
  } catch (error) {
    console.error('❌ Error calling OpenAI:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testOpenAIDirect().catch(console.error);