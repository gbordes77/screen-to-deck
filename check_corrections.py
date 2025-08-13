import requests
import time

# Cartes problématiques à vérifier
corrections = [
    # Au lieu de "Otter Token", ce doit être une vraie carte
    "Plumecreed Escort",  # Crée des tokens Otter
    
    # Au lieu de "Armed Raptor"
    "Amped Raptor",  # Carte rouge energy
    
    # Au lieu de "Solemzan"
    "Sokenzan, Crucible of Defiance",  # Terre légendaire rouge
    
    # Autres cartes possibles mal lues
    "Goblin Bombardment",
    "Unstable Amulet",
    "Galvanic Discharge"
]

print("Vérification des corrections...")
print("=" * 50)

for card_name in corrections:
    try:
        response = requests.get(
            f"https://api.scryfall.com/cards/named",
            params={"exact": card_name}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {card_name}")
            print(f"   Type: {data.get('type_line', 'N/A')}")
            print(f"   Mana: {data.get('mana_cost', 'N/A')}")
            if 'oracle_text' in data:
                oracle = data['oracle_text'][:100] + "..." if len(data['oracle_text']) > 100 else data['oracle_text']
                print(f"   Text: {oracle}")
        else:
            print(f"❌ {card_name} - Non trouvée")
            
        time.sleep(0.1)
        print()
        
    except Exception as e:
        print(f"⚠️ {card_name} - Erreur: {e}")

