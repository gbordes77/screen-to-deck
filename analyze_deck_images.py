#!/usr/bin/env python3
"""
Script pour analyser les images et identifier les deck lists MTG
"""

import os
import shutil
from pathlib import Path
from PIL import Image
import numpy as np
from typing import List, Tuple, Dict
import json

class DeckListAnalyzer:
    def __init__(self):
        # Mots-clés typiques des deck lists MTG
        self.deck_keywords = [
            'deck', 'sideboard', 'mainboard', 'cards',
            'creature', 'instant', 'sorcery', 'enchantment',
            'artifact', 'planeswalker', 'land', 'spell',
            'mountain', 'island', 'plains', 'forest', 'swamp'
        ]
        
        # Patterns de noms de fichiers typiques
        self.filename_patterns = [
            'deck', 'list', 'mtg', 'magic', 'arena',
            'standard', 'modern', 'legacy', 'commander'
        ]
        
        self.valid_decks = []
        self.invalid_images = []
        
    def analyze_image_characteristics(self, image_path: str) -> Dict:
        """Analyse les caractéristiques d'une image"""
        try:
            img = Image.open(image_path)
            
            # Caractéristiques de base
            width, height = img.size
            aspect_ratio = width / height if height > 0 else 0
            
            # Convertir en array numpy pour analyse
            img_array = np.array(img.convert('RGB'))
            
            # Analyser les couleurs dominantes
            mean_colors = img_array.mean(axis=(0, 1))
            
            # Vérifier si l'image est principalement du texte (fond clair/foncé avec contraste)
            gray = img_array.mean(axis=2)
            contrast = gray.std()
            
            # Les deck lists ont généralement:
            # - Un aspect ratio entre 0.5 et 2.0 (pas trop allongé)
            # - Un bon contraste (texte sur fond)
            # - Une taille raisonnable (pas trop petite)
            
            is_likely_decklist = (
                0.4 <= aspect_ratio <= 2.5 and  # Aspect ratio raisonnable
                width >= 400 and height >= 300 and  # Taille minimale
                contrast > 30  # Contraste suffisant pour du texte
            )
            
            return {
                'path': image_path,
                'filename': os.path.basename(image_path),
                'width': width,
                'height': height,
                'aspect_ratio': aspect_ratio,
                'contrast': contrast,
                'likely_decklist': is_likely_decklist,
                'file_size': os.path.getsize(image_path)
            }
            
        except Exception as e:
            return {
                'path': image_path,
                'filename': os.path.basename(image_path),
                'error': str(e),
                'likely_decklist': False
            }
    
    def check_filename_patterns(self, filename: str) -> bool:
        """Vérifie si le nom de fichier suggère une deck list"""
        filename_lower = filename.lower()
        
        # Exclure les patterns non-deck
        exclude_patterns = ['screenshot', 'photo', 'pic', 'img_']
        for pattern in exclude_patterns:
            if pattern in filename_lower:
                return False
        
        # Vérifier les patterns positifs
        for pattern in self.filename_patterns:
            if pattern in filename_lower:
                return True
        
        return False
    
    def analyze_folder(self, folder_path: str) -> Dict:
        """Analyse tous les fichiers d'un dossier"""
        folder = Path(folder_path)
        if not folder.exists():
            return {'error': f'Folder not found: {folder_path}'}
        
        results = {
            'folder': folder_path,
            'total_files': 0,
            'likely_decklists': [],
            'uncertain': [],
            'not_decklists': [],
            'errors': []
        }
        
        # Extensions d'images supportées
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
        
        for file_path in folder.iterdir():
            if file_path.suffix.lower() not in image_extensions:
                continue
            
            results['total_files'] += 1
            
            # Analyser l'image
            analysis = self.analyze_image_characteristics(str(file_path))
            
            if 'error' in analysis:
                results['errors'].append(analysis)
            elif analysis['likely_decklist']:
                results['likely_decklists'].append(analysis)
            else:
                # Vérifier le nom de fichier comme indice supplémentaire
                if self.check_filename_patterns(analysis['filename']):
                    results['uncertain'].append(analysis)
                else:
                    results['not_decklists'].append(analysis)
        
        return results
    
    def save_results(self, results: Dict, output_file: str):
        """Sauvegarde les résultats dans un fichier JSON"""
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
    
    def copy_valid_decks(self, results: Dict, output_folder: str):
        """Copie les deck lists valides dans un dossier de sortie"""
        output_path = Path(output_folder)
        output_path.mkdir(parents=True, exist_ok=True)
        
        copied = 0
        for deck in results.get('likely_decklists', []):
            src = deck['path']
            dst = output_path / deck['filename']
            try:
                shutil.copy2(src, dst)
                copied += 1
            except Exception as e:
                print(f"Error copying {src}: {e}")
        
        print(f"Copied {copied} deck lists to {output_folder}")
        return copied

def main():
    analyzer = DeckListAnalyzer()
    
    # Dossiers à analyser
    folders = [
        "/Volumes/DataDisk/_Projects/screen to deck/final_decklist_images",
        "/Volumes/DataDisk/_Projects/screen to deck/fireshoes_decklist_100"
    ]
    
    all_results = []
    
    for folder in folders:
        print(f"\n{'='*60}")
        print(f"Analyzing: {folder}")
        print('='*60)
        
        results = analyzer.analyze_folder(folder)
        all_results.append(results)
        
        # Afficher le résumé
        print(f"Total files: {results['total_files']}")
        print(f"Likely deck lists: {len(results['likely_decklists'])}")
        print(f"Uncertain: {len(results['uncertain'])}")
        print(f"Not deck lists: {len(results['not_decklists'])}")
        print(f"Errors: {len(results['errors'])}")
        
        # Afficher quelques exemples
        if results['likely_decklists']:
            print("\nExamples of likely deck lists:")
            for deck in results['likely_decklists'][:5]:
                print(f"  - {deck['filename']} ({deck['width']}x{deck['height']}, contrast: {deck['contrast']:.1f})")
        
        if results['uncertain']:
            print("\nUncertain (might be deck lists):")
            for deck in results['uncertain'][:5]:
                print(f"  - {deck['filename']} ({deck['width']}x{deck['height']}, contrast: {deck['contrast']:.1f})")
    
    # Sauvegarder les résultats
    output_file = "/Volumes/DataDisk/_Projects/screen to deck/deck_analysis_results.json"
    combined_results = {
        'analysis': all_results,
        'summary': {
            'total_analyzed': sum(r['total_files'] for r in all_results),
            'total_likely_decks': sum(len(r['likely_decklists']) for r in all_results),
            'total_uncertain': sum(len(r['uncertain']) for r in all_results),
            'total_not_decks': sum(len(r['not_decklists']) for r in all_results)
        }
    }
    
    analyzer.save_results(combined_results, output_file)
    print(f"\nResults saved to: {output_file}")
    
    # Créer un dossier avec toutes les deck lists identifiées
    valid_decks_folder = "/Volumes/DataDisk/_Projects/screen to deck/validated_decklists"
    print(f"\nCopying valid deck lists to: {valid_decks_folder}")
    
    total_copied = 0
    for results in all_results:
        copied = analyzer.copy_valid_decks(results, valid_decks_folder)
        total_copied += copied
    
    print(f"\nTotal deck lists copied: {total_copied}")
    
    # Résumé final
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print(f"Total images analyzed: {combined_results['summary']['total_analyzed']}")
    print(f"Confirmed deck lists: {combined_results['summary']['total_likely_decks']}")
    print(f"Uncertain (need manual review): {combined_results['summary']['total_uncertain']}")
    print(f"Not deck lists: {combined_results['summary']['total_not_decks']}")
    
    # Calculer le pourcentage
    if combined_results['summary']['total_analyzed'] > 0:
        percentage = (combined_results['summary']['total_likely_decks'] / combined_results['summary']['total_analyzed']) * 100
        print(f"\nDeck list percentage: {percentage:.1f}%")

if __name__ == "__main__":
    main()