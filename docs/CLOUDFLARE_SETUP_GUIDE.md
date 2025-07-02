# 🌐 Configuration Cloudflare R2 pour Screen-to-Deck SaaS

## Étape 1 : Créer compte Cloudflare

1. **Aller sur** : <https://dash.cloudflare.com/sign-up>
2. **S'inscrire** avec email + mot de passe
3. **Vérifier email** (check inbox)
4. **Se connecter** : <https://dash.cloudflare.com>

## Étape 2 : Activer Cloudflare R2

1. **Dans le dashboard** → Cliquer **"R2 Object Storage"** (menu gauche)
2. **Cliquer** : **"Create bucket"**
3. **Nom du bucket** : `screen-to-deck-storage`
4. **Région** : **Europe (Frankfurt)** ou **US-East** selon tes utilisateurs
5. **Cliquer** : **"Create bucket"**

## Étape 3 : Créer API Token R2

1. **Aller dans** : **"My Profile"** (coin droit) → **"API Tokens"**
2. **Cliquer** : **"Create Token"**
3. **Sélectionner** : **"Custom token"**

### Configuration du Token

```
Token name: screen-to-deck-r2-token
Permissions:
  - Account: Cloudflare R2:Edit
  - Zone Resources: Include All zones
```

4. **Cliquer** : **"Continue to summary"**
5. **Cliquer** : **"Create Token"**
6. **COPIER LE TOKEN** ⚠️ (ne sera plus affiché !)

## Étape 4 : Obtenir les clés R2

1. **Retourner dans R2** → **"Manage R2 API tokens"**
2. **Cliquer** : **"Create API token"**
3. **Permissions** : **"Object Read & Write"**
4. **TTL** : Laisser par défaut
5. **Cliquer** : **"Create API token"**

### Tu obtiens

- **Access Key ID** : `abc123...`
- **Secret Access Key** : `xyz789...`
- **Account ID** : Visible dans URL ou sidebar

## Étape 5 : Configuration finale

### Informations à noter

```bash
# Cloudflare Account ID
CF_ACCOUNT_ID=your_account_id_here

# R2 Bucket 
R2_BUCKET_NAME=screen-to-deck-storage

# R2 API Keys
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here

# R2 Public URL (auto-généré)
R2_PUBLIC_URL=https://screen-to-deck-storage.account_id.r2.cloudflarestorage.com
```

## Étape 6 : Test de connexion

```bash
# Installer AWS CLI (pour tester R2)
npm install -g aws-cli

# Configurer endpoint R2
aws configure set region auto
aws configure set aws_access_key_id YOUR_R2_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_R2_SECRET_KEY

# Test upload
echo "test" > test.txt
aws s3 cp test.txt s3://screen-to-deck-storage/ --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com

# Si ça marche : ✅ R2 configuré !
```

## 💰 Coûts Cloudflare R2

- **Stockage** : $0.015/GB/mois
- **Transfert** : Gratuit (vs AWS S3 : $0.09/GB)
- **Opérations** : $4.50/million d'opérations
- **Estimation** : ~$20-50/mois pour 1000 utilisateurs actifs

## 🚀 Prochaine étape

Une fois Cloudflare configuré, lancer :

```bash
./scripts/setup-infrastructure.sh
```

Le script te demandera tes clés Cloudflare et configurera tout automatiquement ! ✨
