# 🚀 Guide Complet : Création des Comptes SaaS

## ⏱️ Temps total : 15 minutes

### 📋 Ordre optimal de création

1. **Supabase** (5 min) - Base de données + Auth
2. **Fly.io** (3 min) - Hébergement + déploiement  
3. **Cloudflare** (7 min) - Storage R2 + CDN

---

## 1️⃣ **SUPABASE** (Base de données + Auth)

### Création du compte (2 min)

1. **Aller sur** : <https://supabase.com>
2. **Cliquer** : **"Start your project"**
3. **Sign up** avec GitHub ou email
4. **Vérifier email** si nécessaire

### Créer projet (3 min)

1. **Cliquer** : **"New Project"**
2. **Organization** : Créer ou sélectionner
3. **Nom projet** : `screen-to-deck-saas`
4. **Database Password** : Générer un mot de passe fort ⚠️
5. **Région** : **Europe (Frankfurt)** (proche de tes utilisateurs)
6. **Plan** : **Free** pour commencer
7. **Cliquer** : **"Create new project"**

### Informations à noter

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ... (dans Settings > API)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (dans Settings > API)
```

---

## 2️⃣ **FLY.IO** (Hébergement global)

### Création du compte (1 min)

1. **Aller sur** : <https://fly.io>
2. **Cliquer** : **"Sign Up"**
3. **Sign up** avec GitHub (recommandé) ou email
4. **Confirmer** ton email

### Configuration initiale (2 min)

1. **Installer Fly CLI** :

   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login** :

   ```bash
   flyctl auth login
   ```

3. **Ajouter carte bancaire** (requis même pour plan gratuit)
   - Dashboard → Billing → Add payment method
   - **Rassuré** : Plan gratuit inclus !

### Informations à noter

- **Account** : Ton username Fly.io
- **API Token** : Généré automatiquement lors du login

---

## 3️⃣ **CLOUDFLARE** (Storage + CDN)

### ⚠️ **GUIDE DÉTAILLÉ CRÉÉ** → `docs/CLOUDFLARE_SETUP_GUIDE.md`

**Résumé rapide :**

1. **Compte** : <https://dash.cloudflare.com/sign-up>
2. **Activer R2** : Dashboard → R2 Object Storage
3. **Créer bucket** : `screen-to-deck-storage`
4. **Générer API tokens** : 2 tokens nécessaires
5. **Noter Account ID + Access Keys**

---

## 🎯 **APRÈS CRÉATION DES COMPTES**

### Étape suivante : Configuration automatique

```bash
# Lancer le script de setup
./scripts/setup-infrastructure.sh
```

**Le script te demandera :**

- ✅ Supabase : URL + Keys
- ✅ Fly.io : Connexion automatique  
- ✅ Cloudflare : Account ID + R2 Keys

### Alternative : Configuration manuelle

```bash
# Copier le template
cp server/env.example server/.env

# Éditer avec tes informations
nano server/.env
```

---

## 💰 **Coûts prévisionnels**

### Plans gratuits inclus

- **Supabase** : 500MB + 2GB transfert/mois
- **Fly.io** : 3 apps + 160h/mois
- **Cloudflare** : 10GB/mois R2

### Scale payante (après succès)

- **Supabase Pro** : $25/mois (DB illimitée)
- **Fly.io** : ~$5-20/mois selon trafic
- **Cloudflare R2** : ~$20-50/mois selon stockage

**Total début** : **0€/mois** → Commence gratuitement ! ✨

---

## 🆘 **Problèmes fréquents**

### Supabase

- **Projet ne se créé pas** → Essayer autre région
- **Keys introuvables** → Settings > API > Reveal

### Fly.io  

- **CLI installation échoue** → Utiliser Homebrew : `brew install flyctl`
- **Login ne marche pas** → Vérifier email de confirmation

### Cloudflare

- **R2 non disponible** → Vérifier si compte vérifié (email + phone)
- **Bucket creation échoue** → Essayer nom différent

---

## ✅ **Checklist finale**

Avant de lancer `./scripts/setup-infrastructure.sh` :

- [ ] ✅ Supabase : Projet créé + Keys copiées
- [ ] ✅ Fly.io : Account créé + CLI installé + Logged in  
- [ ] ✅ Cloudflare : Compte créé + R2 activé + Bucket créé + API Keys

**🚀 Une fois tout coché → GO ! Infrastructure automatique !**
