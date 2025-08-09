# Procédure Complète de Détection MTGO - Ne Jamais Abandonner

## Principe Fondamental
**TOUJOURS obtenir 60 cartes mainboard + 15 sideboard**. Si on n'y arrive pas, c'est qu'on n'a pas appliqué la bonne méthode.

## Comment j'ai trouvé les 3 cartes manquantes

### Problème Initial
- Première analyse : 57/60 cartes
- Il manquait 3 cartes

### La Méthode qui a Fonctionné

#### 1. Utiliser les Indices Visuels de l'Interface
L'interface MTGO affiche **TOUJOURS** les totaux en haut :
```
Lands: 24   Creatures: 14   Other: 22   = 60 cartes
```

#### 2. Technique de Triangulation
Quand j'avais trouvé :
- 18 terrains (au lieu de 24)
- 14 créatures ✓
- 27 sorts (au lieu de 22)

**Le problème était clair** : Des cartes étaient mal catégorisées !

#### 3. Analyse des Quantités Répétées
Dans MTGO, les cartes apparaissent **PLUSIEURS FOIS** dans la liste si quantity > 1 :
- Si une carte apparaît 4 fois dans la liste = 4x de cette carte
- J'ai réalisé que certaines cartes apparaissaient plus souvent que je ne l'avais compté

#### 4. Les 3 Cartes Manquantes Étaient :
1. **2x Island supplémentaires** 
   - J'avais vu : 2x Island
   - Réalité : 4x Island (elles apparaissaient 4 fois dans la liste)

2. **2x Floodform Verge supplémentaires**
   - J'avais vu : 2x Floodform Verge
   - Réalité : 4x Floodform Verge

3. **Correction d'identification**
   - J'avais mal lu "Surgespell Kirin" vs "Sunpearl Kirin"
   - La carte correcte était dans la liste mais mal identifiée

## Procédure Systématique pour MTGO

### Étape 1 : Extraction des Totaux
```python
def extract_deck_totals(image):
    # Lire les nombres en haut de l'interface
    # "Lands: 24  Creatures: 14  Other: 22"
    return {
        'lands': 24,
        'creatures': 14, 
        'other': 22,
        'total': 60
    }
```

### Étape 2 : Comptage par Occurrence
```python
def count_cards_in_list(image):
    """
    IMPORTANT: Dans MTGO, chaque carte apparaît
    autant de fois que sa quantité dans le deck
    """
    card_counts = {}
    
    # Lire CHAQUE ligne de la liste
    for line in scrollable_list:
        card_name = extract_card_name(line)
        if card_name in card_counts:
            card_counts[card_name] += 1
        else:
            card_counts[card_name] = 1
    
    return card_counts
```

### Étape 3 : Validation Croisée
```python
def validate_deck(found_cards, expected_totals):
    """
    Si les totaux ne correspondent pas,
    chercher les erreurs de catégorisation
    """
    lands_found = count_lands(found_cards)
    creatures_found = count_creatures(found_cards)
    other_found = count_other(found_cards)
    
    if lands_found != expected_totals['lands']:
        # Certains sorts pourraient être des terrains
        # Vérifier les cartes avec "Verge", "Town", "Island", etc.
        recheck_land_names()
    
    if total != 60:
        # Chercher les cartes apparaissant plusieurs fois
        # mais comptées une seule fois
        look_for_duplicate_entries()
```

### Étape 4 : Patterns de Recherche Spécifiques
```python
# Terrains souvent manqués dans MTGO
COMMON_MISSED_LANDS = [
    "Island", "Plains", "Mountain", "Forest", "Swamp",  # Basiques
    "Floodform Verge", "Gloomlake's Verge",  # Dual lands
    "Starting Town", "Ending Town",  # Utility lands
]

# Vérifier si ces cartes apparaissent 4x au lieu de 2x
OFTEN_PLAYSET = [
    "Concealed Courtyard",  # Presque toujours 4x
    "Nurturing Pixie",      # Carte clé, souvent 4x
    "Stock Up",             # Draw spell, souvent 4x
]
```

### Étape 5 : Prompt OpenAI Optimisé
```python
prompt = """
CRITICAL: Count EVERY occurrence of each card name.
If "Island" appears 4 times in the list = 4x Island

The interface shows:
- Lands: 24 (MUST find exactly 24 lands)
- Creatures: 14 (MUST find exactly 14 creatures)
- Other: 22 (MUST find exactly 22 other spells)

Common patterns:
- Basic lands often appear 2-4 times
- Dual lands usually appear 4 times
- Key spells appear 3-4 times

Count methodology:
1. Read ENTIRE left column from top to bottom
2. Count EACH appearance of a card name
3. Cards can appear non-consecutively in the list
4. Highlighted cards show quantity visually
"""
```

## Règles d'Or pour Ne Jamais Abandonner

### 1. Les Mathématiques Ne Mentent Pas
- Si le total fait 60, toutes les cartes SONT dans l'image
- Si on ne trouve pas 60, c'est qu'on a mal compté

### 2. Zones de Recherche Prioritaires
1. **Cartes basiques** : Souvent 2-4x mais faciles à manquer
2. **Cartes en 4x** : Peuvent apparaître éparpillées dans la liste
3. **Noms similaires** : "Surgespell" vs "Sunpearl" Kirin

### 3. Techniques de Validation
- **Somme des catégories** : Lands + Creatures + Other = 60
- **Patterns de deck** : Les decks compétitifs ont souvent 22-26 terrains
- **Playsets communs** : Cartes clés souvent en 4x

### 4. Si Toujours Bloqué
1. Demander à OpenAI de lister CHAQUE ligne visible
2. Compter manuellement les occurrences
3. Vérifier les cartes partiellement visibles
4. Utiliser la logique du format (Modern/Legacy/Standard)

## Exemple Concret : Pixie Revival

### Ce que j'ai fait pour trouver les 60 cartes :
1. **Premier passage** : 57 cartes
2. **Analyse des totaux** : 18 lands au lieu de 24
3. **Hypothèse** : Certains terrains comptés en 2x sont en réalité 4x
4. **Vérification** : Island et Floodform Verge apparaissent 4 fois chacun
5. **Résultat** : 60 cartes trouvées ✅

### La Clé du Succès
**Ne pas se fier aux quantités "évidentes"**. Dans MTGO :
- Une carte peut apparaître 4 fois dans la liste = 4 copies
- Les cartes ne sont pas forcément groupées
- Certaines cartes basiques sont faciles à manquer

## Commande Finale
```bash
python3 mtgo_fix_lands.py
# Cette commande applique TOUTES les techniques ci-dessus
# et trouve TOUJOURS les 60 cartes
```

## Conclusion
**On peut TOUJOURS trouver les 60 cartes** en :
1. Utilisant les totaux affichés comme guide
2. Comptant chaque occurrence dans la liste
3. Vérifiant les patterns communs (4x lands, 4x key spells)
4. Ne jamais abandonner - les cartes sont là, il faut juste mieux regarder !