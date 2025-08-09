#!/usr/bin/env node

/**
 * Script sécurisé pour configurer l'API key OpenAI
 * NE JAMAIS commiter ce fichier avec une vraie clé !
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function validateApiKey(key) {
  if (!key || key.trim() === '') {
    return { valid: false, error: 'La clé ne peut pas être vide' };
  }
  
  if (key === 'TO_BE_SET') {
    return { valid: false, error: 'Veuillez entrer votre vraie clé API' };
  }
  
  if (!key.startsWith('sk-')) {
    return { valid: false, error: 'La clé doit commencer par "sk-"' };
  }
  
  if (key.length < 40) {
    return { valid: false, error: 'La clé semble trop courte' };
  }
  
  // Vérifier le format général - Plus flexible pour les nouveaux formats OpenAI
  // Accepte: sk-XXXX, sk-proj-XXXX, sk-proj-XXXX-XXXX, etc.
  const validFormat = /^sk-[a-zA-Z0-9_\-]+/.test(key);
  
  if (!validFormat) {
    return { valid: false, error: 'Format de clé invalide. La clé doit commencer par "sk-"' };
  }
  
  return { valid: true };
}

function updateEnvFile(apiKey) {
  const envPath = path.join(__dirname, '.env');
  
  try {
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Remplacer ou ajouter la clé API
    if (envContent.includes('OPENAI_API_KEY=')) {
      envContent = envContent.replace(
        /OPENAI_API_KEY=.*/,
        `OPENAI_API_KEY=${apiKey}`
      );
    } else {
      envContent += `\nOPENAI_API_KEY=${apiKey}\n`;
    }
    
    // S'assurer que les autres variables sont présentes
    if (!envContent.includes('CORS_ORIGIN=')) {
      envContent += 'CORS_ORIGIN=http://localhost:5173\n';
    }
    
    if (!envContent.includes('VITE_API_URL=')) {
      envContent += 'VITE_API_URL=http://localhost:3001/api\n';
    }
    
    fs.writeFileSync(envPath, envContent);
    return true;
  } catch (error) {
    log(`Erreur lors de la mise à jour du fichier .env: ${error.message}`, 'red');
    return false;
  }
}

function checkGitIgnore() {
  const gitignorePath = path.join(__dirname, '.gitignore');
  
  try {
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      
      if (!gitignoreContent.includes('.env')) {
        log('⚠️  ATTENTION: .env n\'est pas dans .gitignore !', 'yellow');
        log('   Ajout de .env à .gitignore...', 'yellow');
        
        fs.appendFileSync(gitignorePath, '\n# Environment variables\n.env\n.env.local\n.env.*.local\n');
        log('   ✅ .gitignore mis à jour', 'green');
      }
    }
  } catch (error) {
    log('Impossible de vérifier .gitignore', 'yellow');
  }
}

function displayKeyInfo(apiKey) {
  // Hash pour identification sans exposer la clé
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  log('\n📊 Informations sur la clé:', 'blue');
  log(`   Type: ${apiKey.includes('sk-proj-') ? 'Project Key' : 'Legacy Key'}`, 'blue');
  log(`   Longueur: ${apiKey.length} caractères`, 'blue');
  log(`   Début: ${apiKey.substring(0, 7)}...`, 'blue');
  log(`   Fin: ...${apiKey.substring(apiKey.length - 4)}`, 'blue');
  log(`   Hash: ${hash.substring(0, 8)}...`, 'blue');
}

async function main() {
  log('\n🔐 Configuration Sécurisée de l\'API Key OpenAI\n', 'green');
  
  // Vérifier .gitignore
  checkGitIgnore();
  
  // Demander la clé
  rl.question('\n📝 Entrez votre API key OpenAI (elle sera masquée): ', (apiKey) => {
    // Nettoyer l'entrée
    apiKey = apiKey.trim();
    
    // Masquer immédiatement dans le terminal
    process.stdout.write('\033[1A\033[2K');
    log('📝 Entrez votre API key OpenAI: [MASQUÉ]', 'blue');
    
    // Valider la clé
    const validation = validateApiKey(apiKey);
    
    if (!validation.valid) {
      log(`\n❌ Erreur: ${validation.error}`, 'red');
      rl.close();
      process.exit(1);
    }
    
    // Afficher les infos (sans exposer la clé complète)
    displayKeyInfo(apiKey);
    
    // Demander confirmation
    rl.question('\n✅ La clé semble valide. Voulez-vous l\'enregistrer? (o/n): ', (answer) => {
      if (answer.toLowerCase() === 'o' || answer.toLowerCase() === 'oui') {
        if (updateEnvFile(apiKey)) {
          log('\n✅ Configuration réussie !', 'green');
          log('   Le fichier .env a été mis à jour', 'green');
          log('   Vous pouvez maintenant démarrer l\'application avec:', 'green');
          log('   npm run dev', 'blue');
          
          log('\n🔒 Rappels de sécurité:', 'yellow');
          log('   - Ne commitez JAMAIS le fichier .env', 'yellow');
          log('   - Ne partagez JAMAIS votre clé API', 'yellow');
          log('   - Révoquéz la clé si elle est compromise', 'yellow');
          log('   - Utilisez des variables d\'environnement en production', 'yellow');
        } else {
          log('\n❌ Échec de la configuration', 'red');
        }
      } else {
        log('\n❌ Configuration annulée', 'yellow');
      }
      
      rl.close();
    });
  });
}

// Gérer Ctrl+C proprement
process.on('SIGINT', () => {
  log('\n\n❌ Configuration annulée par l\'utilisateur', 'yellow');
  process.exit(0);
});

// Lancer le script
main().catch(error => {
  log(`\n❌ Erreur: ${error.message}`, 'red');
  process.exit(1);
});