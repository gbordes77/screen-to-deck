#!/usr/bin/env python3
"""
Correction : Trouver les 6 terrains manquants
"""
import os
from openai import OpenAI
import base64
import json

def find_missing_lands():
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    client = OpenAI(api_key=api_key)
    
    image_path = "/Volumes/DataDisk/_Projects/screen to deck/MTGO deck list.webp"
    
    with open(image_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    prompt = """FOCUS: We have found 14 creatures and most spells, but we're MISSING 6 LANDS.

Current lands found (18 total):
- 4x Concealed Courtyard ✓
- 4x Gloomlake's Verge ✓
- 3x Starting Town ✓
- 2x Floodform Verge ✓
- 2x Island ✓
- 1x Watery Grave ✓
- 1x Raffine's Tower ✓
- 1x Godless Shrine ✓

We need 24 lands total, so 6 MORE lands are hiding in the list!

Look VERY CAREFULLY at the left column list. Some lands might be:
1. More copies of Floodform Verge (maybe 4x total instead of 2x?)
2. More basic Islands (maybe 4x total instead of 2x?)
3. Other dual lands like:
   - Darkslick Shores
   - Seachrome Coast
   - Hallowed Fountain
   - Drowned Catacomb
4. More copies of Starting Town (maybe 4x instead of 3x?)
5. Utility lands like:
   - Otawara, Soaring City
   - Eiganjo, Seat of the Empire
   - Takenuma, Abandoned Mire

IMPORTANT: In the scrollable list, lands might appear multiple times but not be highlighted.
Count EVERY occurrence of land names, even if they're not selected/highlighted.

The deck MUST have exactly:
- 24 Lands
- 14 Creatures (already found correctly)
- 22 Other spells

Please identify the 6 missing lands by looking at EVERY line in the list.

Return the COMPLETE 60-card mainboard with correct quantities:
{
  "mainboard": [
    {"name": "Card Name", "quantity": X, "type": "Land/Creature/Spell"},
    ...
  ]
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
    print("🔍 RECHERCHE DES 6 TERRAINS MANQUANTS")
    print("="*60)
    
    result = find_missing_lands()
    
    import re
    match = re.search(r'\{[\s\S]*\}', result)
    
    if match:
        deck_data = json.loads(match.group())
        mainboard = deck_data.get('mainboard', [])
        
        # Compter par type
        lands = []
        creatures = []
        spells = []
        
        for card in mainboard:
            card_type = card.get('type', '').lower()
            if 'land' in card_type:
                lands.append(card)
            elif 'creature' in card_type:
                creatures.append(card)
            else:
                spells.append(card)
        
        lands_total = sum(c['quantity'] for c in lands)
        creatures_total = sum(c['quantity'] for c in creatures)
        spells_total = sum(c['quantity'] for c in spells)
        
        print(f"\n🏞️ TERRAINS ({lands_total}/24):")
        print("-"*40)
        for card in sorted(lands, key=lambda x: x['quantity'], reverse=True):
            print(f"  • {card['quantity']}x {card['name']}")
        
        print(f"\n👾 CRÉATURES ({creatures_total}/14):")
        print("-"*40)
        for card in sorted(creatures, key=lambda x: x['quantity'], reverse=True):
            print(f"  • {card['quantity']}x {card['name']}")
        
        print(f"\n✨ SORTS ({spells_total}/22):")
        print("-"*40)
        for card in sorted(spells, key=lambda x: x['quantity'], reverse=True):
            print(f"  • {card['quantity']}x {card['name']}")
        
        # Total
        total = lands_total + creatures_total + spells_total
        
        print(f"\n{'='*60}")
        print(f"📊 VALIDATION FINALE:")
        print(f"  • Terrains: {lands_total}/24 ", end="")
        print("✅" if lands_total == 24 else f"❌")
        print(f"  • Créatures: {creatures_total}/14 ", end="")
        print("✅" if creatures_total == 14 else f"❌")
        print(f"  • Sorts: {spells_total}/22 ", end="")
        print("✅" if spells_total == 22 else f"❌")
        print(f"\n  📌 TOTAL: {total}/60 ", end="")
        print("✅ DECK COMPLET!" if total == 60 else f"❌")
        print("="*60)
        
        if total == 60:
            # Sauvegarder le deck complet
            with open('/tmp/mtgo_pixie_60_complete.json', 'w') as f:
                json.dump({"mainboard": mainboard}, f, indent=2)
            print(f"\n💾 DECK COMPLET SAUVEGARDÉ: /tmp/mtgo_pixie_60_complete.json")
            
            print("\n📋 FORMAT MTGA ARENA:")
            print("-"*40)
            for card in mainboard:
                print(f"{card['quantity']} {card['name']}")
    else:
        print("Erreur parsing:")
        print(result)

if __name__ == "__main__":
    main()