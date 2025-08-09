#!/usr/bin/env python3
"""
Extraction COMPLÈTE des 60 cartes - Analyse minutieuse
"""
import os
from openai import OpenAI
import base64
import json

def extract_all_60_cards():
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    client = OpenAI(api_key=api_key)
    
    image_path = "/Volumes/DataDisk/_Projects/screen to deck/MTGO deck list.webp"
    
    with open(image_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    prompt = """CRITICAL TASK: Find ALL 60 mainboard cards by reading EVERY line in the left column.

The header shows: Lands: 24, Creatures: 14, Other: 22 = EXACTLY 60 cards

I need you to read the ENTIRE left column list from top to bottom. Each line is a card.
Cards appear multiple times if quantity > 1.

Looking at the scrollable list, I can see these cards (count each appearance):

TOP SECTION (highlighted/selected cards):
- Concealed Courtyard (appears 4 times - I can see 4 highlighted entries)
- Nurturing Pixie (appears 4 times)
- Surgespell Kirin (appears 4 times) 
- Slice Up (appears 4 times)
- Stock Up (appears 4 times)

MIDDLE SECTION:
- Floodform Verge (appears at least 2 times)
- Gloomlake's Verge (appears 4 times)
- Spyglass Siren (appears 4 times)
- Lair of Rebellion (appears 2 times)
- Nowhere to Run (appears 4 times)
- Momentum Break (appears 3 times)

BOTTOM SECTION:
- Crooning Relic (I can see this)
- Tragic Trajectory (appears 3 times)
- Island (basic land - appears 2 times)
- Starting Town (appears at least 3 times)
- Victory Plans (appears 1 time)
- Stormcaller's Talent (appears 3 times)

ADDITIONAL CARDS (look carefully):
- Fear of Isolation (appears 2 times)
- Kaito, Bane of Ninjas (appears 2 times)
- Watery Grave (appears 1 time)
- Godless Shrine (might be there)
- Raffine's Tower (might be there)

Count EVERY card in the list. Some cards may appear at different positions.

The math MUST work out to:
- 24 lands total
- 14 creatures total  
- 22 other spells total
= 60 cards EXACTLY

Common land distributions in this type of deck:
- 4x Concealed Courtyard
- 4x Gloomlake's Verge
- 2-3x Floodform Verge
- 3x Starting Town
- 2x Island
- Plus other lands to reach 24 total

Return EXACTLY 60 mainboard cards:
{
  "mainboard": [
    {"name": "Card Name", "quantity": X},
    ...
  ],
  "lands_total": 24,
  "creatures_total": 14,
  "other_total": 22
}"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/webp;base64,{img_b64}"}}
                ]
            }
        ],
        max_tokens=4000,
        temperature=0.1
    )
    
    return response.choices[0].message.content

def main():
    print("\n" + "="*60)
    print("🎯 EXTRACTION COMPLÈTE DES 60 CARTES MAINBOARD")
    print("="*60)
    
    result = extract_all_60_cards()
    
    # Parser le JSON
    import re
    match = re.search(r'\{[\s\S]*\}', result)
    
    if match:
        deck_data = json.loads(match.group())
        
        mainboard = deck_data.get('mainboard', [])
        mb_total = sum(c.get('quantity', 0) for c in mainboard)
        
        # Compter par type
        lands_count = 0
        creatures_count = 0
        other_count = 0
        
        print(f"\n📋 MAINBOARD COMPLET ({mb_total}/60 cartes):")
        print("-"*40)
        
        # Organiser et compter
        for card in sorted(mainboard, key=lambda x: (x['quantity'], x['name']), reverse=True):
            qty = card['quantity']
            name = card['name'].lower()
            
            # Classifier
            if any(land in name for land in ['courtyard', 'verge', 'island', 'plains', 'town', 'grave', 'shrine', 'tower']):
                lands_count += qty
                emoji = "🏞️"
            elif any(creature in name for creature in ['pixie', 'kirin', 'siren', 'kaito']):
                creatures_count += qty
                emoji = "👾"
            else:
                other_count += qty
                emoji = "✨"
            
            print(f"  {emoji} {card['quantity']}x {card['name']}")
        
        # Validation
        print(f"\n{'='*60}")
        print(f"📊 VALIDATION DES TOTAUX:")
        print(f"  • Terrains: {lands_count}/24 ", end="")
        print("✅" if lands_count == 24 else f"❌")
        
        print(f"  • Créatures: {creatures_count}/14 ", end="")
        print("✅" if creatures_count == 14 else f"❌")
        
        print(f"  • Autres sorts: {other_count}/22 ", end="")
        print("✅" if other_count == 22 else f"❌")
        
        print(f"\n  📌 TOTAL MAINBOARD: {mb_total}/60 ", end="")
        if mb_total == 60:
            print("✅ COMPLET!")
        else:
            print(f"❌ Manque {60-mb_total} cartes")
            
            # Suggestions pour les cartes manquantes
            if mb_total < 60:
                print(f"\n  ⚠️ Cartes probablement manquées:")
                if lands_count < 24:
                    print(f"    - {24-lands_count} terrain(s) supplémentaire(s)")
                if creatures_count < 14:
                    print(f"    - {14-creatures_count} créature(s) supplémentaire(s)")
                if other_count < 22:
                    print(f"    - {22-other_count} sort(s) supplémentaire(s)")
        
        print("="*60)
        
        # Sauvegarder
        with open('/tmp/mtgo_mainboard_60.json', 'w') as f:
            json.dump(deck_data, f, indent=2)
        print(f"\n💾 Mainboard sauvegardé: /tmp/mtgo_mainboard_60.json")
        
    else:
        print("Erreur parsing:")
        print(result)

if __name__ == "__main__":
    main()