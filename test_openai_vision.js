const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config({ path: './server/.env' });

async function testOpenAIVision() {
  console.log('🤖 Test OpenAI Vision API...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'TO_BE_SET') {
    console.error('❌ OpenAI API key not configured');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
  
  const openai = new OpenAI({ apiKey });
  
  // Lire l'image en base64
  const base64Image = fs.readFileSync('/tmp/image_base64.txt', 'utf-8').trim();
  
  const prompt = `You are analyzing a Magic: The Gathering deck screenshot. Extract ALL card names visible in the image, particularly from the sideboard list on the right side.

Return ONLY a JSON object in this format:
{
  "mainboard": [
    {"name": "Card Name", "quantity": 1}
  ],
  "sideboard": [
    {"name": "Card Name", "quantity": 1}
  ]
}

Look carefully at the right panel which shows the sideboard. Extract every card name you can see.`;

  try {
    console.log('📤 Sending to OpenAI...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image_url', 
              image_url: {
                url: `data:image/webp;base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
    });
    
    const content = response.choices[0]?.message?.content;
    console.log('\n✅ OpenAI Response:');
    console.log(content);
    
    // Parser le JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const cards = JSON.parse(jsonMatch[0]);
        console.log('\n📋 Cards found:');
        console.log('Mainboard:', cards.mainboard?.length || 0, 'cards');
        console.log('Sideboard:', cards.sideboard?.length || 0, 'cards');
        
        if (cards.sideboard && cards.sideboard.length > 0) {
          console.log('\n🎯 Sideboard cards:');
          cards.sideboard.forEach(card => {
            console.log(`  • ${card.quantity}x ${card.name}`);
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse JSON:', e);
    }
    
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testOpenAIVision();