# 🗄️ Guide de Configuration Supabase

Configuration de votre base de données SaaS multi-tenant.

## 📋 Étapes à suivre

### 1. Créer le compte et projet Supabase

1. **Allez sur** : <https://supabase.com>
2. **Cliquez sur "Start your project"**
3. **Connectez-vous avec GitHub** (recommandé)
4. **Créez un nouveau projet** :
   - **Name**: `screen-to-deck-saas`
   - **Database Password**: Générez un mot de passe fort ⚠️ **GARDEZ-LE !**
   - **Region**: `Europe (West)` - Frankfurt
   - **Plan**: `Free` (500MB DB, parfait pour commencer)

⏰ **Création du projet : 2-3 minutes**

### 2. Récupérer les clés API

Une fois le projet créé :

1. **Allez dans** : `Settings` > `API`
2. **Copiez ces 3 valeurs** :
   - **Project URL** : `https://xxx.supabase.co`
   - **Anon (public) key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6...`
   - **Service Role key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6...`

### 3. Configurer les variables d'environnement

Créez ou modifiez `server/.env` :

```bash
# Ajoutez ces lignes avec VOS vraies valeurs :
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

### 4. Appliquer le schéma de base de données

1. **Dans Supabase Dashboard**, allez à : `SQL Editor`
2. **Cliquez sur "New query"**
3. **Copiez tout le contenu** de `supabase/schema.sql`
4. **Collez dans l'éditeur** et cliquez **"Run"**

⚠️ **Important** : Le script crée toute l'architecture SaaS :

- Tables multi-tenant
- Authentification utilisateurs
- Politiques de sécurité
- Données d'exemple

### 5. Vérifier l'installation

Executez le script de test :

```bash
chmod +x scripts/setup-supabase.sh
./scripts/setup-supabase.sh
```

## 🏗️ Architecture créée

### Tables principales

- **`organizations`** : Compagnies/équipes clientes
- **`users`** : Utilisateurs avec rôles
- **`api_keys`** : Clés API pour l'intégration
- **`projects`** : Projets de cartes par organisation  
- **`scans`** : Historique des scans OCR
- **`usage_logs`** : Métriques et facturation
- **`audit_logs`** : Traçabilité des actions

### Fonctionnalités

- 🔐 **Authentification multi-tenant**
- 🛡️ **Row Level Security (RLS)**
- 📊 **Métriques en temps réel**
- 💳 **Gestion des abonnements**
- 📈 **Analytics et reporting**
- 🔑 **Gestion des API keys**

## 🎯 Plans tarifaires configurés

| Plan | Prix/mois | Scans/mois | API calls | Support |
|------|-----------|------------|-----------|---------|
| **Free** | €0 | 100 | 1000 | Community |
| **Pro** | €29 | 2000 | 10000 | Email |
| **Enterprise** | €199 | 20000 | 100000 | Priority |

## ✅ Une fois terminé

Votre plateforme SaaS aura :

- ✅ Base de données multi-tenant
- ✅ Authentification sécurisée
- ✅ Stockage cloud (Cloudflare R2)
- ✅ API REST complète
- ✅ Métriques et analytics
- ✅ Gestion des abonnements

**Infrastructure complète à 95% !** 🚀

---

## 🆘 En cas de problème

### Erreur de connexion

```bash
# Vérifiez vos variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Erreur SQL

- Vérifiez que vous avez utilisé la **Service Role key** (pas l'Anon key)
- Le schéma doit être exécuté avec les permissions admin

### Besoin d'aide

- 📖 Documentation : <https://supabase.com/docs>
- 💬 Discord : <https://discord.supabase.com>
- 🔍 Logs d'erreur dans Supabase Dashboard > Logs

---

**⏭️ Prochaine étape** : Test complet et déploiement de votre SaaS !
