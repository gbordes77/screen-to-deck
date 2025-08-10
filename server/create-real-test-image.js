#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createRealisticMTGImage(outputPath) {
  console.log('📸 Creating realistic MTG Arena screenshot...');
  
  const width = 1920;
  const height = 1080;
  
  // Create a buffer with more varied content for higher entropy
  const pixels = Buffer.alloc(width * height * 3);
  
  // Create a gradient background with noise for entropy
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      
      // Base gradient colors (dark Arena-like theme)
      const baseR = 30 + (x / width) * 20;
      const baseG = 30 + (y / height) * 20; 
      const baseB = 40 + Math.sin(x * 0.01) * 10;
      
      // Add noise for entropy
      const noise = (Math.random() - 0.5) * 30;
      
      pixels[idx] = Math.max(0, Math.min(255, baseR + noise));
      pixels[idx + 1] = Math.max(0, Math.min(255, baseG + noise));
      pixels[idx + 2] = Math.max(0, Math.min(255, baseB + noise));
    }
  }
  
  // Create the image with the noisy background
  await sharp(pixels, {
    raw: {
      width,
      height,
      channels: 3
    }
  })
  .composite([
    {
      input: Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <!-- Card list area -->
          <rect x="40" y="80" width="500" height="800" fill="rgba(0,0,0,0.5)" stroke="#666" stroke-width="2"/>
          
          <!-- Title -->
          <text x="60" y="50" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#fff">
            Standard Deck - Red Aggro
          </text>
          
          <!-- Mainboard Header -->
          <text x="60" y="110" font-family="Arial" font-size="20" fill="#ffcc00">
            Main Deck (60)
          </text>
          
          <!-- Creatures Section -->
          <text x="60" y="145" font-family="Arial" font-size="16" fill="#aaa">Creatures (20)</text>
          <text x="70" y="170" font-family="Arial" font-size="15" fill="#fff">4 Monastery Swiftspear</text>
          <text x="70" y="195" font-family="Arial" font-size="15" fill="#fff">4 Phoenix Chick</text>
          <text x="70" y="220" font-family="Arial" font-size="15" fill="#fff">4 Kumano Faces Kakkazan</text>
          <text x="70" y="245" font-family="Arial" font-size="15" fill="#fff">4 Feldon, Ronom Excavator</text>
          <text x="70" y="270" font-family="Arial" font-size="15" fill="#fff">4 Squee, Dubious Monarch</text>
          
          <!-- Spells Section -->
          <text x="60" y="310" font-family="Arial" font-size="16" fill="#aaa">Instants and Sorceries (17)</text>
          <text x="70" y="335" font-family="Arial" font-size="15" fill="#fff">4 Lightning Strike</text>
          <text x="70" y="360" font-family="Arial" font-size="15" fill="#fff">4 Play with Fire</text>
          <text x="70" y="385" font-family="Arial" font-size="15" fill="#fff">3 Obliterating Bolt</text>
          <text x="70" y="410" font-family="Arial" font-size="15" fill="#fff">3 Nahiri's Warcrafting</text>
          <text x="70" y="435" font-family="Arial" font-size="15" fill="#fff">3 Witchstalker Frenzy</text>
          
          <!-- Artifacts/Enchantments -->
          <text x="60" y="475" font-family="Arial" font-size="16" fill="#aaa">Artifacts (3)</text>
          <text x="70" y="500" font-family="Arial" font-size="15" fill="#fff">3 Urabrask's Forge</text>
          
          <!-- Lands Section -->
          <text x="60" y="540" font-family="Arial" font-size="16" fill="#aaa">Lands (20)</text>
          <text x="70" y="565" font-family="Arial" font-size="15" fill="#fff">17 Mountain</text>
          <text x="70" y="590" font-family="Arial" font-size="15" fill="#fff">3 Sokenzan, Crucible of Defiance</text>
          
          <!-- Sideboard area -->
          <rect x="580" y="80" width="400" height="400" fill="rgba(0,0,0,0.4)" stroke="#444" stroke-width="1"/>
          
          <!-- Sideboard Header -->
          <text x="600" y="110" font-family="Arial" font-size="20" fill="#ffcc00">
            Sideboard (15)
          </text>
          
          <!-- Sideboard Cards -->
          <text x="610" y="145" font-family="Arial" font-size="15" fill="#fff">3 Abrade</text>
          <text x="610" y="170" font-family="Arial" font-size="15" fill="#fff">2 Lithomantic Barrage</text>
          <text x="610" y="195" font-family="Arial" font-size="15" fill="#fff">2 Roiling Vortex</text>
          <text x="610" y="220" font-family="Arial" font-size="15" fill="#fff">2 Urabrask</text>
          <text x="610" y="245" font-family="Arial" font-size="15" fill="#fff">2 Chandra, Dressed to Kill</text>
          <text x="610" y="270" font-family="Arial" font-size="15" fill="#fff">2 Jaya, Fiery Negotiator</text>
          <text x="610" y="295" font-family="Arial" font-size="15" fill="#fff">2 Obliterating Bolt</text>
          
          <!-- Mana curve visualization -->
          <rect x="1050" y="200" width="300" height="200" fill="rgba(0,0,0,0.3)" stroke="#333"/>
          <text x="1150" y="190" font-family="Arial" font-size="14" fill="#aaa">Mana Curve</text>
          
          <!-- Fake mana curve bars -->
          <rect x="1070" y="350" width="30" height="40" fill="#d44"/>
          <rect x="1110" y="320" width="30" height="70" fill="#d44"/>
          <rect x="1150" y="330" width="30" height="60" fill="#d44"/>
          <rect x="1190" y="340" width="30" height="50" fill="#d44"/>
          <rect x="1230" y="360" width="30" height="30" fill="#d44"/>
          
          <!-- Add some UI elements for realism -->
          <rect x="40" y="920" width="150" height="40" rx="5" fill="#d44" opacity="0.8"/>
          <text x="115" y="945" font-family="Arial" font-size="16" fill="#fff" text-anchor="middle">
            Export
          </text>
          
          <rect x="200" y="920" width="150" height="40" rx="5" fill="#44d" opacity="0.8"/>
          <text x="275" y="945" font-family="Arial" font-size="16" fill="#fff" text-anchor="middle">
            Playtest
          </text>
        </svg>
      `),
      top: 0,
      left: 0
    }
  ])
  .png()
  .toFile(outputPath);
  
  const stats = fs.statSync(outputPath);
  console.log(`✅ Created realistic test image: ${outputPath}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  
  return outputPath;
}

// Main
if (require.main === module) {
  const outputPath = path.join(__dirname, 'test-mtg-realistic.png');
  createRealisticMTGImage(outputPath)
    .then(() => console.log('Done!'))
    .catch(console.error);
}

module.exports = { createRealisticMTGImage };