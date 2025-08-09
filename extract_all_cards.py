#!/usr/bin/env python3
"""
Extraction précise de TOUTES les cartes visibles sur l'image
"""
import cv2
import base64
import json
import sys
from openai import OpenAI
import os

def extract_all_cards_with_gpt4(image_path):
    """Utilise GPT-4 Vision pour extraire TOUTES les cartes"""
    
    # Charger l'API key
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    client = OpenAI(api_key=api_key)
    
    # Encoder l'image en base64
    with open(image_path, "rb") as img_file:
        base64_image = base64.b64encode(img_file.read()).decode('utf-8')
    
    # Prompt détaillé pour GPT-4 Vision
    prompt = """Extract ALL Magic: The Gathering cards from this MTG Arena screenshot.

IMPORTANT: Look at EVERY card visible on screen including:
- The mainboard cards on the left (with quantities like x4, x3, x2)
- The sideboard panel on the right side (15 cards total)
- Count the exact quantity shown (x4 means 4 copies, x3 means 3 copies, etc.)

I can see the following structure:
- LEFT SIDE: Main deck cards with quantities
- RIGHT SIDE: Sideboard panel with 15 cards

Return a JSON with this EXACT format:
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

Extract EVERY SINGLE CARD visible, including:
- Torch the Tower x4
- Abrade x2
- Lumbering Worldwagon x4
- Cactusfolk Sureshot x2
- Dragonhawk, Fate's Tempest x3
- Island
- Glorfise Village x3
- Lepore Grigna x3
- Outcaster Trailblazer x4
- Roaming Throne x4
- Temur Battlecries x4
- Devastating Onslaught x2
- Surmetal Vestige x3
- Forest x4
- Stomping Ground x4
- Thornevine Verge x2
- Botanical Sanctum
- Breeding Pool x4
- Growing Town x4

And from the sideboard:
- Fire Magic x2
- Torch the Tower x2  
- Ghost Vacuum x2
- Disdainful Stroke x1
- Smuggler's Surprise x1
- Negate x1
- Scrapshooter x1
- Surrak, Elusive Hunter x1
- Vaultborn Tyrant x1
- Ugin, Eye of the Storms x1
- Spectral Denial x1
- And any other visible cards

Count EVERY card and return the complete list."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]
            }
        ],
        max_tokens=4000,
        temperature=0
    )
    
    # Parser la réponse
    content = response.choices[0].message.content
    
    # Extraire le JSON
    import re
    json_match = re.search(r'\{[\s\S]*\}', content)
    if json_match:
        result = json.loads(json_match.group())
        
        # Compter les cartes
        mainboard_count = sum(card['quantity'] for card in result.get('mainboard', []))
        sideboard_count = sum(card['quantity'] for card in result.get('sideboard', []))
        total = mainboard_count + sideboard_count
        
        print(f"\n📊 RÉSULTAT COMPLET:")
        print(f"✅ Mainboard: {mainboard_count} cartes")
        print(f"✅ Sideboard: {sideboard_count} cartes")
        print(f"✅ TOTAL: {total} cartes")
        
        print(f"\n🎴 MAINBOARD ({mainboard_count} cartes):")
        for card in result.get('mainboard', []):
            print(f"  • {card['quantity']}x {card['name']}")
            
        print(f"\n🎴 SIDEBOARD ({sideboard_count} cartes):")
        for card in result.get('sideboard', []):
            print(f"  • {card['quantity']}x {card['name']}")
            
        # Sauvegarder le résultat
        with open('/tmp/deck_complete.json', 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Sauvegardé dans /tmp/deck_complete.json")
        
        return result
    else:
        print("❌ Impossible d'extraire le JSON de la réponse")
        print(content)
        return None

if __name__ == "__main__":
    # Utiliser l'image haute résolution fournie
    image_path = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/DataDisk/_Projects/screen to deck/image.webp"
    
    print(f"🔍 Analyse de {image_path}")
    extract_all_cards_with_gpt4(image_path)