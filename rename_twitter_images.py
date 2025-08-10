#!/usr/bin/env python3
"""
Script pour examiner et renommer les images Twitter selon leur vrai type
"""

import os
import shutil
from pathlib import Path
from PIL import Image
import numpy as np

def analyze_and_rename():
    folder = Path("/Volumes/DataDisk/_Projects/screen to deck/validated_decklists")
    
    # Images Twitter à analyser (commencent par Gx)
    twitter_images = [f for f in folder.glob("Gx*.j*") if f.suffix.lower() in ['.jpg', '.jpeg', '.png']]
    
    # Dictionnaire pour stocker les classifications
    classifications = {
        'paper_deck': [],
        'mtggoldfish': [],
        'mtgo_screenshot': [],
        'arena_screenshot': [],
        'website_other': []
    }
    
    print(f"Analyzing {len(twitter_images)} Twitter images...")
    
    for img_path in twitter_images:
        try:
            img = Image.open(img_path)
            width, height = img.size
            img_array = np.array(img.convert('RGB'))
            
            # Analyser les caractéristiques de l'image
            filename = img_path.name
            
            # Détection basée sur les caractéristiques visuelles
            # (Dans un vrai système, on utiliserait l'OCR ou la détection d'objets)
            
            # Images déjà identifiées manuellement
            if filename == "Gx69yIGXIAASkvb.jpeg":
                classifications['paper_deck'].append(img_path)
                print(f"  {filename} -> Paper deck (cards on table)")
            elif filename == "Gx7Ep1QWkAAVKDt.jpeg":
                classifications['paper_deck'].append(img_path)
                print(f"  {filename} -> Paper deck (organized on playmat)")
            elif filename in ["GxwLKDNW0AAyED7.jpg", "GxwkOt8XkAAlL9x.jpg", "Gxwm8KaXwAA1dLF.jpg"]:
                classifications['mtggoldfish'].append(img_path)
                print(f"  {filename} -> MTGGoldfish")
            else:
                # Pour les autres, on va devoir deviner basé sur l'aspect
                # Les images MTGGoldfish ont tendance à avoir un fond clair avec layout distinct
                mean_brightness = img_array.mean()
                
                if mean_brightness > 200:  # Fond très clair
                    classifications['mtggoldfish'].append(img_path)
                    print(f"  {filename} -> MTGGoldfish (bright background)")
                elif width > 1400 and height > 800:  # Grande résolution typique des screenshots
                    classifications['website_other'].append(img_path)
                    print(f"  {filename} -> Website screenshot")
                else:
                    classifications['website_other'].append(img_path)
                    print(f"  {filename} -> Website/Other")
                    
        except Exception as e:
            print(f"  Error analyzing {img_path.name}: {e}")
    
    # Renommer les fichiers
    print("\nRenaming files...")
    
    for category, files in classifications.items():
        if not files:
            continue
            
        for i, file_path in enumerate(files, 1):
            extension = file_path.suffix
            
            # Déterminer le nouveau nom
            if category == 'paper_deck':
                if len(files) > 1:
                    new_name = f"real deck paper cards {i}{extension}"
                else:
                    new_name = f"real deck paper cards{extension}"
            elif category == 'mtggoldfish':
                if len(files) > 1:
                    new_name = f"mtggoldfish deck list {i}{extension}"
                else:
                    new_name = f"mtggoldfish deck list{extension}"
            elif category == 'mtgo_screenshot':
                if len(files) > 1:
                    new_name = f"MTGO deck list screenshot {i}{extension}"
                else:
                    new_name = f"MTGO deck list screenshot{extension}"
            elif category == 'arena_screenshot':
                if len(files) > 1:
                    new_name = f"MTGA deck list screenshot {i}{extension}"
                else:
                    new_name = f"MTGA deck list screenshot{extension}"
            else:  # website_other
                if len(files) > 1:
                    new_name = f"web deck list other {i}{extension}"
                else:
                    new_name = f"web deck list other{extension}"
            
            new_path = file_path.parent / new_name
            
            # Vérifier si le fichier existe déjà
            if new_path.exists():
                print(f"  ⚠️ {new_name} already exists, skipping")
            else:
                try:
                    file_path.rename(new_path)
                    print(f"  ✅ {file_path.name} -> {new_name}")
                except Exception as e:
                    print(f"  ❌ Error renaming {file_path.name}: {e}")
    
    print("\nDone!")
    
    # Afficher le résumé
    print("\nSummary:")
    for category, files in classifications.items():
        if files:
            print(f"  {category}: {len(files)} files")

if __name__ == "__main__":
    # D'abord, examiner visuellement quelques images de plus pour mieux classifier
    print("Quick visual check of more Twitter images...")
    
    folder = Path("/Volumes/DataDisk/_Projects/screen to deck/validated_decklists")
    twitter_images = sorted([f for f in folder.glob("Gx*.j*")])[:10]  # Les 10 premières
    
    print("First 10 Twitter images:")
    for img in twitter_images:
        print(f"  - {img.name}")
    
    print("\nStarting renaming process...\n")
    analyze_and_rename()