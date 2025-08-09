#!/usr/bin/env python3
"""
Analyse complète du deck MTGO Pixie Revival
"""
import os
from openai import OpenAI
import base64
import json

def analyze_mtgo_pixie():
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    client = OpenAI(api_key=api_key)
    
    # Charger l'image MTGO
    image_path = "/Volumes/DataDisk/_Projects/screen to deck/MTGO deck list.webp"
    
    with open(image_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    prompt = """Analyze this MTGO deck interface screenshot carefully.

I can see:
- Title: "Pixie revived: 60"
- Categories at top: Lands: 24, Creatures: 14, Other: 22
- Sideboard: 15

LEFT COLUMN (Main deck list):
Read EVERY card name in the scrollable list on the left. Cards appear multiple times if quantity > 1.
I can see cards like:
- Concealed Courtyard (appears 4 times based on highlights)
- Nurturing Pixie (appears 4 times)
- Surgespell Kirin (appears multiple times)
- Slice Up (blue card)
- Floodform Verge
- Gloomlake's Verge
- Spyglass Siren
- Lair of Rebellion
- Nowhere to Hide
- Momentum Break
- Crooning Relic
- Tragic Trajectory
- Island
- Starting Town
- Victory Plans
- Stormcaller's Talent

Count EACH appearance in the list to determine quantity.

SIDEBOARD (Right panel):
I can see checkboxes with numbers:
- 7, 1, 3, 2, 2 at the top
Cards visible include:
- Seism Rip (2 copies)
- Cosmogone Zen (2 copies)
- Exercise
- "Instant" (Counter target artifact)
- No More Lies (2 copies)
- "Enchantment" section

Return a complete JSON with all 60 mainboard + 15 sideboard cards:
{
  "deck_name": "Pixie Revival",
  "mainboard": [
    {"name": "Card Name", "quantity": 4},
    ...
  ],
  "sideboard": [
    {"name": "Card Name", "quantity": 2},
    ...
  ]
}

Be precise with quantities - count how many times each card appears in the list."""

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
    print("🎮 ANALYSE COMPLÈTE DECK MTGO PIXIE REVIVAL")
    print("="*60)
    
    result = analyze_mtgo_pixie()
    
    # Parser le JSON
    import re
    match = re.search(r'\{[\s\S]*\}', result)
    
    if match:
        deck_data = json.loads(match.group())
        
        # Mainboard
        mainboard = deck_data.get('mainboard', [])
        mb_total = sum(c.get('quantity', 0) for c in mainboard)
        
        print(f"\n📋 MAINBOARD ({mb_total}/60 cartes):")
        print("-"*40)
        
        # Organiser par catégorie
        lands = []
        creatures = []
        other_spells = []
        
        for card in mainboard:
            name = card['name'].lower()
            
            # Détection basique par nom
            if any(land in name for land in ['courtyard', 'verge', 'island', 'plains', 'mountain', 'town']):
                lands.append(card)
            elif any(creature in name for creature in ['pixie', 'kirin', 'siren']):
                creatures.append(card)
            else:
                other_spells.append(card)
        
        # Afficher par catégorie
        if lands:
            lands_total = sum(c['quantity'] for c in lands)
            print(f"\n🏞️ TERRAINS ({lands_total} cartes):")
            for card in sorted(lands, key=lambda x: x['quantity'], reverse=True):
                print(f"  • {card['quantity']}x {card['name']}")
        
        if creatures:
            creatures_total = sum(c['quantity'] for c in creatures)
            print(f"\n👾 CRÉATURES ({creatures_total} cartes):")
            for card in sorted(creatures, key=lambda x: x['quantity'], reverse=True):
                print(f"  • {card['quantity']}x {card['name']}")
        
        if other_spells:
            spells_total = sum(c['quantity'] for c in other_spells)
            print(f"\n✨ AUTRES SORTS ({spells_total} cartes):")
            for card in sorted(other_spells, key=lambda x: x['quantity'], reverse=True):
                print(f"  • {card['quantity']}x {card['name']}")
        
        # Sideboard
        sideboard = deck_data.get('sideboard', [])
        if sideboard:
            sb_total = sum(c.get('quantity', 0) for c in sideboard)
            
            print(f"\n📋 SIDEBOARD ({sb_total}/15 cartes):")
            print("-"*40)
            for card in sorted(sideboard, key=lambda x: x['quantity'], reverse=True):
                print(f"  • {card['quantity']}x {card['name']}")
        
        # Validation finale
        print(f"\n{'='*60}")
        print(f"📊 VALIDATION FINALE:")
        print(f"  • Mainboard: {mb_total}/60 ", end="")
        print("✅" if mb_total == 60 else f"❌ (manque {60-mb_total})")
        
        if sideboard:
            sb_total = sum(c.get('quantity', 0) for c in sideboard)
            print(f"  • Sideboard: {sb_total}/15 ", end="")
            print("✅" if sb_total == 15 else f"❌")
        
        print(f"  • TOTAL: {mb_total + sum(c.get('quantity', 0) for c in sideboard)} cartes")
        print("="*60)
        
        # Sauvegarder
        with open('/tmp/mtgo_pixie_complete.json', 'w') as f:
            json.dump(deck_data, f, indent=2)
        print(f"\n💾 Deck complet sauvegardé: /tmp/mtgo_pixie_complete.json")
        
        # Format MTGA
        print("\n📝 FORMAT MTGA ARENA:")
        print("-"*40)
        for card in mainboard:
            print(f"{card['quantity']} {card['name']}")
        
        if sideboard:
            print("\nSideboard")
            for card in sideboard:
                print(f"{card['quantity']} {card['name']}")
    else:
        print("Réponse brute:")
        print(result)

if __name__ == "__main__":
    main()