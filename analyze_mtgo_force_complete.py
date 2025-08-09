#!/usr/bin/env python3
"""
Force l'extraction complète des 60+15 cartes du deck MTGO
"""
import os
from openai import OpenAI
import base64
import json

def force_complete_extraction():
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    client = OpenAI(api_key=api_key)
    
    image_path = "/Volumes/DataDisk/_Projects/screen to deck/MTGO deck list.webp"
    
    with open(image_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    prompt = """CRITICAL: Extract EXACTLY 60 mainboard + 15 sideboard cards from this MTGO interface.

The title shows "Pixie revived: 60" and "Sideboard: 15"

LEFT COLUMN - I need you to count EVERY occurrence of each card:
Looking at the list, I can see these cards appear MULTIPLE times:
- Concealed Courtyard (selected, appears 4 times)
- Nurturing Pixie (appears 4 times)
- Surgespell Kirin (appears 4 times)
- Slice Up (appears multiple times)
- Floodform Verge (appears 2+ times)
- Gloomlake's Verge (appears 4 times)
- Spyglass Siren (appears 4 times)
- Lair of Rebellion (appears 2 times)
- Nowhere to Hide (appears multiple times)
- Momentum Break (appears multiple times)
- Crooning Relic (appears 1+ times)
- Tragic Trajectory (appears 3-4 times)
- Island (basic land)
- Starting Town (appears 3+ times)
- Victory Plans
- Stormcaller's Talent (appears multiple times)
- And MORE cards I can see in the list...

The interface shows:
- Lands: 24 total
- Creatures: 14 total  
- Other: 22 total
TOTAL = 60 cards

Look CAREFULLY at the scroll list and count:
- How many times each card name appears
- Some cards like the basic lands might be grouped
- Cards can appear 1-4 times typically

SIDEBOARD (right panel with checkboxes):
The numbers 7, 1, 3, 2, 2 indicate quantities
I can see:
- Seism Rip (2x)
- Cosmogone Zen (2x)
- Exercise (1x)
- Counter target artifact enchantment spell (likely "Annul" or similar)
- No More Lies (2x)
- Rest in Peace (visible in white frame)
And more to total 15 cards

Return EXACTLY 60 mainboard + 15 sideboard:
{
  "mainboard": [
    {"name": "Card Name", "quantity": 4},
    ...
  ],
  "sideboard": [
    {"name": "Card Name", "quantity": 2},
    ...
  ]
}

IMPORTANT: The mainboard MUST total exactly 60 cards. Look at every card in the scrollable list!"""

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
    print("🎯 EXTRACTION FORCÉE COMPLÈTE MTGO (60+15)")
    print("="*60)
    
    result = force_complete_extraction()
    
    # Parser le JSON
    import re
    match = re.search(r'\{[\s\S]*\}', result)
    
    if match:
        deck_data = json.loads(match.group())
        
        mainboard = deck_data.get('mainboard', [])
        mb_total = sum(c.get('quantity', 0) for c in mainboard)
        
        print(f"\n📋 MAINBOARD ({mb_total}/60 cartes):")
        print("-"*40)
        
        # Trier par quantité
        for card in sorted(mainboard, key=lambda x: (x['quantity'], x['name']), reverse=True):
            print(f"  {card['quantity']}x {card['name']}")
        
        # Sideboard
        sideboard = deck_data.get('sideboard', [])
        sb_total = sum(c.get('quantity', 0) for c in sideboard)
        
        print(f"\n📋 SIDEBOARD ({sb_total}/15 cartes):")
        print("-"*40)
        for card in sorted(sideboard, key=lambda x: (x['quantity'], x['name']), reverse=True):
            print(f"  {card['quantity']}x {card['name']}")
        
        # Validation
        print(f"\n{'='*60}")
        print(f"✅ RÉSULTAT FINAL:")
        print(f"  • Mainboard: {mb_total}/60 ", end="")
        if mb_total == 60:
            print("✅ COMPLET!")
        else:
            print(f"❌ Manque {60-mb_total} cartes")
            
        print(f"  • Sideboard: {sb_total}/15 ", end="")
        if sb_total == 15:
            print("✅ COMPLET!")
        else:
            print(f"❌ Manque {15-sb_total} cartes")
            
        print(f"  • TOTAL: {mb_total + sb_total}/75 cartes")
        print("="*60)
        
        # Sauvegarder le deck final
        with open('/tmp/mtgo_pixie_final.json', 'w') as f:
            json.dump(deck_data, f, indent=2)
        print(f"\n💾 Deck final sauvegardé: /tmp/mtgo_pixie_final.json")
        
        # Afficher format MTGA pour copier-coller
        print("\n📋 FORMAT MTGA (copier-coller):")
        print("-"*40)
        for card in mainboard:
            print(f"{card['quantity']} {card['name']}")
        print("\nSideboard")
        for card in sideboard:
            print(f"{card['quantity']} {card['name']}")
            
    else:
        print("Erreur parsing, réponse brute:")
        print(result)

if __name__ == "__main__":
    main()