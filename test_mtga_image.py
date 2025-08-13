import base64
import requests
import json
import os

# Load API key
api_key = os.environ.get('OPENAI_API_KEY')
if not api_key:
    print("No API key found")
    exit(1)

# The image was provided by the user
print("Analyzing MTGA deck image...")

# Prepare request
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {api_key}"
}

payload = {
    "model": "gpt-4o",
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": """Extract ALL cards from this MTG Arena deck screenshot.

The deck is called "Boros Energy" with 60/60 cards mainboard and 15 cards sideboard.

List EVERY card visible with their exact quantities (x1, x2, x3, x4 shown on the cards).

Return a formatted list:
MAINBOARD (60 cards):
- [quantity]x [card name]

SIDEBOARD (15 cards):
- [quantity]x [card name]

Be precise with card names and quantities."""
                }
            ]
        }
    ],
    "max_tokens": 2000,
    "temperature": 0.1
}

# Note: Since the image was provided directly by the user, we would need to process it
# For now, I'll manually extract what I can see in the image