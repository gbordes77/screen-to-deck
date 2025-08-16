#!/usr/bin/env python3
"""
Test du wrapper EasyOCR corrigé pour MTGA
"""

import sys
import os
import base64
import json
import subprocess

# Image de test MTGA
test_image = "/Volumes/DataDisk/_Projects/screen to deck/validated_decklists/MTGA deck list 4_1920x1080.jpeg"

if not os.path.exists(test_image):
    print(f"❌ Image non trouvée: {test_image}")
    sys.exit(1)

print(f"📸 Test MTGA avec: {test_image}")

# Encoder en base64
with open(test_image, "rb") as f:
    image_base64 = base64.b64encode(f.read()).decode()

print(f"📊 Image encodée: {len(image_base64)} caractères")

# Appeler le wrapper corrigé
result = subprocess.run(
    ["python3", "easyocr_mtga_fixed.py", "--stdin-base64"],
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
        
        # Total
        main_total = sum(c.get('quantity', 0) for c in data.get('mainboard', []))
        side_total = sum(c.get('quantity', 0) for c in data.get('sideboard', []))
        print(f"\n📊 Total cartes:")
        print(f"  - Mainboard: {main_total} cartes")
        print(f"  - Sideboard: {side_total} cartes")
        print(f"  - TOTAL: {main_total + side_total} cartes")
        
        if main_total == 60 and side_total == 15:
            print("\n🎉 PARFAIT! 60+15 détectés!")
        elif main_total == 60:
            print("\n✅ Mainboard OK (60 cartes)")
            if side_total == 0:
                print("⚠️ Sideboard non détecté")
        else:
            print(f"\n⚠️ {main_total}+{side_total} au lieu de 60+15")
            
        # Exemples
        if data.get('mainboard'):
            print("\n🃏 Mainboard:")
            for card in data['mainboard'][:10]:
                print(f"  {card.get('quantity', 1)}x {card.get('name', '?')}")
                
        if data.get('sideboard'):
            print("\n🎴 Sideboard:")
            for card in data['sideboard'][:5]:
                print(f"  {card.get('quantity', 1)}x {card.get('name', '?')}")
                
    except json.JSONDecodeError as e:
        print(f"❌ Erreur JSON: {e}")
        print(f"Sortie: {result.stdout[:500]}")
else:
    print("❌ Pas de sortie")
    
if result.stderr:
    print(f"\n⚠️ Stderr: {result.stderr[:200]}")