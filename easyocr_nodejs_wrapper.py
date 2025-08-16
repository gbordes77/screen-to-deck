#!/usr/bin/env python3
"""
Wrapper script for Node.js to use the EasyOCR parser
Returns JSON with both mainboard and sideboard cards
"""

import sys
import json
import os
import logging
import asyncio

# Add the discord-bot directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'discord-bot'))

from ocr_parser_easyocr import MTGOCRParser
from scryfall_service import ScryfallService

# Suppress logging for clean JSON output
logging.basicConfig(level=logging.ERROR)

async def process_image(image_path):
    """Process the image and return the parsed cards"""
    # Initialize services
    scryfall_service = ScryfallService()
    
    # Initialize parser with Scryfall service
    parser = MTGOCRParser(scryfall_service)
    
    # Process image using the async method
    result = await parser.parse_deck_image(image_path)
    
    return result

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "No image path provided"
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(json.dumps({
            "success": False,
            "error": f"Image not found: {image_path}"
        }))
        sys.exit(1)
    
    try:
        # Run async function
        result = asyncio.run(process_image(image_path))
        
        # Format output for Node.js
        mainboard = []
        sideboard = []
        
        for card in result.cards:
            card_data = {
                "name": card.name,
                "quantity": card.quantity
            }
            
            if card.is_sideboard:
                sideboard.append(card_data)
            else:
                mainboard.append(card_data)
        
        # Output JSON in the format expected by parseCardsFromResponse
        output = {
            "mainboard": mainboard,
            "sideboard": sideboard
        }
        
        # Print as compact JSON for Node.js to parse
        print(json.dumps(output, separators=(',', ':')))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "mainboard": [],
            "sideboard": []
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()