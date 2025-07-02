#!/usr/bin/env node

/**
 * Test rapide de la configuration Supabase
 * Usage: node scripts/test-supabase-config.js
 */

const https = require('https');

function loadEnvFile() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const envFile = path.join(__dirname, '../server/.env');
    const content = fs.readFileSync(envFile, 'utf8');
    
    const config = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        config[match[1].trim()] = match[2].trim();
      }
    });
    
    return config;
  } catch (error) {
    console.error('❌ Impossible de lire server/.env');
    console.log('💡 Créez le fichier server/.env avec vos clés Supabase');
    process.exit(1);
  }
}

function testSupabaseConnection(config) {
  return new Promise((resolve) => {
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      console.error('❌ Variables SUPABASE_URL ou SUPABASE_ANON_KEY manquantes');
      resolve(false);
      return;
    }
    
    const url = new URL(config.SUPABASE_URL + '/rest/v1/');
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'apikey': config.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Connexion Supabase API réussie');
        resolve(true);
      } else {
        console.log(`❌ Erreur API Supabase: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.log(`❌ Erreur de connexion: ${error.message}`);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Timeout de connexion');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

function testDatabaseTables(config) {
  return new Promise((resolve) => {
    if (!config.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY manquante, impossible de tester les tables');
      resolve(false);
      return;
    }
    
    const url = new URL(config.SUPABASE_URL + '/rest/v1/organizations?select=count');
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': config.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Table organizations accessible');
          resolve(true);
        } else {
          console.log(`❌ Table organizations non accessible: ${res.statusCode}`);
          console.log('💡 Avez-vous appliqué le schéma SQL dans Supabase Dashboard?');
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Erreur test tables: ${error.message}`);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Timeout test tables');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function main() {
  console.log('🧪 Test de configuration Supabase\n');
  
  // Charger la configuration
  console.log('📋 Chargement de la configuration...');
  const config = loadEnvFile();
  
  // Vérifier les variables essentielles
  console.log('🔍 Vérification des variables d\'environnement...');
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const optionalVars = ['SUPABASE_SERVICE_ROLE_KEY'];
  
  let allRequired = true;
  
  requiredVars.forEach(varName => {
    if (config[varName]) {
      console.log(`✅ ${varName}: configuré`);
    } else {
      console.log(`❌ ${varName}: manquant`);
      allRequired = false;
    }
  });
  
  optionalVars.forEach(varName => {
    if (config[varName]) {
      console.log(`✅ ${varName}: configuré`);
    } else {
      console.log(`⚠️  ${varName}: manquant (optionnel pour ce test)`);
    }
  });
  
  if (!allRequired) {
    console.log('\n❌ Configuration incomplète');
    console.log('💡 Ajoutez les variables manquantes dans server/.env');
    process.exit(1);
  }
  
  console.log('\n🔗 Test de connexion API...');
  const connectionOk = await testSupabaseConnection(config);
  
  if (!connectionOk) {
    console.log('\n❌ Échec de connexion Supabase');
    console.log('💡 Vérifiez vos clés API dans Supabase Dashboard > Settings > API');
    process.exit(1);
  }
  
  console.log('\n🗄️  Test des tables...');
  const tablesOk = await testDatabaseTables(config);
  
  console.log('\n📊 Résumé:');
  console.log(`   • Connexion API: ${connectionOk ? '✅' : '❌'}`);
  console.log(`   • Tables SaaS: ${tablesOk ? '✅' : '❌'}`);
  
  if (connectionOk && tablesOk) {
    console.log('\n🎉 Configuration Supabase validée !');
    console.log('\n✅ Votre plateforme SaaS est prête:');
    console.log('   • Base de données multi-tenant');
    console.log('   • Authentification sécurisée');
    console.log('   • API REST fonctionnelle');
    console.log('   • Stockage Cloudflare R2');
    console.log('\n🚀 Prochaine étape: Déploiement !');
  } else if (connectionOk && !tablesOk) {
    console.log('\n⚠️  API fonctionnelle mais tables manquantes');
    console.log('\n📋 Actions requises:');
    console.log('   1. Allez dans Supabase Dashboard > SQL Editor');
    console.log('   2. Copiez le contenu de supabase/schema.sql');
    console.log('   3. Exécutez le script SQL');
    console.log('   4. Relancez ce test');
  } else {
    console.log('\n❌ Configuration à corriger');
    console.log('\n📖 Guide: SUPABASE_SETUP_GUIDE.md');
  }
}

main(); 