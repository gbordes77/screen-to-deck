#!/usr/bin/env node
/**
 * Script to pre-populate cache with popular MTG cards
 * This improves performance by caching the most commonly used cards
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { getCacheService } from '../services/cacheService';
import { ScryfallCard } from '../types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface PopularCardData {
  name: string;
  formats: string[];
  playRate?: number;
}

// Most played cards across formats (curated list)
const POPULAR_CARDS: PopularCardData[] = [
  // Lands
  { name: "Island", formats: ["standard", "modern", "legacy", "vintage", "commander"] },
  { name: "Plains", formats: ["standard", "modern", "legacy", "vintage", "commander"] },
  { name: "Swamp", formats: ["standard", "modern", "legacy", "vintage", "commander"] },
  { name: "Mountain", formats: ["standard", "modern", "legacy", "vintage", "commander"] },
  { name: "Forest", formats: ["standard", "modern", "legacy", "vintage", "commander"] },
  
  // Fetch Lands
  { name: "Flooded Strand", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Polluted Delta", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Bloodstained Mire", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Wooded Foothills", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Windswept Heath", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Marsh Flats", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Scalding Tarn", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Verdant Catacombs", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Arid Mesa", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Misty Rainforest", formats: ["modern", "legacy", "vintage", "commander"] },
  
  // Shock Lands
  { name: "Hallowed Fountain", formats: ["modern", "commander"] },
  { name: "Watery Grave", formats: ["modern", "commander"] },
  { name: "Blood Crypt", formats: ["modern", "commander"] },
  { name: "Stomping Ground", formats: ["modern", "commander"] },
  { name: "Temple Garden", formats: ["modern", "commander"] },
  { name: "Godless Shrine", formats: ["modern", "commander"] },
  { name: "Steam Vents", formats: ["modern", "commander"] },
  { name: "Overgrown Tomb", formats: ["modern", "commander"] },
  { name: "Sacred Foundry", formats: ["modern", "commander"] },
  { name: "Breeding Pool", formats: ["modern", "commander"] },
  
  // Format Staples - Modern
  { name: "Lightning Bolt", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Path to Exile", formats: ["modern", "commander"] },
  { name: "Fatal Push", formats: ["modern", "legacy", "commander"] },
  { name: "Thoughtseize", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Snapcaster Mage", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Tarmogoyf", formats: ["modern", "legacy", "vintage"] },
  { name: "Liliana of the Veil", formats: ["modern", "legacy", "commander"] },
  { name: "Cryptic Command", formats: ["modern", "commander"] },
  { name: "Aether Vial", formats: ["modern", "legacy", "vintage"] },
  { name: "Collected Company", formats: ["modern", "commander"] },
  
  // Format Staples - Legacy/Vintage
  { name: "Force of Will", formats: ["legacy", "vintage", "commander"] },
  { name: "Brainstorm", formats: ["legacy", "vintage", "commander"] },
  { name: "Ponder", formats: ["legacy", "vintage", "commander"] },
  { name: "Swords to Plowshares", formats: ["legacy", "vintage", "commander"] },
  { name: "Daze", formats: ["legacy", "vintage"] },
  { name: "Wasteland", formats: ["legacy", "vintage", "commander"] },
  { name: "Force of Negation", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Delver of Secrets", formats: ["modern", "legacy", "vintage"] },
  { name: "Dark Ritual", formats: ["legacy", "vintage", "commander"] },
  { name: "Lotus Petal", formats: ["legacy", "vintage", "commander"] },
  
  // Commander Staples
  { name: "Sol Ring", formats: ["commander", "vintage"] },
  { name: "Command Tower", formats: ["commander"] },
  { name: "Arcane Signet", formats: ["commander"] },
  { name: "Mana Crypt", formats: ["commander", "vintage"] },
  { name: "Cyclonic Rift", formats: ["commander"] },
  { name: "Rhystic Study", formats: ["commander"] },
  { name: "Smothering Tithe", formats: ["commander"] },
  { name: "Mystic Remora", formats: ["commander", "vintage"] },
  { name: "Demonic Tutor", formats: ["commander", "vintage"] },
  { name: "Vampiric Tutor", formats: ["commander", "vintage"] },
  { name: "Birds of Paradise", formats: ["modern", "commander"] },
  { name: "Llanowar Elves", formats: ["modern", "commander"] },
  { name: "Cultivate", formats: ["commander"] },
  { name: "Kodama's Reach", formats: ["commander"] },
  { name: "Rampant Growth", formats: ["commander"] },
  { name: "Farseek", formats: ["commander"] },
  { name: "Nature's Lore", formats: ["commander"] },
  { name: "Three Visits", formats: ["commander"] },
  { name: "Skyshroud Claim", formats: ["commander"] },
  { name: "Explosive Vegetation", formats: ["commander"] },
  
  // Popular Planeswalkers
  { name: "Teferi, Hero of Dominaria", formats: ["modern", "commander"] },
  { name: "Jace, the Mind Sculptor", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Liliana, the Last Hope", formats: ["modern", "legacy", "commander"] },
  { name: "Karn Liberated", formats: ["modern", "legacy", "commander"] },
  { name: "Ugin, the Spirit Dragon", formats: ["modern", "commander"] },
  { name: "Nicol Bolas, Dragon-God", formats: ["commander"] },
  { name: "Wrenn and Six", formats: ["modern", "legacy", "vintage"] },
  { name: "Oko, Thief of Crowns", formats: ["legacy", "vintage", "commander"] },
  { name: "Teferi, Time Raveler", formats: ["modern", "legacy", "commander"] },
  { name: "Narset, Parter of Veils", formats: ["modern", "legacy", "vintage", "commander"] },
  
  // Recent Standard Cards (as of 2024)
  { name: "Sheoldred, the Apocalypse", formats: ["standard", "commander"] },
  { name: "Raffine, Scheming Seer", formats: ["standard", "commander"] },
  { name: "Fable of the Mirror-Breaker", formats: ["modern", "legacy", "commander"] },
  { name: "The Wandering Emperor", formats: ["standard", "commander"] },
  { name: "Invoke Despair", formats: ["standard", "commander"] },
  { name: "Make Disappear", formats: ["standard"] },
  { name: "Play with Fire", formats: ["standard"] },
  { name: "Consider", formats: ["standard", "modern"] },
  { name: "Expressive Iteration", formats: ["modern", "legacy", "vintage"] },
  { name: "Ledger Shredder", formats: ["modern", "legacy", "vintage", "commander"] },
  
  // Popular Creatures
  { name: "Ragavan, Nimble Pilferer", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Dragon's Rage Channeler", formats: ["modern", "legacy", "vintage"] },
  { name: "Murktide Regent", formats: ["modern", "legacy"] },
  { name: "Fury", formats: ["modern", "legacy", "commander"] },
  { name: "Solitude", formats: ["modern", "legacy", "commander"] },
  { name: "Endurance", formats: ["modern", "legacy", "commander"] },
  { name: "Grief", formats: ["modern", "legacy", "commander"] },
  { name: "Subtlety", formats: ["modern", "legacy", "commander"] },
  { name: "Omnath, Locus of Creation", formats: ["modern", "commander"] },
  { name: "Uro, Titan of Nature's Wrath", formats: ["modern", "legacy", "commander"] },
  
  // Artifacts
  { name: "The One Ring", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Mishra's Bauble", formats: ["modern", "legacy", "vintage"] },
  { name: "Sensei's Divining Top", formats: ["legacy", "vintage", "commander"] },
  { name: "Chalice of the Void", formats: ["modern", "legacy", "vintage"] },
  { name: "Ensnaring Bridge", formats: ["modern", "legacy", "commander"] },
  { name: "Pithing Needle", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Grafdigger's Cage", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Tormod's Crypt", formats: ["modern", "legacy", "vintage", "commander"] },
  { name: "Relic of Progenitus", formats: ["modern", "legacy", "commander"] },
  { name: "Lightning Greaves", formats: ["commander"] },
  { name: "Swiftfoot Boots", formats: ["commander"] },
];

async function fetchCardData(cardName: string): Promise<ScryfallCard | null> {
  try {
    const response = await axios.get('https://api.scryfall.com/cards/named', {
      params: { exact: cardName },
      timeout: 5000,
    });
    return response.data as ScryfallCard;
  } catch (error) {
    console.warn(`Failed to fetch "${cardName}":`, error.message);
    return null;
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🔄 Starting cache population script...');
  
  const cache = getCacheService();
  await cache.connect();
  
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  
  const popularCardsFile = path.join(dataDir, 'popular-cards.json');
  const fetchedCards: ScryfallCard[] = [];
  
  console.log(`📥 Fetching data for ${POPULAR_CARDS.length} popular cards...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < POPULAR_CARDS.length; i++) {
    const cardData = POPULAR_CARDS[i];
    console.log(`[${i + 1}/${POPULAR_CARDS.length}] Fetching "${cardData.name}"...`);
    
    const scryfallCard = await fetchCardData(cardData.name);
    
    if (scryfallCard) {
      fetchedCards.push(scryfallCard);
      
      // Cache the card data
      await cache.set('card:exact', [scryfallCard.name], scryfallCard);
      await cache.set('card:normalized', [
        scryfallCard.name.toLowerCase().replace(/[''`´]/g, '').replace(/\s+/g, ' ')
      ], scryfallCard);
      
      successCount++;
      console.log(`  ✅ Cached "${scryfallCard.name}"`);
    } else {
      failCount++;
      console.log(`  ❌ Failed to fetch "${cardData.name}"`);
    }
    
    // Rate limiting - 50ms between requests
    await delay(50);
  }
  
  // Save to file
  console.log(`\n💾 Saving ${fetchedCards.length} cards to ${popularCardsFile}...`);
  await fs.writeFile(popularCardsFile, JSON.stringify(fetchedCards, null, 2));
  
  // Get cache metrics
  const metrics = await cache.getMetrics();
  
  console.log('\n📊 Cache Population Summary:');
  console.log(`  ✅ Successfully cached: ${successCount} cards`);
  console.log(`  ❌ Failed to fetch: ${failCount} cards`);
  console.log(`  📦 Total cache entries: ${metrics.totalEntries}`);
  console.log(`  💾 Cache memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
  
  // Export metrics
  const metricsFile = path.join(dataDir, 'cache-metrics.json');
  await cache.exportMetrics(metricsFile);
  console.log(`  📈 Metrics exported to ${metricsFile}`);
  
  await cache.disconnect();
  console.log('\n✨ Cache population complete!');
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});