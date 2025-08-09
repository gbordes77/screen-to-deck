# 🔐 Guide de Sécurisation API Key OpenAI

## ⚠️ IMPORTANT : NE JAMAIS
- ❌ Commiter l'API key dans Git
- ❌ La hardcoder dans le code
- ❌ La partager publiquement
- ❌ La logger dans les fichiers

---

## 📋 Méthode 1 : Configuration Locale (.env)

### 1. Créer/Modifier le fichier `.env`
```bash
# Dans le dossier racine du projet
touch .env
```

### 2. Ajouter votre clé (remplacez par votre vraie clé)
```bash
# .env
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXX
```

### 3. Vérifier que `.env` est dans `.gitignore`
```bash
# .gitignore
.env
.env.local
.env.*.local
*.env
```

### 4. Vérifier dans le code server
```javascript
// server/src/config/validateEnv.ts
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'TO_BE_SET') {
  throw new Error('OPENAI_API_KEY is required and must be valid');
}
```

---

## 📋 Méthode 2 : Variable d'Environnement Système (Plus Sécurisé)

### Sur macOS/Linux :
```bash
# Ajouter dans ~/.zshrc ou ~/.bashrc
export OPENAI_API_KEY="sk-proj-XXXXXXXXXXXXXXXXXXXX"

# Recharger
source ~/.zshrc
```

### Sur Windows :
```powershell
# PowerShell Admin
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY','sk-proj-XXXX','User')
```

---

## 📋 Méthode 3 : Gestionnaire de Secrets (Production)

### Option A : Utiliser un fichier .env.vault
```bash
# Installer dotenv-vault
npm install --save-dev dotenv-vault

# Créer un vault chiffré
npx dotenv-vault new
npx dotenv-vault login
npx dotenv-vault push

# Le fichier .env.vault peut être commité (chiffré)
```

### Option B : macOS Keychain
```bash
# Stocker dans Keychain
security add-generic-password -s "MTG_OPENAI_KEY" -a "$USER" -w "sk-proj-XXXX"

# Récupérer dans le code
security find-generic-password -s "MTG_OPENAI_KEY" -w
```

---

## 🛡️ Script de Validation Sécurisé

Créez ce script pour valider votre configuration :

```javascript
// scripts/validate-api-key.js
const crypto = require('crypto');

function validateApiKey() {
  const key = process.env.OPENAI_API_KEY;
  
  if (!key) {
    console.error('❌ OPENAI_API_KEY not found');
    return false;
  }
  
  if (key === 'TO_BE_SET') {
    console.error('❌ OPENAI_API_KEY still has default value');
    return false;
  }
  
  if (!key.startsWith('sk-')) {
    console.error('❌ Invalid API key format');
    return false;
  }
  
  // Hash pour log sans exposer la clé
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  console.log('✅ API Key configured');
  console.log('   Hash:', hash.substring(0, 8) + '...');
  console.log('   Length:', key.length);
  
  return true;
}

validateApiKey();
```

---

## 🔒 Configuration Backend Sécurisée

```typescript
// server/src/config/secureConfig.ts
import * as crypto from 'crypto';

class SecureConfig {
  private static instance: SecureConfig;
  private encryptedKey: string;
  private cipher: crypto.Cipher;
  
  private constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!this.validateKey(apiKey)) {
      throw new Error('Invalid API key configuration');
    }
    
    // Chiffrer en mémoire
    const secret = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    this.cipher = crypto.createCipheriv('aes-256-cbc', secret, iv);
    
    this.encryptedKey = this.encrypt(apiKey);
    
    // Nettoyer la variable d'environnement de la mémoire
    delete process.env.OPENAI_API_KEY;
  }
  
  private validateKey(key: string | undefined): boolean {
    return !!(key && 
             key !== 'TO_BE_SET' && 
             key.startsWith('sk-') && 
             key.length > 20);
  }
  
  private encrypt(text: string): string {
    let encrypted = this.cipher.update(text, 'utf8', 'hex');
    encrypted += this.cipher.final('hex');
    return encrypted;
  }
  
  private decrypt(): string {
    // Déchiffrer uniquement quand nécessaire
    // Implémenter la logique de déchiffrement
    return this.encryptedKey; // Simplified
  }
  
  public static getInstance(): SecureConfig {
    if (!SecureConfig.instance) {
      SecureConfig.instance = new SecureConfig();
    }
    return SecureConfig.instance;
  }
  
  public getApiKey(): string {
    // Retourner la clé déchiffrée uniquement pour l'usage
    return this.decrypt();
  }
  
  // Ne jamais logger la clé complète
  public getObfuscatedKey(): string {
    const key = this.decrypt();
    return `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
  }
}

export default SecureConfig;
```

---

## 🚀 Utilisation dans le Code

```typescript
// server/src/services/openai.service.ts
import OpenAI from 'openai';
import SecureConfig from '../config/secureConfig';

class OpenAIService {
  private client: OpenAI;
  
  constructor() {
    const config = SecureConfig.getInstance();
    
    this.client = new OpenAI({
      apiKey: config.getApiKey(),
      // Ajouter timeout et retry
      timeout: 30000,
      maxRetries: 3,
    });
    
    console.log('OpenAI initialized with key:', config.getObfuscatedKey());
  }
  
  async processImage(imageBuffer: Buffer) {
    try {
      // Utiliser l'API
      const response = await this.client.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all Magic: The Gathering card names from this image"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });
      
      return response;
    } catch (error) {
      // Ne jamais logger l'erreur complète (peut contenir la clé)
      console.error('OpenAI API Error:', {
        message: error.message,
        status: error.status,
        type: error.type
      });
      throw new Error('OCR processing failed');
    }
  }
}
```

---

## 🔍 Vérification Finale

### 1. Tester la configuration
```bash
# Depuis la racine du projet
node scripts/validate-api-key.js
```

### 2. Vérifier que la clé n'est pas exposée
```bash
# Rechercher des fuites potentielles
grep -r "sk-" . --exclude-dir=node_modules --exclude-dir=.git
```

### 3. Vérifier les logs
```bash
# S'assurer qu'aucun log ne contient la clé
grep -r "OPENAI_API_KEY" . --exclude-dir=node_modules
```

---

## 🎯 Checklist de Sécurité

- [ ] API key dans `.env` ou variable système
- [ ] `.env` dans `.gitignore`
- [ ] Validation au démarrage
- [ ] Pas de clé dans les logs
- [ ] Pas de clé dans les commits Git
- [ ] Chiffrement en mémoire (production)
- [ ] Rate limiting configuré
- [ ] Monitoring des usages API
- [ ] Rotation régulière de la clé

---

## 🆘 En Cas de Fuite

Si votre clé est compromise :

1. **Révoquer immédiatement** sur https://platform.openai.com/api-keys
2. **Générer une nouvelle clé**
3. **Mettre à jour** votre configuration
4. **Vérifier les logs** d'utilisation non autorisée
5. **Auditer** le code pour la source de la fuite

---

## 📚 Ressources

- [OpenAI API Keys Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)