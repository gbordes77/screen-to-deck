# Ongoing Issues – Screen To Deck

## Problématique actuelle (juin 2024)

### Synchronisation logique humaine / bot
- L'analyse humaine permet d'extraire et d'exporter des decks MTGA parfaitement conformes, en appliquant toutes les règles métier (quantités, regroupement, sideboard, etc.).
- Le bot (code Python) applique partiellement ces règles : il peut mal regrouper les cartes du sideboard, ne pas additionner les quantités, ou ne pas respecter strictement les totaux (60/15).
- Des erreurs d'attributs manquants (`confidence_score`, `processing_notes`, etc.) peuvent faire planter le bot.
- L'OCR (pytesseract) peut mal lire certains noms ou chiffres, ce qui n'est pas toujours corrigé automatiquement.
- Les logs ne permettent pas toujours de diagnostiquer précisément où le bot échoue.

**Ce fichier sera mis à jour à chaque nouvelle problématique rencontrée ou résolue.** 