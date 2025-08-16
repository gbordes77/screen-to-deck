#!/usr/bin/env python3
"""
✅ WRAPPER FINAL EASYOCR avec STDIN
Intègre vraiment EasyOCR avec support --stdin-base64
Détection automatique MTGA/MTGO avec zones
"""

import sys
import json
import base64
import tempfile
import os
import asyncio
from pathlib import Path

# Ajouter le répertoire discord-bot au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'discord-bot'))

# Import des modules Discord bot
from ocr_parser_easyocr import MTGOCRParser, UltraAdvancedOCR
from scryfall_service import ScryfallService
from deck_processor import DeckProcessor

async def process_with_easyocr(image_path):
    """
    Process image with EasyOCR and return formatted results
    """
    result = {
        "mainboard": [],
        "sideboard": [],
        "confidence": 0.0,
        "raw_text": ""
    }
    
    try:
        # Initialize services
        scryfall_service = ScryfallService()
        await scryfall_service.__aenter__()
        
        parser = MTGOCRParser(scryfall_service)
        
        # Process the image
        parse_result = await parser.parse_deck_image(image_path)
        
        # Extract mainboard cards
        mainboard_cards = []
        sideboard_cards = []
        
        if parse_result and parse_result.cards:
            for card in parse_result.cards:
                card_data = {
                    "name": card.name,
                    "quantity": card.quantity,
                    "confidence": card.confidence
                }
                
                if card.is_sideboard:
                    sideboard_cards.append(card_data)
                else:
                    mainboard_cards.append(card_data)
            
            # Calculate average confidence
            confidences = [c.confidence for c in parse_result.cards if c.confidence > 0]
            if confidences:
                result["confidence"] = sum(confidences) / len(confidences)
        
        # Format the result
        result["mainboard"] = mainboard_cards
        result["sideboard"] = sideboard_cards
        
        # Add raw text if available
        if hasattr(parse_result, 'raw_text'):
            result["raw_text"] = parse_result.raw_text
        
        # Cleanup
        await scryfall_service.__aexit__(None, None, None)
        
        return result
        
    except Exception as e:
        print(f"Error in EasyOCR processing: {e}", file=sys.stderr)
        return result

def main():
    """
    Main entry point for stdin processing
    """
    if '--stdin-base64' not in sys.argv:
        print(json.dumps({"error": "Missing --stdin-base64 flag"}))
        sys.exit(1)
    
    try:
        # Read base64 image from stdin
        base64_data = sys.stdin.read().strip()
        
        if not base64_data:
            print(json.dumps({"mainboard": [], "sideboard": [], "error": "No input data"}))
            sys.exit(1)
        
        # Decode base64 to image
        image_data = base64.b64decode(base64_data)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
            tmp_file.write(image_data)
            tmp_path = tmp_file.name
        
        try:
            # Process with EasyOCR
            result = asyncio.run(process_with_easyocr(tmp_path))
            
            # Output JSON result
            print(json.dumps(result))
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
    except Exception as e:
        print(json.dumps({
            "mainboard": [],
            "sideboard": [],
            "error": str(e)
        }), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()