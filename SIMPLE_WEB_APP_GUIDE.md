# Guide pour une Web App Simplifiée d'OCR

Ce document décrit comment créer une application web très simple pour tester la fonctionnalité OCR du projet en utilisant un serveur local Node.js et une page web basique.

## 1. Objectif

L'objectif est d'avoir une page web où un utilisateur peut :
1.  Uploader une image de liste de deck.
2.  Cliquer sur un bouton pour envoyer l'image à un serveur local.
3.  Voir le résultat de l'OCR (la liste des cartes) affiché sur la page.

## 2. Architecture Proposée

### a. Backend (Node.js / Express)

- **Emplacement** : Le dossier `/server` existant peut être utilisé comme base.
- **Principe** : Créer un serveur Express qui expose une API pour l'OCR.
- **Étapes** :
    1.  **Créer un endpoint** : Dans `/server/src/routes`, ajoutez un fichier (ex: `ocr.ts`) avec un endpoint `/api/upload`.
    2.  **Gérer l'upload** : Utilisez une bibliothèque comme `multer` pour gérer la réception du fichier image.
    3.  **Appeler le script Python** : Le moyen le plus simple de communiquer avec le moteur OCR est d'appeler le script Python en tant que processus enfant depuis Node.js.
        - Utilisez la fonction `spawn` de `child_process`.
        - Le script Python `discord-bot/ocr_parser_easyocr.py` devra être légèrement modifié pour accepter un chemin d'image en argument de ligne de commande et pour imprimer son résultat au format JSON sur la sortie standard (`stdout`).
    4.  **Retourner le résultat** : Le serveur Node.js capture le JSON de `stdout` du script Python et le renvoie comme réponse de l'API.

#### Exemple de code pour appeler Python (dans `/server/src/services`):
```typescript
import { spawn } from 'child_process';

async function runOcr(imagePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', ['../discord-bot/ocr_parser_easyocr.py', imagePath]);
        
        let result = '';
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
            reject(data.toString());
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve(JSON.parse(result));
            } else {
                reject(`Python script exited with code ${code}`);
            }
        });
    });
}
```

### b. Frontend (HTML / JavaScript)

- **Emplacement** : Le dossier `/client` existant peut être utilisé. Le fichier `index.html` peut être adapté.
- **Principe** : Une page web statique qui communique avec l'API du backend.
- **Éléments de la page** :
    1.  Un `<input type="file" id="image-input">` pour sélectionner l'image.
    2.  Un `<button id="upload-button">Analyser</button>`.
    3.  Une balise `<pre id="results"></pre>` pour afficher le JSON de sortie de manière formatée.

#### Exemple de code JavaScript (dans `client/src/main.tsx` ou un fichier JS simple) :
```javascript
document.getElementById('upload-button').addEventListener('click', async () => {
    const input = document.getElementById('image-input');
    const file = input.files[0];
    if (!file) {
        alert('Veuillez sélectionner une image.');
        return;
    }

    const formData = new FormData();
    formData.append('deckImage', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
        } else {
            const error = await response.text();
            document.getElementById('results').textContent = `Erreur: ${error}`;
        }
    } catch (error) {
        document.getElementById('results').textContent = `Erreur réseau: ${error}`;
    }
});
```

## 3. Mise en place

1.  **Prérequis Python** : Assurez-vous d'avoir un environnement Python fonctionnel pour le bot.
    ```bash
    cd discord-bot
    python -m venv venv
    source venv/bin/activate # ou .\\venv\\Scripts\\activate sur Windows
    pip install -r requirements-frozen.txt
    ```
2.  **Backend** : Lancez le serveur Node.js depuis le dossier `/server`.
    ```bash
    cd server
    npm install
    npm run dev
    ```
3.  **Frontend** : Servez le fichier `index.html` (Vite, le serveur de développement de la partie `client`, le fait déjà).
    ```bash
    cd client
    npm install
    npm run dev
    ```
Accédez à l'URL fournie par le serveur de développement (généralement `http://localhost:5173`). 