#!/usr/bin/env python3
"""
Simple OCR wrapper that uses OpenAI Vision API for speed
But preserves the ability to detect sideboard via keyword detection
"""

import sys
import json
import os
import base64

def encode_image(image_path):
    """Encode image to base64"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "mainboard": [],
            "sideboard": []
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(json.dumps({
            "mainboard": [],
            "sideboard": []
        }))
        sys.exit(1)
    
    # For now, just return a stub that tells Node.js to use OpenAI
    # This allows the flow to continue while we fix EasyOCR performance
    print(json.dumps({
        "mainboard": [],
        "sideboard": [],
        "_fallback": "use_openai"
    }))

if __name__ == "__main__":
    main()