#!/usr/bin/env python3
"""
Test pour voir exactement ce qu'EasyOCR détecte dans l'image
"""

import sys
import easyocr
import json

# Créer le reader EasyOCR
reader = easyocr.Reader(['en'], gpu=False)

# Image à tester
image_path = 'test-images/day0-validation-set/MTGA deck list 4_1920x1080.jpeg'

print("🔍 Analyse de l'image avec EasyOCR...")
print("=" * 60)

# Lire le texte
results = reader.readtext(image_path)

print(f"\n📊 Nombre de détections: {len(results)}")
print("=" * 60)

# Afficher tout le texte détecté avec confidence
print("\n📝 TEXTE DÉTECTÉ (avec confidence):")
print("-" * 60)

for i, (bbox, text, confidence) in enumerate(results):
    print(f"{i+1:3}. [{confidence:.2f}] {text}")

# Chercher où est détecté "Sideboard"
print("\n" + "=" * 60)
print("🎯 RECHERCHE DU MOT 'SIDEBOARD':")
print("-" * 60)

sideboard_found = False
for i, (bbox, text, confidence) in enumerate(results):
    if 'sideboard' in text.lower():
        print(f"✅ Trouvé à la position {i+1}: '{text}' (confidence: {confidence:.2f})")
        sideboard_found = True
        # Montrer les 5 éléments avant et après
        print("\n  Context (5 avant et 5 après):")
        for j in range(max(0, i-5), min(len(results), i+6)):
            prefix = ">>> " if j == i else "    "
            print(f"{prefix}{j+1:3}. [{results[j][2]:.2f}] {results[j][1]}")

if not sideboard_found:
    print("❌ Le mot 'Sideboard' n'a pas été détecté")

# Analyser les patterns de cartes
print("\n" + "=" * 60)
print("🃏 ANALYSE DES PATTERNS DE CARTES:")
print("-" * 60)

import re

# Patterns pour détecter les cartes
card_patterns = [
    (r'^\d+\s+.+', "Format: '4 Lightning Bolt'"),
    (r'^.+\s+x?\d+$', "Format: 'Lightning Bolt x4' ou 'Lightning Bolt 4'"),
    (r'^\d+x\s+.+', "Format: '4x Lightning Bolt'"),
]

for pattern_str, description in card_patterns:
    pattern = re.compile(pattern_str)
    matches = []
    for bbox, text, confidence in results:
        if pattern.match(text.strip()):
            matches.append((text, confidence))
    
    print(f"\n{description}:")
    if matches:
        for text, conf in matches[:10]:  # Montrer max 10
            print(f"  ✓ [{conf:.2f}] {text}")
    else:
        print("  ✗ Aucune correspondance")

# Statistiques
print("\n" + "=" * 60)
print("📈 STATISTIQUES:")
print("-" * 60)

confidences = [conf for _, _, conf in results]
if confidences:
    print(f"Confidence moyenne: {sum(confidences)/len(confidences):.2%}")
    print(f"Confidence min: {min(confidences):.2%}")
    print(f"Confidence max: {max(confidences):.2%}")
    
    # Compter les éléments haute/basse confidence
    high_conf = sum(1 for c in confidences if c > 0.8)
    low_conf = sum(1 for c in confidences if c < 0.5)
    print(f"Haute confidence (>80%): {high_conf}/{len(results)}")
    print(f"Basse confidence (<50%): {low_conf}/{len(results)}")

# Sauvegarder le résultat brut
with open('easyocr_raw_output.json', 'w') as f:
    json.dump([{"bbox": bbox, "text": text, "confidence": confidence} 
               for bbox, text, confidence in results], f, indent=2)
    print(f"\n💾 Résultat complet sauvé dans: easyocr_raw_output.json")