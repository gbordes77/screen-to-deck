#!/usr/bin/env python3
"""
Extrait seulement la zone sideboard (panneau droit) de MTGA
"""

import sys
from PIL import Image
import io
import base64

def extract_sideboard_zone(image_path_or_base64):
    """
    Extrait la zone du sideboard (panneau droit noir) de MTGA
    """
    try:
        # Essayer d'ouvrir comme fichier
        img = Image.open(image_path_or_base64)
    except:
        # Sinon c'est du base64
        image_data = base64.b64decode(image_path_or_base64)
        img = Image.open(io.BytesIO(image_data))
    
    width, height = img.size
    
    # Dans MTGA, le panneau sideboard est à droite
    # Approximativement de x=1450 à x=1920 (pour 1920x1080)
    # Et de y=80 à y=520
    
    # Calculer les proportions pour différentes résolutions
    x_start = int(width * 0.755)  # ~1450/1920
    x_end = width
    y_start = int(height * 0.074)  # ~80/1080
    y_end = int(height * 0.481)    # ~520/1080
    
    # Extraire la zone
    sideboard_zone = img.crop((x_start, y_start, x_end, y_end))
    
    return sideboard_zone

if __name__ == "__main__":
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        zone = extract_sideboard_zone(image_path)
        zone.save('sideboard_zone.jpg')
        print(f"✅ Zone sideboard extraite : sideboard_zone.jpg")
        print(f"   Dimensions : {zone.size}")
    else:
        print("Usage: python extract_sideboard_zone.py <image_path>")