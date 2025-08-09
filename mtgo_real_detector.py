#!/usr/bin/env python3
"""
MTGO Real Deck Detector - Pour la vraie interface MTGO
"""
import os
from openai import OpenAI
import base64
import json
import re

def extract_mtgo_deck_from_screenshot(image_path):
    """
    Extrait le deck depuis une vraie capture MTGO
    """
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    client = OpenAI(api_key=api_key)
    
    with open(image_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    # Déterminer le type MIME
    ext = os.path.splitext(image_path)[1].lower()
    mime_map = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'}
    mime_type = mime_map.get(ext, 'image/png')
    
    prompt = """This is a Magic: The Gathering Online (MTGO) interface screenshot.

WHAT I SEE:
- LEFT COLUMN: A scrollable list showing card names and quantities in text format
- The list shows entries like "Concealed Courtyard", "Nurturing Pixie", "Surgespell Kick", etc.
- Numbers on the left indicate quantities (like 24, 16, 12, 4, 4 at the top)
- Some entries are highlighted/selected in the list

YOUR TASK:
Read EVERY visible line in the left column list. The format is:
- Card names are listed vertically
- Some cards appear multiple times in the list (indicating quantity)
- The numbers at the top (24, 16, 12, 4, 4) indicate total counts for different categories

Extract ALL cards visible, counting duplicates. For example:
- If "Nurturing Pixie" appears 4 times in the list, report quantity: 4
- If "Concealed Courtyard" appears 4 times, report quantity: 4

Look at EVERY row in the left panel. Count carefully!

Also check for sideboard - it shows "Sideboard: 15" at the top right.

Return in JSON format:
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

IMPORTANT: Count each occurrence of a card name in the list to get the correct quantity."""

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
        temperature=0.1
    )
    
    return response.choices[0].message.content

def parse_and_display(response_text):
    """
    Parse et affiche le deck
    """
    # Extraire le JSON
    match = re.search(r'\{[\s\S]*\}', response_text)
    
    if not match:
        print("❌ Pas de JSON trouvé dans la réponse")
        print("\nRéponse brute:")
        print(response_text)
        return None
    
    try:
        deck_data = json.loads(match.group())
    except json.JSONDecodeError as e:
        print(f"❌ Erreur parsing JSON: {e}")
        return None
    
    print("\n" + "="*60)
    print("🎮 DECK MTGO DÉTECTÉ (Pixie Revival)")
    print("="*60)
    
    # Mainboard
    mainboard = deck_data.get('mainboard', [])
    mb_total = sum(c.get('quantity', 0) for c in mainboard)
    
    print(f"\n📋 MAINBOARD ({mb_total}/60 cartes):")
    print("-"*40)
    
    # Trier par quantité décroissante
    mainboard_sorted = sorted(mainboard, key=lambda x: x.get('quantity', 0), reverse=True)
    
    for card in mainboard_sorted:
        qty = card.get('quantity', 0)
        name = card['name']
        print(f"  {qty:2}x {name}")
    
    # Sideboard
    sideboard = deck_data.get('sideboard', [])
    if sideboard:
        sb_total = sum(c.get('quantity', 0) for c in sideboard)
        
        print(f"\n📋 SIDEBOARD ({sb_total}/15 cartes):")
        print("-"*40)
        
        sideboard_sorted = sorted(sideboard, key=lambda x: x.get('quantity', 0), reverse=True)
        
        for card in sideboard_sorted:
            qty = card.get('quantity', 0)
            name = card['name']
            print(f"  {qty:2}x {name}")
    
    # Statistiques
    total_cards = mb_total + sum(c.get('quantity', 0) for c in sideboard)
    
    print(f"\n{'='*60}")
    print(f"📊 STATISTIQUES:")
    print(f"  • Mainboard: {mb_total}/60 ", end="")
    print("✅" if mb_total == 60 else f"❌ (manque {60-mb_total})")
    
    if sideboard:
        sb_total = sum(c.get('quantity', 0) for c in sideboard)
        print(f"  • Sideboard: {sb_total}/15 ", end="")
        print("✅" if sb_total == 15 else "❌")
    
    print(f"  • Total: {total_cards} cartes")
    print("="*60)
    
    # Sauvegarder
    output_path = '/tmp/mtgo_pixie_deck.json'
    with open(output_path, 'w') as f:
        json.dump(deck_data, f, indent=2)
    print(f"\n💾 Sauvegardé: {output_path}")
    
    # Export format MTGA
    print("\n📝 FORMAT MTGA ARENA:")
    print("-"*40)
    for card in mainboard_sorted:
        print(f"{card.get('quantity', 0)} {card['name']}")
    
    if sideboard:
        print("\nSideboard")
        for card in sideboard_sorted:
            print(f"{card.get('quantity', 0)} {card['name']}")
    
    return deck_data

def main():
    print("\n" + "="*60)
    print("🎮 MTGO REAL INTERFACE DETECTOR")
    print("="*60)
    
    # L'image vient d'être fournie par l'utilisateur
    # Elle devrait être dans le clipboard ou un fichier temporaire
    
    # Chercher les images possibles
    possible_paths = [
        "/tmp/clipboard_image.png",
        "/tmp/mtgo_screenshot.png",
        "/Volumes/DataDisk/_Projects/screen to deck/mtgo_latest.png",
        # Ajouter d'autres chemins si nécessaire
    ]
    
    image_path = None
    
    # D'abord chercher dans /tmp pour les images récentes
    import glob
    tmp_images = glob.glob("/tmp/*.png") + glob.glob("/tmp/*.jpg")
    if tmp_images:
        # Prendre la plus récente
        tmp_images.sort(key=os.path.getmtime, reverse=True)
        image_path = tmp_images[0]
    
    if not image_path:
        # Chercher dans le projet
        for path in possible_paths:
            if os.path.exists(path):
                image_path = path
                break
    
    if not image_path:
        print("❌ Aucune image MTGO trouvée")
        print("\n💡 Conseil: Sauvegardez votre capture d'écran dans /tmp/ ou dans le dossier du projet")
        return
    
    print(f"\n🔍 Analyse de: {os.path.basename(image_path)}")
    print(f"   Chemin: {image_path}")
    print("⏳ Extraction OCR en cours...")
    
    try:
        # Extraire le deck
        response = extract_mtgo_deck_from_screenshot(image_path)
        
        # Parser et afficher
        deck_data = parse_and_display(response)
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        print("\n💡 Vérifiez que l'image est bien une capture MTGO")

if __name__ == "__main__":
    main()