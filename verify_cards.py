import requests
import time

cards_to_check = [
    "Guide of Souls",
    "Ajani, Nacatl Pariah",
    "Heartfire Hero",
    "Lurrus of the Dream-Den",
    "Otter Token",
    "Plumecreed Escort",
    "Fragment Reality",
    "Battlefield Forge",
    "Galvanic Discharge",
    "Armed Raptor",
    "Inspiring Vantage",
    "Static Prison",
    "Unstable Amulet",
    "Sacred Foundry",
    "Sunbaked Canyon",
    "Aether Hub",
    "Den of the Bugbear",
    "Solemzan, Crucible of Defiance",
    "Elegant Parlor",
    "Portable Hole",
    "Surgical Extraction",
    "Pithing Needle",
    "Stone of Erech",
    "Exorcise",
    "Invasion of Gobakhan"
]

print("Vérification des cartes sur Scryfall...")
print("=" * 50)

for card_name in cards_to_check:
    try:
        # Search for exact card name
        response = requests.get(
            f"https://api.scryfall.com/cards/named",
            params={"exact": card_name}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {card_name} - TROUVÉE")
        elif response.status_code == 404:
            # Try fuzzy search
            search_response = requests.get(
                f"https://api.scryfall.com/cards/search",
                params={"q": card_name}
            )
            if search_response.status_code == 200:
                search_data = search_response.json()
                if search_data.get('data'):
                    suggestions = [card['name'] for card in search_data['data'][:3]]
                    print(f"❌ {card_name} - NON TROUVÉE. Suggestions: {', '.join(suggestions)}")
                else:
                    print(f"❌ {card_name} - NON TROUVÉE, aucune suggestion")
            else:
                print(f"❌ {card_name} - NON TROUVÉE")
        else:
            print(f"⚠️ {card_name} - Erreur {response.status_code}")
            
        time.sleep(0.1)  # Respect rate limit
        
    except Exception as e:
        print(f"⚠️ {card_name} - Erreur: {e}")

print("=" * 50)
print("Vérification terminée")
