#!/usr/bin/env python3
"""
🔗 Wrapper EasyOCR pour intégration Node.js
Pont entre le service TypeScript et votre implémentation EasyOCR qui fonctionne
"""

import sys
import json
import argparse
import asyncio
from pathlib import Path

# Import de votre implémentation existante
from ocr_parser_easyocr import MTGOCRParser
from scryfall_service import ScryfallService


async def process_single_image(image_path: str) -> dict:
    """
    Traite une seule image et retourne le résultat en JSON
    Compatible avec votre pipeline EasyOCR existant
    """

    try:
        async with ScryfallService() as scryfall:
            parser = MTGOCRParser(scryfall)
            result = await parser.parse_deck_image(image_path)

            # Extraire la meilleure carte détectée
            best_card = None
            best_confidence = 0.0

            if result.cards:
                for card in result.cards:
                    if card.is_validated and card.confidence > best_confidence:
                        best_card = card
                        best_confidence = card.confidence

                # Si pas de carte validée, prendre la meilleure non-validée
                if not best_card:
                    for card in result.cards:
                        if card.confidence > best_confidence:
                            best_card = card
                            best_confidence = card.confidence

            # Format de retour pour Node.js
            return {
                "success": True,
                "bestCardName": best_card.name if best_card else None,
                "confidence": best_confidence,
                "totalBlocks": len(result.cards),
                "fullText": "\n".join([card.original_text for card in result.cards]),
                "allCards": [
                    {
                        "name": card.name,
                        "quantity": card.quantity,
                        "confidence": card.confidence,
                        "validated": card.is_validated,
                    }
                    for card in result.cards
                ],
                "processingNotes": result.processing_notes or [],
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "bestCardName": None,
            "confidence": 0.0,
            "totalBlocks": 0,
            "fullText": "",
            "allCards": [],
        }


def main():
    """Point d'entrée CLI pour Node.js"""
    parser = argparse.ArgumentParser(description="EasyOCR Wrapper for Node.js")
    parser.add_argument("--image", required=True, help="Path to image file")
    parser.add_argument("--output-json", action="store_true", help="Output JSON format")

    args = parser.parse_args()

    if not Path(args.image).exists():
        result = {
            "success": False,
            "error": f"Image file not found: {args.image}",
            "bestCardName": None,
            "confidence": 0.0,
            "totalBlocks": 0,
            "fullText": "",
            "allCards": [],
        }
    else:
        # Traitement asynchrone
        result = asyncio.run(process_single_image(args.image))

    if args.output_json:
        # Output JSON pour Node.js
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        # Output human-readable pour debug
        if result["success"]:
            print(f"✅ Best card: {result['bestCardName']}")
            print(f"📊 Confidence: {result['confidence']:.1%}")
            print(f"🔍 Total blocks: {result['totalBlocks']}")
            if result["allCards"]:
                print("\n📋 All detected cards:")
                for card in result["allCards"]:
                    status = "✅" if card["validated"] else "❓"
                    print(
                        f"  {status} {card['quantity']}x {card['name']} ({card['confidence']:.1%})"
                    )
        else:
            print(f"❌ Error: {result['error']}")


if __name__ == "__main__":
    main()
