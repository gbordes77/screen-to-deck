# 🚀 **SPRINT FINAL V1 - SCREEN-TO-DECK**

**Objectif** : V1 production testable par joueurs **CE SOIR**  
**Durée** : 6-8 heures  
**Approche** : Focus sur l'essentiel, suppression du superflu  

---

## 🎯 **ÉTAPES VALIDÉES + COMPLÉMENTS**

### **1. ✅ Config Supabase + intégration .env (30 min)**

**Fichiers créés** :
- `server/.env.complete` - Configuration production complète
- `discord-bot/.env.complete` - Configuration bot Discord

**Actions** :
```bash
# 1. Setup Supabase project
# - Créer projet sur supabase.com
# - Récupérer URL + anon key + service role key
# - Appliquer schema: ./scripts/finalize-supabase-setup.sh

# 2. Copier la config
cp server/.env.complete server/.env
cp discord-bot/.env.complete discord-bot/.env

# 3. Remplir les vraies valeurs
nano server/.env  # SUPABASE_URL, SUPABASE_ANON_KEY, etc.
```

---

### **2. ✅ Config Fly.io + intégration .env (20 min)**

**Fly.toml** déjà optimisé ✅
- Paris (CDG), 4GB RAM, auto-scaling
- Redis intégré, health checks, metrics

**Actions** :
```bash
# 1. Login Fly.io
flyctl auth login

# 2. Créer app
flyctl apps create screen-to-deck

# 3. Setup secrets
flyctl secrets set OPENAI_API_KEY=your-key
flyctl secrets set SUPABASE_URL=your-url
flyctl secrets set SUPABASE_ANON_KEY=your-key

# 4. Premier deploy
flyctl deploy
```

---

### **3. 🎯 Brainstorming Bot - ESSENTIEL SEULEMENT**

**ANALYSE ACTUELLE** (d'après codebase) :

#### **✅ À GARDER (Forte valeur ajoutée)**
- **Scan automatique** : Réaction 📷 sur images → OCR
- **OCR EasyOCR** : Pipeline principal (85% validation)
- **Validation Scryfall** : Correction + métadonnées automatiques
- **Export MTGA/Moxfield** : Formats standards joueurs
- **Boutons interactifs** : Export, stats, analyse
- **Regroupement intelligent** : Anti-doublons via DeckProcessor

#### **❌ À SUPPRIMER (Complexité sans valeur)**
- **Commandes slash complexes** : Garder juste `/scan`
- **Analyses format avancées** : Tier, pricing, legality (V2)
- **Multi-langue OCR** : Juste anglais pour V1
- **Debug images sauvegardées** : Mode debug off en prod
- **Historique scans** : Base simple pour V1
- **Stats bot avancées** : Juste compteurs simples

#### **🎯 BOT V1 SIMPLIFIÉ** 
```python
# Core features seulement:
# 1. React 📷 → Scan automatique
# 2. OCR EasyOCR → Validation Scryfall 
# 3. Export MTGA + Moxfield
# 4. Boutons: Export, New Scan
# 5. Error handling robuste

# SUPPRIMER:
# - Analyses format complexes
# - Stats avancées  
# - Debug modes
# - Commandes admin
# - Multi-langue
```

---

### **4. ✅ Déploiement SaaS (45 min)**

**Pipeline** :
```bash
# 1. Tests locaux
./scripts/test-enhanced-ocr.sh
npm test

# 2. Build + deploy
./scripts/deploy.sh production

# 3. Vérification
flyctl logs --app screen-to-deck
curl https://screen-to-deck.fly.dev/api/health

# 4. Frontend deploy (Cloudflare Pages)
cd client && npm run build
# Upload vers Cloudflare Pages
```

---

### **5. ✅ Tests Complets (30 min)**

**Checklist validation** :
```bash
# Backend API
✅ /api/health → 200 OK
✅ /api/ocr (POST image) → Résultat JSON
✅ Rate limiting fonctionnel
✅ CORS configuré

# Bot Discord  
✅ Bot online sur serveur test
✅ Upload image + réaction 📷 → Scan
✅ Export MTGA généré et valide
✅ Gestion erreurs (image invalide, etc.)

# Infrastructure
✅ Supabase connecté + RLS actif
✅ Redis cache opérationnel  
✅ Monitoring Fly.io actif
✅ Logs propres sans erreurs
```

---

### **6. 🎮 V1 Tests Joueurs (Ce soir)**

**Setup final** :
- Bot invité sur 2-3 serveurs Discord test
- 5-10 joueurs beta testeurs identifiés
- Screenshots deck prêts pour tests
- Monitoring actif pour feedback temps réel

---

## ⚡ **OPTIMISATIONS SPRINT**

### **Parallélisation** :
- **Config Supabase** + **Fly.io** → Simultané (20 min)
- **Simplification bot** pendant **deploy backend** → Gain 30 min
- **Tests** pendant **build frontend** → Gain 15 min

### **Simplifications V1** :
- **Pas de dashboard admin** → V2
- **Pas d'analytics avancées** → V2  
- **Pas de multi-format export** → Juste MTGA/Moxfield
- **Pas de rate limiting sophistiqué** → Simple par IP

---

## 📊 **TIMELINE RÉALISTE**

| Heure | Tâche | Durée | Responsable |
|-------|-------|--------|-------------|
| **14h00** | Config Supabase + .env | 30 min | Setup |
| **14h30** | Config Fly.io + deploy test | 30 min | DevOps |
| **15h00** | Simplification bot | 45 min | Dev |
| **15h45** | Deploy SaaS complet | 45 min | DevOps |
| **16h30** | Tests validation | 30 min | QA |
| **17h00** | Corrections bugs | 60 min | Dev |
| **18h00** | Deploy final + monitoring | 30 min | DevOps |
| **18h30** | Invitations beta testeurs | 30 min | Community |
| **19h00** | **🎯 V1 LIVE TESTS** | ∞ | Joueurs |

---

## 🏆 **DÉFINITION DU SUCCÈS**

### **V1 Validée si** :
✅ Bot Discord répond sur image upload  
✅ OCR détecte au moins 80% des cartes standards  
✅ Export MTGA fonctionne dans Magic Arena  
✅ Pas de crash sur 10 tests consécutifs  
✅ Temps réponse < 10 secondes par scan  
✅ 3+ joueurs confirment utilisabilité  

### **Metrics V1** :
- **Uptime** : >95% sur 2h de tests
- **Précision OCR** : >80% sur screenshots standards
- **Performance** : <10s par scan
- **UX** : Feedback positif majoritaire

---

## 🚨 **CONTINGENCES**

### **Si problème majeur** :
1. **OCR instable** → Fallback Tesseract + Manuel upload
2. **Deploy échoue** → Hébergement VPS temporaire
3. **Bot crash** → Mode dégradé sans features avancées
4. **Tests négatifs** → Report V1 à demain avec fixes prioritaires

---

**🎯 OBJECTIF : V1 fonctionnelle testée par vrais joueurs avant 20h ce soir !** 