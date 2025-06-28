import csv
import json
from typing import List, Tuple

# Exemple de deck avec set (à remplacer par l'import réel)
DECK = [
    ("Lightning Bolt", 4, "2XM"),
    ("Counterspell", 2, "MH2"),
]
SIDEBOARD = [
    ("Surgical Extraction", 2, "NPH"),
]

def export_csv(deck: List[Tuple[str, int, str]], sideboard: List[Tuple[str, int, str]], path="deck_export.csv"):
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["section", "name", "quantity", "set"])
        for name, qty, set_code in deck:
            writer.writerow(["main", name, qty, set_code])
        for name, qty, set_code in sideboard:
            writer.writerow(["sideboard", name, qty, set_code])
    print(f"Exporté en CSV : {path}")

def export_json(deck: List[Tuple[str, int, str]], sideboard: List[Tuple[str, int, str]], path="deck_export.json"):
    data = {
        "main": [{"name": n, "quantity": q, "set": s} for n, q, s in deck],
        "sideboard": [{"name": n, "quantity": q, "set": s} for n, q, s in sideboard],
    }
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Exporté en JSON : {path}")

def export_moxfield(deck: List[Tuple[str, int, str]], sideboard: List[Tuple[str, int, str]], path="deck_export_moxfield.txt"):
    with open(path, "w") as f:
        for name, qty, set_code in deck:
            f.write(f"{qty}x {name} ({set_code})\n")
        f.write("\nSideboard\n")
        for name, qty, set_code in sideboard:
            f.write(f"{qty}x {name} ({set_code})\n")
    print(f"Exporté en Moxfield : {path}")

if __name__ == "__main__":
    export_csv(DECK, SIDEBOARD)
    export_json(DECK, SIDEBOARD)
    export_moxfield(DECK, SIDEBOARD) 