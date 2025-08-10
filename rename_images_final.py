#!/usr/bin/env python3
"""
Script final pour renommer les images Twitter selon leur type réel
"""

import os
from pathlib import Path

def rename_twitter_images():
    folder = Path("/Volumes/DataDisk/_Projects/screen to deck/validated_decklists")
    
    # Classification manuelle basée sur l'examen visuel
    classifications = {
        'paper_deck': [
            "Gx69yIGXIAASkvb.jpeg",  # Photo cartes sur table
            "Gx7Ep1QWkAAVKDt.jpeg"   # Photo cartes sur tapis
        ],
        'mtggoldfish': [
            "GxwLKDNW0AAyED7.jpg",   # Temur Surprise
            "GxwkOt8XkAAlL9x.jpg",   # Izzet Cauldron  
            "Gxwm8KaXwAA1dLF.jpg",   # Dimir Midrange
            "GxwnQ3jWsAAU0jW.jpg",   # Esper Self-Bounce
            "GxwoHO8WoAIJuWE.jpg",   # Golgari Midrange
            "Gxwki_XWwAErEY-.jpg",
            "Gxwl2OgW4AE_AFu.jpg",
            "GxwlUu0WQAE1BL_.jpg",
            "GxwmISlW0AI5Ohx.jpg",
            "GxwmVJxXgAAN1iU.jpg",
            "Gxwn1zdWsAA7QKv.jpg",
            "Gxwoqi8XoAAuqkL.jpg",
            "GxwqOGzWAAAcqCg.jpg"
        ]
    }
    
    # Compteurs pour numérotation
    counters = {
        'paper_deck': 4,  # Commence à 4 car il y a déjà 3 "real deck cartes cachés"
        'mtggoldfish': 2,  # Commence à 2 car il y a déjà 1 "goldfish deck list"
    }
    
    print("Renaming Twitter images to their actual sources...\n")
    
    # Renommer paper decks
    for i, filename in enumerate(classifications['paper_deck'], counters['paper_deck']):
        old_path = folder / filename
        if old_path.exists():
            extension = old_path.suffix
            new_name = f"real deck paper cards {i}{extension}"
            new_path = folder / new_name
            
            if not new_path.exists():
                try:
                    old_path.rename(new_path)
                    print(f"✅ {filename} -> {new_name}")
                except Exception as e:
                    print(f"❌ Error renaming {filename}: {e}")
            else:
                print(f"⚠️ {new_name} already exists")
    
    # Renommer MTGGoldfish decks
    for i, filename in enumerate(classifications['mtggoldfish'], counters['mtggoldfish']):
        old_path = folder / filename
        if old_path.exists():
            extension = old_path.suffix
            new_name = f"mtggoldfish deck list {i}{extension}"
            new_path = folder / new_name
            
            if not new_path.exists():
                try:
                    old_path.rename(new_path)
                    print(f"✅ {filename} -> {new_name}")
                except Exception as e:
                    print(f"❌ Error renaming {filename}: {e}")
            else:
                print(f"⚠️ {new_name} already exists")
    
    print("\n" + "="*60)
    print("Renaming complete!")
    print("="*60)
    
    # Afficher le résumé des fichiers dans le dossier
    print("\nFinal inventory of validated_decklists:")
    
    categories = {
        'MTGA': [],
        'MTGO': [],
        'MTGGoldfish': [],
        'Real/Paper': [],
        'Website': [],
        'Other': []
    }
    
    for file in sorted(folder.glob("*")):
        if file.is_file():
            name_lower = file.name.lower()
            if 'mtga' in name_lower:
                categories['MTGA'].append(file.name)
            elif 'mtgo' in name_lower:
                categories['MTGO'].append(file.name)
            elif 'goldfish' in name_lower or 'mtggoldfish' in name_lower:
                categories['MTGGoldfish'].append(file.name)
            elif 'real' in name_lower or 'paper' in name_lower:
                categories['Real/Paper'].append(file.name)
            elif 'web' in name_lower or 'site' in name_lower:
                categories['Website'].append(file.name)
            else:
                categories['Other'].append(file.name)
    
    for category, files in categories.items():
        if files:
            print(f"\n{category} ({len(files)} files):")
            for f in files[:5]:  # Show first 5
                print(f"  - {f}")
            if len(files) > 5:
                print(f"  ... and {len(files)-5} more")
    
    total = sum(len(files) for files in categories.values())
    print(f"\nTotal: {total} deck list images")

if __name__ == "__main__":
    rename_twitter_images()