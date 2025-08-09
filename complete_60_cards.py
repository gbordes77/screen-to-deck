#!/usr/bin/env python3
"""
Identifier les 60 cartes du mainboard + 15 du sideboard
"""
import os
from openai import OpenAI
import base64
import json

def extract_all_75_cards(image_path):
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    client = OpenAI(api_key=api_key)
    
    with open(image_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    # Prompt pour forcer l'identification des 60 cartes
    prompt = """CRITICAL: Extract EXACTLY all cards from this MTG deck image.

I can see cards laid out in the mainboard area. Count them systematically:
- Start from top-left, go row by row
- Look at EACH card position
- Even duplicates must be counted

Based on what we already identified:
- 4x Fable of the Mirror-Breaker (red)
- 4x Teferi, Time Raveler (white/blue) 
- 3x Narset, Parter of Veils (blue)
- 3x Supreme Verdict (white/blue)
- 3x Shark Typhoon (blue)
- 2x The Wandering Emperor (white)
- 4x Portable Hole (white)
- 4x Expressive Iteration (red/blue)
- 4x Consider (blue)
- Lands: Hallowed Fountain, Sacred Foundry, Steam Vents, Raugrin Triome, Islands, Plains

That's 50 cards. We need 10 MORE cards.

Look for:
1. More basic lands (Mountains? More Islands/Plains?)
2. Other spells visible but not yet identified
3. More dual lands or utility lands
4. Counterspells (Dovin's Veto mainboard? Make Disappear?)
5. Removal spells (Lightning Bolt? Unholy Heat? Prismatic Ending?)
6. Card draw (Memory Deluge?)
7. Win conditions (Hall of Storm Giants?)

Count EVERY card pile visible. Some might be:
- Stacked together (count the stack size)
- Partially obscured (still count them)
- Basic lands grouped together

Return JSON with all 60 mainboard + 15 sideboard cards:
{
  "mainboard": [
    {"name": "Card Name", "quantity": 4},
    ...
  ],
  "sideboard": [
    {"name": "Card Name", "quantity": 1},
    ...
  ]
}

The mainboard MUST total exactly 60 cards. Count carefully!"""

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
        temperature=0.2
    )
    
    return response.choices[0].message.content

def main():
    print("\n" + "="*60)
    print("🎯 IDENTIFICATION DES 75 CARTES COMPLÈTES")
    print("="*60)
    
    result = extract_all_75_cards("/Volumes/DataDisk/_Projects/screen to deck/image.webp")
    
    # Parser le JSON
    import re
    match = re.search(r'\{[\s\S]*\}', result)
    
    if match:
        data = json.loads(match.group())
        
        # Mainboard
        mainboard = data.get('mainboard', [])
        mb_total = sum(c.get('quantity', 1) for c in mainboard)
        
        print(f"\n📋 MAINBOARD ({mb_total}/60 cartes):")
        print("-"*40)
        
        # Organiser par type
        lands = []
        creatures = []
        planeswalkers = []
        instants = []
        sorceries = []
        enchantments = []
        artifacts = []
        others = []
        
        for card in mainboard:
            name = card['name'].lower()
            qty = card.get('quantity', 1)
            
            if any(land in name for land in ['island', 'plains', 'mountain', 'fountain', 'foundry', 'vents', 'triome', 'hall']):
                lands.append(card)
            elif 'teferi' in name or 'narset' in name or 'emperor' in name:
                planeswalkers.append(card)
            elif 'fable' in name:
                creatures.append(card)  # C'est une saga mais produit des créatures
            elif any(inst in name for inst in ['consider', 'dovin', 'make disappear', 'negate']):
                instants.append(card)
            elif any(sorc in name for sorc in ['verdict', 'expressive', 'iteration']):
                sorceries.append(card)
            elif 'shark' in name:
                enchantments.append(card)
            elif 'portable' in name:
                artifacts.append(card)
            else:
                others.append(card)
        
        # Afficher par catégorie
        if lands:
            print("\n🏞️ TERRAINS:")
            total_lands = 0
            for card in lands:
                qty = card.get('quantity', 1)
                total_lands += qty
                print(f"  • {qty}x {card['name']}")
            print(f"  → Total terrains: {total_lands}")
        
        if creatures:
            print("\n👾 CRÉATURES/SAGAS:")
            for card in creatures:
                qty = card.get('quantity', 1)
                print(f"  • {qty}x {card['name']}")
        
        if planeswalkers:
            print("\n✨ PLANESWALKERS:")
            for card in planeswalkers:
                qty = card.get('quantity', 1)
                print(f"  • {qty}x {card['name']}")
        
        if instants:
            print("\n⚡ ÉPHÉMÈRES:")
            for card in instants:
                qty = card.get('quantity', 1)
                print(f"  • {qty}x {card['name']}")
        
        if sorceries:
            print("\n🔮 RITUELS:")
            for card in sorceries:
                qty = card.get('quantity', 1)
                print(f"  • {qty}x {card['name']}")
        
        if enchantments:
            print("\n🌟 ENCHANTEMENTS:")
            for card in enchantments:
                qty = card.get('quantity', 1)
                print(f"  • {qty}x {card['name']}")
        
        if artifacts:
            print("\n⚙️ ARTEFACTS:")
            for card in artifacts:
                qty = card.get('quantity', 1)
                print(f"  • {qty}x {card['name']}")
        
        if others:
            print("\n❓ AUTRES:")
            for card in others:
                qty = card.get('quantity', 1)
                print(f"  • {qty}x {card['name']}")
        
        # Sideboard
        sideboard = data.get('sideboard', [])
        sb_total = sum(c.get('quantity', 1) for c in sideboard)
        
        print(f"\n📋 SIDEBOARD ({sb_total}/15 cartes):")
        print("-"*40)
        for card in sideboard:
            qty = card.get('quantity', 1)
            print(f"  • {qty}x {card['name']}")
        
        # Total et analyse
        print(f"\n{'='*60}")
        print(f"📊 BILAN FINAL:")
        print(f"  • Mainboard: {mb_total}/60 ", end="")
        if mb_total == 60:
            print("✅")
        else:
            print(f"❌ (manque {60-mb_total} cartes)")
        
        print(f"  • Sideboard: {sb_total}/15 ", end="")
        if sb_total == 15:
            print("✅")
        else:
            print(f"⚠️")
        
        print(f"  • TOTAL: {mb_total + sb_total}/75 cartes")
        print("="*60)
        
        if mb_total < 60:
            print(f"\n⚠️ Cartes manquantes probables pour arriver à 60:")
            missing = 60 - mb_total
            print(f"  • {missing} cartes supplémentaires nécessaires")
            print(f"  • Probablement: terrains de base ou cartes empilées")
        
        # Sauvegarder
        with open('/tmp/deck_complete_75.json', 'w') as f:
            json.dump(data, f, indent=2)
        print("\n💾 Sauvegardé: /tmp/deck_complete_75.json")
    else:
        print("Réponse brute:")
        print(result)

if __name__ == "__main__":
    main()