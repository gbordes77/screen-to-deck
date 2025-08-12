#!/usr/bin/env python3
"""
Super-Resolution Optimized for MTG Card OCR
Advanced upscaling with parallel processing support
"""
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import sys
import argparse
import os
from concurrent.futures import ThreadPoolExecutor
import time

class OptimizedSuperResolution:
    def __init__(self, use_gpu=False):
        self.use_gpu = use_gpu
        self.target_width = 2400  # Default target for OCR
        
    def advanced_upscale(self, img, target_width=None):
        """
        Upscaling avancé GRATUIT pour atteindre une résolution optimale
        Objectif: Passer de 1575x749 à 2400x1140 (ou plus)
        """
        if target_width is None:
            target_width = self.target_width
        
        h, w = img.shape[:2]
        
        # Intelligent scaling based on original resolution
        if w >= 1200:
            # Already good resolution, minimal upscaling
            scale = min(1.5, target_width / w)
        elif w >= 800:
            # Medium resolution, moderate upscaling
            scale = min(3.0, target_width / w)
        else:
            # Low resolution, aggressive upscaling
            scale = min(4.0, target_width / w)
        
        print(f"📐 Current resolution: {w}x{h}")
        print(f"🎯 Target: {int(w*scale)}x{int(h*scale)}")
        print(f"🔍 Scale factor: {scale:.2f}x")
        
        # Step 1: Progressive multi-scale upscaling
        print("\n⚡ Step 1: Multi-scale upscaling...")
        
        # Upscale progressif pour meilleure qualité
        current = img.copy()
        current_scale = 1.0
        
        while current_scale < scale:
            # Augmenter par étapes de 1.5x max
            step_scale = min(1.5, scale / current_scale)
            new_w = int(current.shape[1] * step_scale)
            new_h = int(current.shape[0] * step_scale)
            
            # Combiner plusieurs méthodes d'interpolation
            cubic = cv2.resize(current, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
            lanczos = cv2.resize(current, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
            linear = cv2.resize(current, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            
            # Moyenne pondérée (Lanczos privilégié pour le texte)
            current = cv2.addWeighted(lanczos, 0.5, cubic, 0.3, 0)
            current = cv2.addWeighted(current, 0.8, linear, 0.2, 0)
            
            current_scale *= step_scale
            print(f"  • Upscaled to {current.shape[1]}x{current.shape[0]}")
        
        # Step 2: Advanced edge enhancement for text
        print("\n🔪 Step 2: Edge enhancement...")
        
        # Apply parallel processing for large images
        if current.shape[0] * current.shape[1] > 2000000:  # > 2MP
            enhanced = self.parallel_edge_enhancement(current)
        else:
            enhanced = self.sequential_edge_enhancement(current)
        
        # Step 3: Contrast enhancement optimized for MTG cards
        print("\n🎨 Step 3: Contrast optimization for OCR...")
        
        # CLAHE sur chaque canal
        lab = cv2.cvtColor(enhanced, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # CLAHE plus agressif pour le texte
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # Step 4: Intelligent denoising
        print("\n🧹 Step 4: Noise reduction...")
        
        # Bilateral filter préserve les edges
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # Step 5: MTG-specific text enhancement
        print("\n📝 Step 5: MTG-specific text optimization...")
        
        # Convertir en gris pour analyse
        gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)
        
        # Seuillage adaptatif pour identifier les zones de texte
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                      cv2.THRESH_BINARY, 11, 2)
        
        # Créer un masque pour les zones de texte
        kernel = np.ones((3,3), np.uint8)
        text_mask = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        text_mask = cv2.morphologyEx(text_mask, cv2.MORPH_OPEN, kernel)
        
        # Appliquer un sharpening supplémentaire sur les zones de texte
        sharpening_kernel = np.array([[-1,-1,-1],
                                      [-1, 9,-1],
                                      [-1,-1,-1]])
        sharpened = cv2.filter2D(denoised, -1, sharpening_kernel)
        
        # Combiner: zones de texte sharp, reste normal
        text_mask_3ch = cv2.cvtColor(text_mask, cv2.COLOR_GRAY2BGR) / 255.0
        final = (sharpened * text_mask_3ch + denoised * (1 - text_mask_3ch)).astype(np.uint8)
        
        print(f"\n✅ Final resolution: {final.shape[1]}x{final.shape[0]}")
        print(f"📈 Improvement: {final.shape[1]/w:.1f}x")
        
        return final
    
    def sequential_edge_enhancement(self, img):
        """Standard edge enhancement"""
        pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        pil_img = pil_img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
        pil_img = pil_img.filter(ImageFilter.EDGE_ENHANCE_MORE)
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    
    def parallel_edge_enhancement(self, img):
        """Parallel edge enhancement for large images"""
        h, w = img.shape[:2]
        tile_size = 512
        tiles = []
        
        # Split image into tiles
        for y in range(0, h, tile_size):
            for x in range(0, w, tile_size):
                tile = img[y:min(y+tile_size, h), x:min(x+tile_size, w)]
                tiles.append((x, y, tile))
        
        # Process tiles in parallel
        with ThreadPoolExecutor(max_workers=4) as executor:
            processed_tiles = list(executor.map(self.process_tile, tiles))
        
        # Reconstruct image
        result = np.zeros_like(img)
        for x, y, tile in processed_tiles:
            h_tile, w_tile = tile.shape[:2]
            result[y:y+h_tile, x:x+w_tile] = tile
        
        return result
    
    def process_tile(self, tile_data):
        """Process a single tile"""
        x, y, tile = tile_data
        enhanced = self.sequential_edge_enhancement(tile)
        return (x, y, enhanced)
    
    def process_image(self, input_path, output_path=None):
        """Process image with optimized super-resolution"""
        start_time = time.time()
        
        # Load image
        img = cv2.imread(input_path)
        if img is None:
            raise ValueError(f"Could not load image: {input_path}")
        
        h, w = img.shape[:2]
        print(f"\n📊 Input: {w}x{h}")
        
        # Check if super-resolution is needed
        if w < 1200:
            print(f"  ⚠️ Low resolution detected")
            print(f"  ➡️ Applying super-resolution...")
            
            # Apply super-resolution
            img = self.advanced_upscale(img)
            
            # Save output
            if output_path:
                cv2.imwrite(output_path, img)
                print(f"\n💾 Saved to: {output_path}")
            else:
                # Default output path
                base_name = os.path.splitext(os.path.basename(input_path))[0]
                output_path = f"{base_name}_sr.png"
                cv2.imwrite(output_path, img)
                print(f"\n💾 Saved to: {output_path}")
        else:
            print(f"  ✅ Resolution sufficient, minimal processing")
            # Apply minimal enhancement
            img = self.sequential_edge_enhancement(img)
            if output_path:
                cv2.imwrite(output_path, img)
        
        elapsed = time.time() - start_time
        print(f"\n⏱️ Processing time: {elapsed:.2f}s")
        
        return output_path if output_path else input_path

def main():
    """Main entry point for command-line usage"""
    parser = argparse.ArgumentParser(description='MTG Card Image Super-Resolution')
    parser.add_argument('input', help='Input image path')
    parser.add_argument('output', nargs='?', help='Output image path (optional)')
    parser.add_argument('--target-width', type=int, default=2400, help='Target width (default: 2400)')
    parser.add_argument('--gpu', action='store_true', help='Use GPU acceleration if available')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"❌ Error: Input file not found: {args.input}")
        sys.exit(1)
    
    # Create processor
    processor = OptimizedSuperResolution(use_gpu=args.gpu)
    processor.target_width = args.target_width
    
    try:
        print("\n" + "="*60)
        print("🚀 MTG CARD IMAGE SUPER-RESOLUTION")
        print("="*60)
        
        # Process image
        output = processor.process_image(args.input, args.output)
        
        print("\n✅ Success!")
        print(f"💾 Output: {output}")
        
        # Show improvements
        input_img = cv2.imread(args.input)
        output_img = cv2.imread(output)
        
        if input_img is not None and output_img is not None:
            input_h, input_w = input_img.shape[:2]
            output_h, output_w = output_img.shape[:2]
            
            print("\n📊 Statistics:")
            print(f"  • Input:  {input_w}x{input_h}")
            print(f"  • Output: {output_w}x{output_h}")
            print(f"  • Scale:  {output_w/input_w:.2f}x")
            
            # Calculate file sizes
            input_size = os.path.getsize(args.input) / 1024
            output_size = os.path.getsize(output) / 1024
            print(f"\n📁 File sizes:")
            print(f"  • Input:  {input_size:.1f} KB")
            print(f"  • Output: {output_size:.1f} KB")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())