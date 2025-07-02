# 💰 **COÛTS OPENAI API - GUIDE COMPLET 2025**

## 🎯 **COÛT RÉEL PAR SCAN MTG**

### **Décomposition d'un scan de deck** :
```
1. 📷 Image upload (1080x1080)
   - Preprocessing: €0.008

2. 🧠 Prompt OCR MTG (200 tokens)
   - Input: 200 × €0.009/1000 = €0.0018

3. 📝 Réponse cartes détectées (150 tokens)  
   - Output: 150 × €0.027/1000 = €0.004

TOTAL: €0.0138 ≈ €0.014 par scan
```

### **🎮 USAGE RÉALISTE BOT DISCORD MTG**

#### **Scénario 1 : Usage Modéré (Recommandé)**
- **100 scans/jour** 
- **Coût quotidien** : 100 × €0.014 = €1.40/jour
- **Coût mensuel** : €42/mois
- **Utilisateurs** : 10-20 joueurs actifs

#### **Scénario 2 : Usage Intensif**
- **500 scans/jour**
- **Coût quotidien** : 500 × €0.014 = €7/jour  
- **Coût mensuel** : €210/mois
- **Utilisateurs** : 50-100 joueurs très actifs

#### **Scénario 3 : Usage Viral (Attention !)**
- **2000 scans/jour**
- **Coût quotidien** : 2000 × €0.014 = €28/jour
- **Coût mensuel** : €840/mois ⚠️
- **Utilisateurs** : 200+ joueurs ou bot populaire

---

## ⚠️ **RISQUES DE COÛTS ÉLEVÉS**

### **🚨 Scenarios Dangereux**

#### **1. Bot Spamming**
```python
# Utilisateur malveillant qui spam le bot
for i in range(1000):
    bot.scan_image(fake_image)  # €14 en quelques minutes !
```

#### **2. Boucles Infinies**
```python
# Bug de code qui relance sans fin
while error:
    try_ocr_again()  # Peut coûter des centaines d'euros
```

#### **3. Images Énormes**
```python
# Images 4K+ qui consomment beaucoup de tokens
huge_image = "8000x6000.png"  # Coût 3-5x plus élevé
```

#### **4. Prompts Verbeux**
```python
# Prompt trop long
prompt = f"""
Analyze this Magic: The Gathering deck image with extreme detail.
Please provide comprehensive analysis including:
- Every single card visible with exact quantities  
- Detailed mana curve analysis
- Format legality for Standard, Modern, Legacy, Vintage
- Competitive viability assessment
- Sideboard recommendations
- Price analysis for each card
- Alternative card suggestions
... (2000+ tokens = coût x10 !)
"""
```

---

## 🛡️ **PROTECTIONS ANTI-EXPLOSION DES COÛTS**

### **1. 🚨 Limites de Sécurité Immédiates**

#### **Limite utilisateur**
```python
# Dans bot.py
USER_DAILY_LIMIT = 10  # Max 10 scans/jour/utilisateur
user_scans = {}

async def check_user_limit(user_id):
    today = date.today()
    if user_scans.get(user_id, {}).get('date') != today:
        user_scans[user_id] = {'date': today, 'count': 0}
    
    if user_scans[user_id]['count'] >= USER_DAILY_LIMIT:
        return False  # Bloqué !
    
    user_scans[user_id]['count'] += 1
    return True
```

#### **Limite globale quotidienne**
```python
DAILY_BUDGET = 50.0  # €50 max par jour
daily_spent = 0.0

async def check_budget():
    global daily_spent
    if daily_spent >= DAILY_BUDGET:
        return False  # Bot en pause !
    return True
```

### **2. 💰 Monitoring Temps Réel**

#### **Compteur de coûts**
```python
async def log_cost(scan_cost):
    global daily_spent
    daily_spent += scan_cost
    
    print(f"💰 Scan coût: €{scan_cost:.3f}")
    print(f"📊 Total aujourd'hui: €{daily_spent:.2f}")
    
    if daily_spent > DAILY_BUDGET * 0.8:  # 80% du budget
        print("⚠️ ALERTE: 80% du budget quotidien atteint !")
```

### **3. ⏱️ Rate Limiting Intelligent**

```python
from collections import defaultdict
import time

# Max 1 scan toutes les 30 secondes par utilisateur
user_last_scan = defaultdict(float)

async def rate_limit_check(user_id):
    now = time.time()
    if now - user_last_scan[user_id] < 30:  # 30 secondes
        return False  # Trop rapide !
    
    user_last_scan[user_id] = now
    return True
```

### **4. 🎯 Optimisation Prompt**

#### **Prompt Minimal Efficace**
```python
# Au lieu de 500+ tokens verbeux
prompt_verbose = """
Please analyze this Magic: The Gathering deck image in extreme detail...
[500+ tokens]
"""

# Utiliser prompt concis
prompt_optimized = """
Extract MTG card names and quantities from this image.
Format: "4 Lightning Bolt, 2 Snapcaster Mage"
"""
# Seulement 20 tokens = coût divisé par 25 !
```

---

## 🔒 **CONFIGURATION SÉCURISÉE .env**

```bash
# Limites de sécurité
OPENAI_DAILY_BUDGET=50.0          # €50 max/jour
USER_DAILY_LIMIT=10               # 10 scans/user/jour
RATE_LIMIT_SECONDS=30             # 30s entre scans
MAX_IMAGE_SIZE=5242880            # 5MB max

# Monitoring
ENABLE_COST_LOGGING=true
ALERT_THRESHOLD=0.8               # Alerte à 80% budget

# Fail-safe
EMERGENCY_STOP=true               # Arrêt auto si budget dépassé
```

---

## 📊 **ESTIMATIONS BUDGET RÉALISTE**

### **Bot Discord Petite Communauté (5-15 joueurs)**
- **Scans/jour** : 20-50
- **Coût/mois** : €8-25
- **Recommandation** : Budget €30/mois = sécurisé

### **Bot Discord Communauté Moyenne (20-50 joueurs)**
- **Scans/jour** : 100-200  
- **Coût/mois** : €42-84
- **Recommandation** : Budget €100/mois = confortable

### **Bot Discord Grande Communauté (50+ joueurs)**
- **Scans/jour** : 300-500
- **Coût/mois** : €126-210
- **Recommandation** : Budget €250/mois + monitoring

### **⚠️ Bot Viral/Public**
- **Scans/jour** : 1000+
- **Coût/mois** : €420+
- **Recommandation** : Rate limiting strict + budget €500/mois

---

## 🎯 **MÉCANISMES DE PROTECTION OPENAI**

### **1. 🛡️ Usage Limits (Protection Native)**
- **Hard limit** : Tu peux définir un plafond mensuel
- **Soft limit** : Alertes par email
- **Organization limits** : Contrôle par équipe

### **2. 📧 Alertes Automatiques**
- **50% budget** : Email d'avertissement  
- **80% budget** : Email urgent
- **100% budget** : API suspendue automatiquement

### **3. 💳 Billing Controls**
- **Prépayé uniquement** : Pas de découvert possible
- **Usage dashboard** : Monitoring temps réel
- **Export détaillé** : Analyse par endpoint

---

## ✅ **CONFIGURATION RECOMMANDÉE V1**

### **Paramètres OpenAI Dashboard**
```
Monthly budget limit: €100
Usage alert at: €50 (50%)
Hard stop at: €100 (100%)
```

### **Protection Bot Discord**
```python
# Configuration conservative V1
SETTINGS = {
    'user_daily_limit': 5,        # 5 scans/user/jour max
    'global_daily_budget': 20.0,  # €20/jour max  
    'rate_limit_seconds': 60,     # 1 scan/minute/user max
    'max_image_size': 2097152,    # 2MB max (réduit coûts)
    'emergency_stop': True        # Arrêt auto si dépassement
}
```

### **🎯 Résultat Protection V1**
- **Coût max théorique** : €20/jour = €600/mois
- **Coût réaliste** : €5-15/jour = €150-450/mois  
- **Protection contre** : Spam, bugs, usage viral
- **Flexibilité** : Ajustable selon besoins

---

## 💡 **CONSEILS FINAUX**

### **✅ FAIRE**
- ✅ **Commencer petit** : Budget €50/mois pour V1
- ✅ **Monitoring actif** : Vérifier coûts quotidiens
- ✅ **Rate limiting** : 1 scan/minute/user max
- ✅ **Prompts optimisés** : 20-50 tokens au lieu de 500+
- ✅ **Images compressées** : <2MB au lieu de 10MB+

### **❌ ÉVITER**
- ❌ **Pas de limites** : Risque explosion coûts
- ❌ **Prompts verbeux** : Coût x10 inutilement
- ❌ **Images 4K+** : Coût x5 sans bénéfice
- ❌ **Pas de monitoring** : Découverte facture à €1000
- ❌ **Pas de rate limiting** : Spam = facture énorme

---

## 🏆 **CONCLUSION COÛTS**

**Pour un bot MTG Discord V1** :
- **Coût réaliste** : €30-100/mois
- **Avec protections** : Impossible de dépasser €150/mois
- **ROI** : Excellent si >20 utilisateurs actifs
- **Risque** : Faible avec les protections recommandées

**🎯 L'API OpenAI est raisonnable SI tu implémentes les protections dès le départ !** 