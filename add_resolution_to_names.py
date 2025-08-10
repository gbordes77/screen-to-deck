#!/usr/bin/env python3
"""
Script pour ajouter la résolution à la fin de chaque nom de fichier image
"""

import os
from pathlib import Path
from PIL import Image

def add_resolution_to_filename():
    folder = Path("/Volumes/DataDisk/_Projects/screen to deck/validated_decklists")
    
    print("Adding resolution to all image filenames...")
    print("=" * 60)
    
    # Extensions d'images supportées
    image_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
    
    # Compteur pour les fichiers traités
    processed = 0
    skipped = 0
    errors = 0
    
    # Parcourir tous les fichiers
    for file_path in sorted(folder.glob("*")):
        if not file_path.is_file():
            continue
            
        # Vérifier l'extension
        if file_path.suffix.lower() not in image_extensions:
            continue
        
        # Vérifier si la résolution est déjà dans le nom (pattern simple)
        stem = file_path.stem
        import re
        if re.search(r'_\d+x\d+$', stem):
            print(f"⏭️  {file_path.name} - already has resolution")
            skipped += 1
            continue
        
        try:
            # Ouvrir l'image pour obtenir la résolution
            with Image.open(file_path) as img:
                width, height = img.size
                
            # Construire le nouveau nom
            extension = file_path.suffix
            new_stem = f"{stem}_{width}x{height}"
            new_name = f"{new_stem}{extension}"
            new_path = folder / new_name
            
            # Vérifier si le nouveau fichier existe déjà
            if new_path.exists() and new_path != file_path:
                print(f"⚠️  {file_path.name} -> {new_name} (already exists)")
                skipped += 1
                continue
            
            # Renommer le fichier
            file_path.rename(new_path)
            print(f"✅ {file_path.name} -> {new_name}")
            processed += 1
            
        except Exception as e:
            print(f"❌ Error processing {file_path.name}: {e}")
            errors += 1
    
    # Afficher le résumé
    print("\n" + "=" * 60)
    print("Summary:")
    print(f"  ✅ Processed: {processed} files")
    print(f"  ⏭️  Skipped: {skipped} files")
    print(f"  ❌ Errors: {errors} files")
    print(f"  📊 Total: {processed + skipped + errors} files")
    print("=" * 60)
    
    # Afficher l'inventaire final
    print("\nFinal inventory with resolutions:")
    print("-" * 40)
    
    categories = {
        'MTGA': [],
        'MTGO': [],
        'MTGGoldfish': [],
        'Real/Paper': [],
        'Website': [],
        'Other': []
    }
    
    for file in sorted(folder.glob("*")):
        if file.is_file() and file.suffix.lower() in image_extensions:
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
            for f in files[:3]:  # Show first 3
                print(f"  - {f}")
            if len(files) > 3:
                print(f"  ... and {len(files)-3} more")
    
    total = sum(len(files) for files in categories.values())
    print(f"\nTotal: {total} deck list images with resolutions")

if __name__ == "__main__":
    add_resolution_to_filename()