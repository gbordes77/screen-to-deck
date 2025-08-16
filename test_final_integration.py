#!/usr/bin/env python3
"""
Test final d'intégration EasyOCR
"""

import sys
import os
import base64
import json
import subprocess

# Image de test
test_image = "/Volumes/DataDisk/_Projects/screen to deck/validated_decklists/MTGA deck list 4_1920x1080.jpeg"

if not os.path.exists(test_image):
    print(f"❌ Image de test non trouvée: {test_image}")
    sys.exit(1)

print(f"📸 Test avec image: {test_image}")

# Lire et encoder l'image en base64
with open(test_image, "rb") as f:
    image_base64 = base64.b64encode(f.read()).decode()

print(f"📊 Image encodée: {len(image_base64)} caractères")

# Appeler le wrapper EasyOCR
result = subprocess.run(
    ["python3", "easyocr_stdin_final.py", "--stdin-base64"],
    input=image_base64,
    capture_output=True,
    text=True
)

print(f"✅ Code retour: {result.returncode}")

if result.stdout:
    try:
        data = json.loads(result.stdout)
        print(f"\n📋 Résultats:")
        print(f"  - Mainboard: {len(data.get('mainboard', []))} cartes uniques")
        print(f"  - Sideboard: {len(data.get('sideboard', []))} cartes uniques")
        print(f"  - Confiance: {data.get('confidence', 0) * 100:.1f}%")
        
        # Compter le total de cartes
        main_total = sum(c.get('quantity', 0) for c in data.get('mainboard', []))
        side_total = sum(c.get('quantity', 0) for c in data.get('sideboard', []))
        print(f"\n📊 Total cartes:")
        print(f"  - Mainboard: {main_total} cartes")
        print(f"  - Sideboard: {side_total} cartes")
        print(f"  - Total: {main_total + side_total} cartes")
        
        if main_total == 60 and side_total == 15:
            print("\n✅ SUCCÈS! 60+15 détectés parfaitement!")
        else:
            print(f"\n⚠️ Attention: {main_total}+{side_total} détectés au lieu de 60+15")
            
        # Afficher quelques cartes
        if data.get('mainboard'):
            print("\n🃏 Exemples mainboard:")
            for card in data['mainboard'][:5]:
                print(f"  - {card.get('quantity', 1)}x {card.get('name', '?')}")
                
    except json.JSONDecodeError as e:
        print(f"❌ Erreur JSON: {e}")
        print(f"Output: {result.stdout[:500]}...")
else:
    print("❌ Pas de sortie")
    
if result.stderr:
    print(f"\n⚠️ Stderr: {result.stderr[:500]}")