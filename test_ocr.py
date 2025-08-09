#!/usr/bin/env python3
import sys
import base64
import json
import easyocr
import numpy as np
from PIL import Image
import io

# Lire le base64 depuis stdin
base64_data = sys.stdin.read().strip()

# Décoder en image
img_data = base64.b64decode(base64_data)
img = Image.open(io.BytesIO(img_data))

# Convertir en numpy array
img_array = np.array(img)

print("🔍 Analyse EasyOCR en cours...")
print(f"📐 Image size: {img.size}")
print(f"📊 Image mode: {img.mode}")
print("-" * 50)

# Initialiser EasyOCR
reader = easyocr.Reader(['en'], gpu=False)

# OCR
results = reader.readtext(img_array)

print(f"✅ Trouvé {len(results)} éléments de texte")
print("-" * 50)

# Extraire les cartes du sideboard (côté droit)
cards = []
for (bbox, text, prob) in results:
    # Filtrer par position (côté droit de l'image)
    x_min = min(point[0] for point in bbox)
    if x_min > img.width * 0.6:  # Côté droit seulement
        if prob > 0.5 and len(text) > 2:
            cards.append({
                "text": text,
                "confidence": prob,
                "position": {"x": x_min, "y": bbox[0][1]}
            })

# Trier par position Y (haut en bas)
cards.sort(key=lambda x: x["position"]["y"])

print("📋 CARTES DÉTECTÉES (Sideboard):")
for card in cards:
    print(f"  • {card['text']} (conf: {card['confidence']:.2f})")

# Format JSON pour le système
output = {
    "mainboard": [],
    "sideboard": [{"name": card["text"], "quantity": 1} for card in cards]
}

print("\n📤 OUTPUT JSON:")
print(json.dumps(output, indent=2))