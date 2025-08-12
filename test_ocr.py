import base64
import requests
import json
import os

# Load API key
api_key = os.environ.get('OPENAI_API_KEY')
if not api_key:
    print("No API key found")
    exit(1)

# Read and encode image
with open("MTGO_deck_list.png", "rb") as f:
    image_data = base64.b64encode(f.read()).decode()

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
                    "text": """This is an MTGO deck screenshot. The header shows "Pixie revived: 60" with "Lands: 24 Creatures: 14 Other: 22" and "Sideboard: 15".

CRITICAL: You MUST find EXACTLY 60 mainboard cards and 15 sideboard cards.

The mainboard has:
- 24 lands
- 14 creatures  
- 22 other spells

Count EVERY card in the left column. Each line is a card. If a card appears multiple times, count each occurrence.

Return ONLY a JSON object with this exact structure:
{
  "mainboard": [{"name": "Card Name", "quantity": 4}, ...],
  "sideboard": [{"name": "Card Name", "quantity": 2}, ...]
}

Make sure the mainboard sums to EXACTLY 60 cards and sideboard to EXACTLY 15."""
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{image_data}",
                        "detail": "high"
                    }
                }
            ]
        }
    ],
    "max_tokens": 4000,
    "temperature": 0.1
}

response = requests.post(
    "https://api.openai.com/v1/chat/completions",
    headers=headers,
    json=payload
)

if response.status_code == 200:
    result = response.json()
    content = result['choices'][0]['message']['content']
    
    # Try to extract JSON
    import re
    json_match = re.search(r'\{.*\}', content, re.DOTALL)
    if json_match:
        deck_data = json.loads(json_match.group())
        
        mainboard_count = sum(card['quantity'] for card in deck_data.get('mainboard', []))
        sideboard_count = sum(card['quantity'] for card in deck_data.get('sideboard', []))
        
        print(f"Mainboard: {mainboard_count} cards")
        print(f"Sideboard: {sideboard_count} cards")
        print("\nMainboard cards:")
        for card in deck_data.get('mainboard', []):
            print(f"  {card['quantity']}x {card['name']}")
        print("\nSideboard cards:")
        for card in deck_data.get('sideboard', []):
            print(f"  {card['quantity']}x {card['name']}")
    else:
        print("No JSON found in response")
        print(content)
else:
    print(f"Error: {response.status_code}")
    print(response.text)
