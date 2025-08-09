#!/usr/bin/env python3
"""
Force OpenAI à analyser TOUTES les cartes visibles
"""
import os
from openai import OpenAI
import base64
import json

def extract_everything(image_path):
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    client = OpenAI(api_key=api_key)
    
    with open(image_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    # Prompt ultra-détaillé pour forcer l'analyse complète
    prompt = """You are looking at an MTG deck screenshot. Your task is to identify EVERY SINGLE CARD visible.

MAINBOARD (left/center area):
I can see multiple MTG cards laid out. Look at each card carefully:
- Look at the card art
- Look at the mana cost symbols
- Look at the card frame color (red = Mountain/red spell, blue = Island/blue spell, etc.)
- Look at the shape and layout
- Even if you can't read the exact name, identify the card by its art and characteristics

For common cards you should recognize:
- Basic lands (Mountain, Island, Forest, Plains, Swamp)
- Dual lands (have two colors in the frame)
- Artifacts (gray/colorless frame)
- Popular spells you might recognize by art

SIDEBOARD (right panel with checkboxes):
Read the card names next to each checkbox. Note the quantity marked.

IMPORTANT: 
- Do NOT say "I can't read" - make your best educated guess based on:
  * Card art style
  * Mana symbols visible
  * Card frame color
  * Common cards in current meta
  * Card layout and text box size

Return a JSON with your analysis:
{
  "mainboard": [
    {"name": "Best guess of card name", "quantity": 1, "confidence": "high/medium/low", "reasoning": "why you think it's this card"},
    ...
  ],
  "sideboard": [
    {"name": "Card name", "quantity": 2},
    ...
  ]
}

Analyze EVERY visible card. I can count at least 10-15 different cards in the mainboard area."""

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
        temperature=0.3  # Un peu de créativité pour les devinettes
    )
    
    return response.choices[0].message.content

def main():
    print("\n" + "="*60)
    print("🔍 ANALYSE FORCÉE COMPLÈTE DE image.webp")
    print("="*60)
    
    result = extract_everything("/Volumes/DataDisk/_Projects/screen to deck/image.webp")
    
    # Parser le JSON
    import re
    match = re.search(r'\{[\s\S]*\}', result)
    
    if match:
        data = json.loads(match.group())
        
        # Mainboard
        mainboard = data.get('mainboard', [])
        mb_total = sum(c.get('quantity', 1) for c in mainboard)
        
        print(f"\n📋 MAINBOARD ({mb_total} cartes):")
        print("-"*40)
        
        # Grouper par confiance
        high_conf = [c for c in mainboard if c.get('confidence') == 'high']
        med_conf = [c for c in mainboard if c.get('confidence') == 'medium']
        low_conf = [c for c in mainboard if c.get('confidence') == 'low']
        
        if high_conf:
            print("\n✅ Haute confiance:")
            for card in high_conf:
                qty = card.get('quantity', 1)
                reason = card.get('reasoning', '')
                print(f"  • {qty}x {card['name']}")
                if reason:
                    print(f"    → {reason}")
        
        if med_conf:
            print("\n⚠️ Confiance moyenne:")
            for card in med_conf:
                qty = card.get('quantity', 1)
                reason = card.get('reasoning', '')
                print(f"  • {qty}x {card['name']}")
                if reason:
                    print(f"    → {reason}")
        
        if low_conf:
            print("\n❓ Basse confiance:")
            for card in low_conf:
                qty = card.get('quantity', 1)
                reason = card.get('reasoning', '')
                print(f"  • {qty}x {card['name']}")
                if reason:
                    print(f"    → {reason}")
        
        # Sideboard
        sideboard = data.get('sideboard', [])
        sb_total = sum(c.get('quantity', 1) for c in sideboard)
        
        print(f"\n📋 SIDEBOARD ({sb_total} cartes):")
        print("-"*40)
        for card in sideboard:
            qty = card.get('quantity', 1)
            print(f"  • {qty}x {card['name']}")
        
        # Total
        print(f"\n{'='*60}")
        print(f"📊 TOTAL: {mb_total + sb_total} cartes")
        print(f"  • Mainboard: {mb_total}/60")
        print(f"  • Sideboard: {sb_total}/15")
        print("="*60)
        
        # Sauvegarder
        with open('/tmp/deck_force_complete.json', 'w') as f:
            json.dump(data, f, indent=2)
        print("\n💾 Sauvegardé: /tmp/deck_force_complete.json")
    else:
        print("Réponse brute:")
        print(result)

if __name__ == "__main__":
    main()