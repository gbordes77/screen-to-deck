#!/usr/bin/env python3
"""
MTGO (Magic: The Gathering Online) Deck Detector
Détecte les cartes depuis une capture d'écran MTGO
"""
import os
from openai import OpenAI
import base64
import json
import re

def extract_mtgo_deck(image_path):
    """
    Extrait toutes les cartes d'une capture MTGO
    MTGO affiche les cartes en format texte dans la colonne de gauche
    """
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    client = OpenAI(api_key=api_key)
    
    with open(image_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    # Déterminer le type d'image pour le data URL
    ext = os.path.splitext(image_path)[1].lower()
    if ext == '.webp':
        mime_type = 'image/webp'
    elif ext == '.png':
        mime_type = 'image/png'
    elif ext in ['.jpg', '.jpeg']:
        mime_type = 'image/jpeg'
    else:
        mime_type = 'image/png'  # default
    
    # Prompt spécifique pour MTGO
    prompt = """This is a Magic: The Gathering Online (MTGO) screenshot showing a deck list.

INTERFACE STRUCTURE:
- LEFT PANEL: Text list of cards with quantities (e.g., "4 Lightning Bolt")
- CENTER: Visual preview of the deck cards
- The list is organized in categories:
  * Lands
  * Creatures
  * Other spells
  * Sideboard (if visible)

YOUR TASK:
1. Read EVERY line in the left panel text list
2. Extract the quantity and card name for each line
3. Look for section headers like "Lands", "Creatures", "Sideboard"
4. The format is usually: [quantity] [card name]
   Examples: "4 Lightning Bolt", "2 Teferi, Time Raveler", "1 Island"

IMPORTANT:
- Read ALL visible text in the left panel
- Don't skip any lines
- Include both mainboard and sideboard if visible
- Some cards may have commas or special characters in their names

Return JSON format:
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

Make sure the mainboard totals 60 cards and sideboard 15 cards (if visible).
If you see text that's partially cut off, use your knowledge of MTG cards to complete the name."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{img_b64}"}}
                ]
            }
        ],
        max_tokens=4000,
        temperature=0.1  # Très basse pour précision OCR
    )
    
    return response.choices[0].message.content

def parse_mtgo_response(response_text):
    """
    Parse la réponse et extrait le JSON du deck
    """
    # Chercher le JSON dans la réponse
    match = re.search(r'\{[\s\S]*\}', response_text)
    
    if match:
        try:
            data = json.loads(match.group())
            return data
        except json.JSONDecodeError as e:
            print(f"Erreur parsing JSON: {e}")
            return None
    
    return None

def display_deck(deck_data):
    """
    Affiche le deck de manière formatée
    """
    if not deck_data:
        return
    
    print("\n" + "="*60)
    print("🎮 DECK MTGO DÉTECTÉ")
    print("="*60)
    
    # Mainboard
    mainboard = deck_data.get('mainboard', [])
    mb_total = sum(c.get('quantity', 0) for c in mainboard)
    
    print(f"\n📋 MAINBOARD ({mb_total}/60 cartes):")
    print("-"*40)
    
    # Organiser par type (heuristique basée sur les noms)
    lands = []
    creatures = []
    spells = []
    
    for card in mainboard:
        name = card['name'].lower()
        
        # Detection basique des types
        if any(land in name for land in ['island', 'plains', 'mountain', 'forest', 'swamp', 
                                          'fountain', 'foundry', 'vents', 'triome', 'pool',
                                          'crypt', 'tomb', 'fetch', 'shock', 'pathway']):
            lands.append(card)
        elif any(creature_word in name for creature_word in ['dragon', 'angel', 'demon', 'goblin',
                                                              'elf', 'knight', 'wizard', 'beast',
                                                              'elemental', 'soldier', 'spirit']):
            creatures.append(card)
        else:
            spells.append(card)
    
    # Afficher par catégorie
    if lands:
        print("\n🏞️ TERRAINS:")
        for card in lands:
            print(f"  • {card['quantity']}x {card['name']}")
    
    if creatures:
        print("\n👾 CRÉATURES:")
        for card in creatures:
            print(f"  • {card['quantity']}x {card['name']}")
    
    if spells:
        print("\n✨ SORTS:")
        for card in spells:
            print(f"  • {card['quantity']}x {card['name']}")
    
    # Sideboard
    sideboard = deck_data.get('sideboard', [])
    if sideboard:
        sb_total = sum(c.get('quantity', 0) for c in sideboard)
        
        print(f"\n📋 SIDEBOARD ({sb_total}/15 cartes):")
        print("-"*40)
        for card in sideboard:
            print(f"  • {card['quantity']}x {card['name']}")
    
    # Résumé
    total_cards = mb_total + sum(c.get('quantity', 0) for c in sideboard)
    print(f"\n{'='*60}")
    print(f"📊 TOTAL: {total_cards} cartes")
    
    if mb_total == 60:
        print(f"  ✅ Mainboard: {mb_total}/60")
    else:
        print(f"  ⚠️ Mainboard: {mb_total}/60 (incomplet)")
    
    if sideboard:
        sb_total = sum(c.get('quantity', 0) for c in sideboard)
        if sb_total == 15:
            print(f"  ✅ Sideboard: {sb_total}/15")
        else:
            print(f"  ⚠️ Sideboard: {sb_total}/15")
    
    print("="*60)

def save_deck(deck_data, output_path):
    """
    Sauvegarde le deck en JSON
    """
    with open(output_path, 'w') as f:
        json.dump(deck_data, f, indent=2)
    print(f"\n💾 Deck sauvegardé: {output_path}")

def main():
    print("\n" + "="*60)
    print("🎮 MTGO DECK DETECTOR")
    print("="*60)
    
    # Chercher l'image MTGO - image2.webp semble être l'image MTGO
    mtgo_images = [
        "/Volumes/DataDisk/_Projects/screen to deck/image2.webp",  # Image MTGO fournie
        "/Volumes/DataDisk/_Projects/screen to deck/mtgo_screenshot.png",
        "/Volumes/DataDisk/_Projects/screen to deck/mtgo.png",
        "/Volumes/DataDisk/_Projects/screen to deck/image3.png",
        "/Volumes/DataDisk/_Projects/screen to deck/image3.webp"
    ]
    
    image_path = None
    for path in mtgo_images:
        if os.path.exists(path):
            image_path = path
            break
    
    if not image_path:
        print("❌ Aucune image MTGO trouvée")
        return
    
    print(f"\n🔍 Analyse de: {os.path.basename(image_path)}")
    print("⏳ Extraction OCR en cours...")
    
    # Extraire le deck
    response = extract_mtgo_deck(image_path)
    
    # Parser la réponse
    deck_data = parse_mtgo_response(response)
    
    if deck_data:
        # Afficher le deck
        display_deck(deck_data)
        
        # Sauvegarder
        save_deck(deck_data, '/tmp/mtgo_deck.json')
        
        # Export en format texte MTGA
        print("\n📝 Format MTGA Arena:")
        print("-"*40)
        for card in deck_data.get('mainboard', []):
            print(f"{card['quantity']} {card['name']}")
        
        if deck_data.get('sideboard'):
            print("\nSideboard")
            for card in deck_data['sideboard']:
                print(f"{card['quantity']} {card['name']}")
    else:
        print("\n❌ Impossible d'extraire le deck")
        print("\nRéponse brute:")
        print(response)

if __name__ == "__main__":
    main()