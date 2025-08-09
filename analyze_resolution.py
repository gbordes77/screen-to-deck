#!/usr/bin/env python3
"""
Analyse la résolution et qualité des images pour déterminer la faisabilité de l'OCR
"""
import cv2
import numpy as np
from PIL import Image
import sys

def analyze_image_quality(image_path):
    """Analyse la qualité d'une image pour OCR"""
    
    # Charger avec OpenCV et PIL pour différentes métriques
    img_cv = cv2.imread(image_path)
    img_pil = Image.open(image_path)
    
    height, width = img_cv.shape[:2]
    
    print(f"\n📊 ANALYSE DE {image_path}")
    print("=" * 60)
    
    # 1. Résolution
    print(f"\n📐 RÉSOLUTION:")
    print(f"  • Dimensions: {width}x{height} pixels")
    print(f"  • Total pixels: {width*height:,}")
    print(f"  • Format: {img_pil.format if hasattr(img_pil, 'format') else 'Unknown'}")
    
    # 2. Estimation de la taille du texte
    # Zone du sideboard (25% droite de l'image)
    sideboard_x = int(width * 0.75)
    sideboard = img_cv[:, sideboard_x:]
    sb_width = sideboard.shape[1]
    
    print(f"\n📝 ESTIMATION TAILLE TEXTE SIDEBOARD:")
    print(f"  • Largeur sideboard: {sb_width} pixels")
    
    # Une carte fait environ 1/15 de la hauteur du sideboard
    card_height = height // 15
    print(f"  • Hauteur estimée par carte: {card_height} pixels")
    
    # Le texte fait environ 1/3 de la hauteur d'une carte
    text_height = card_height // 3
    print(f"  • Hauteur estimée du texte: {text_height} pixels")
    
    # 3. Analyse de la netteté (Laplacien)
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    print(f"\n🔍 NETTETÉ:")
    print(f"  • Score Laplacien: {laplacian_var:.2f}")
    if laplacian_var < 100:
        print(f"  • ⚠️ Image TRÈS FLOUE - OCR difficile")
    elif laplacian_var < 500:
        print(f"  • ⚠️ Image floue - OCR limité")
    else:
        print(f"  • ✅ Image nette - OCR possible")
    
    # 4. Contraste
    # Calculer l'écart-type des valeurs de pixels
    contrast = gray.std()
    print(f"\n🎨 CONTRASTE:")
    print(f"  • Écart-type: {contrast:.2f}")
    if contrast < 30:
        print(f"  • ⚠️ Contraste FAIBLE - OCR difficile")
    elif contrast < 50:
        print(f"  • ⚠️ Contraste moyen")
    else:
        print(f"  • ✅ Bon contraste")
    
    # 5. Recommandations
    print(f"\n💡 RECOMMANDATIONS POUR OCR:")
    
    ocr_feasible = True
    recommendations = []
    
    if width < 1200:
        recommendations.append("❌ Résolution trop basse (min 1200px largeur)")
        ocr_feasible = False
    
    if text_height < 15:
        recommendations.append("❌ Texte trop petit (< 15 pixels)")
        ocr_feasible = False
    elif text_height < 20:
        recommendations.append("⚠️ Texte limite (15-20 pixels)")
    
    if laplacian_var < 100:
        recommendations.append("❌ Image trop floue")
        ocr_feasible = False
    
    if contrast < 30:
        recommendations.append("❌ Contraste insuffisant")
        ocr_feasible = False
    
    if not recommendations:
        recommendations.append("✅ Image adaptée pour OCR")
    
    for rec in recommendations:
        print(f"  {rec}")
    
    print(f"\n🎯 VERDICT: {'✅ OCR POSSIBLE' if ocr_feasible else '❌ OCR DIFFICILE/IMPOSSIBLE'}")
    
    # 6. Extraction d'un échantillon pour visualisation
    if sideboard.shape[1] > 0:
        # Extraire une zone de carte du sideboard
        sample_y = height // 3  # Un tiers depuis le haut
        sample_height = card_height
        sample = sideboard[sample_y:sample_y+sample_height, :]
        
        # Sauvegarder l'échantillon
        sample_path = f"/tmp/sample_{image_path.split('/')[-1]}.png"
        cv2.imwrite(sample_path, sample)
        print(f"\n💾 Échantillon sauvé: {sample_path}")
        print(f"   (zone de {sample.shape[1]}x{sample.shape[0]} pixels)")
    
    return {
        'width': width,
        'height': height,
        'text_height': text_height,
        'sharpness': laplacian_var,
        'contrast': contrast,
        'feasible': ocr_feasible
    }

# Comparer les deux images
if __name__ == "__main__":
    images = [
        "/Volumes/DataDisk/_Projects/screen to deck/image.webp",
        "/Volumes/DataDisk/_Projects/screen to deck/image2.webp"
    ]
    
    results = []
    for img_path in images:
        try:
            result = analyze_image_quality(img_path)
            results.append(result)
        except Exception as e:
            print(f"❌ Erreur avec {img_path}: {e}")
    
    # Comparaison
    if len(results) == 2:
        print("\n" + "="*60)
        print("📊 COMPARAISON DES IMAGES")
        print("="*60)
        
        print(f"\n📐 Résolution:")
        print(f"  • Image 1: {results[0]['width']}x{results[0]['height']}")
        print(f"  • Image 2: {results[1]['width']}x{results[1]['height']}")
        print(f"  • Ratio: {results[0]['width']/results[1]['width']:.1f}x plus grande")
        
        print(f"\n📝 Taille du texte:")
        print(f"  • Image 1: ~{results[0]['text_height']} pixels")
        print(f"  • Image 2: ~{results[1]['text_height']} pixels")
        
        print(f"\n🎯 Faisabilité OCR:")
        print(f"  • Image 1: {'✅ POSSIBLE' if results[0]['feasible'] else '❌ DIFFICILE'}")
        print(f"  • Image 2: {'✅ POSSIBLE' if results[1]['feasible'] else '❌ DIFFICILE'}")