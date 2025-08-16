#!/usr/bin/env python3
"""
Wrapper pour appeler EasyOCR depuis Node.js via stdin/stdout
Compatible avec l'implémentation du 9 août 2025
"""

import sys
import json
import base64
import tempfile
import os

# Mode simple pour débogage rapide - utilise OpenAI
if '--stdin-base64' in sys.argv:
    try:
        # Lire l'image base64 depuis stdin
        base64_data = sys.stdin.read()
        
        # Pour l'instant, retourner un résultat vide qui forcera l'utilisation d'OpenAI
        # Ceci est temporaire pour permettre au système de fonctionner
        result = {
            "mainboard": [],
            "sideboard": []
        }
        
        # Retourner le JSON
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        # En cas d'erreur, retourner un JSON vide
        print(json.dumps({"mainboard": [], "sideboard": []}))
        sys.exit(1)
else:
    print(json.dumps({"error": "Missing --stdin-base64 flag"}))
    sys.exit(1)