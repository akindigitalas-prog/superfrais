#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('\n🔍 Vérification de l\'application Super Frais...\n');

const checks = [];

function check(description, condition, fix = '') {
  const status = condition ? '✅' : '❌';
  checks.push({ description, passed: condition, fix });
  console.log(`${status} ${description}`);
  if (!condition && fix) {
    console.log(`   💡 Solution: ${fix}\n`);
  }
}

check(
  'Node modules installés',
  fs.existsSync('node_modules'),
  'Lancez: npm install'
);

check(
  'Fichier .env existe',
  fs.existsSync('.env'),
  'Créez un fichier .env avec vos identifiants Supabase'
);

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  check(
    'Variable VITE_SUPABASE_URL configurée',
    envContent.includes('VITE_SUPABASE_URL=') && !envContent.includes('votre-projet'),
    'Ajoutez votre vraie URL Supabase dans .env'
  );

  check(
    'Variable VITE_SUPABASE_ANON_KEY configurée',
    envContent.includes('VITE_SUPABASE_ANON_KEY=') && !envContent.includes('votre-cle'),
    'Ajoutez votre vraie clé Supabase dans .env'
  );
}

check(
  'Icône SVG présente',
  fs.existsSync('public/icon.svg'),
  'L\'icône SVG devrait être dans public/icon.svg'
);

check(
  'Icône PNG 192x192 présente',
  fs.existsSync('public/icon-192.png'),
  'Générez l\'icône avec generate-icons.html'
);

check(
  'Icône PNG 512x512 présente',
  fs.existsSync('public/icon-512.png'),
  'Générez l\'icône avec generate-icons.html'
);

check(
  'Manifest PWA présent',
  fs.existsSync('public/manifest.json'),
  'Le manifest devrait être dans public/manifest.json'
);

check(
  'Service Worker présent',
  fs.existsSync('public/sw.js'),
  'Le service worker devrait être dans public/sw.js'
);

check(
  'Fichier de configuration Netlify présent',
  fs.existsSync('netlify.toml'),
  'Le fichier netlify.toml devrait être à la racine'
);

const allPassed = checks.every(c => c.passed);

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('\n🎉 TOUT EST PRÊT!\n');
  console.log('Prochaines étapes:');
  console.log('1. Lancez: npm run build');
  console.log('2. Allez sur: https://app.netlify.com/drop');
  console.log('3. Glissez-déposez le dossier "dist"');
  console.log('4. Profitez de votre application! 🚀\n');
} else {
  console.log('\n⚠️  Certains éléments sont manquants\n');
  console.log('Corrigez les problèmes ci-dessus avant de déployer.\n');
  console.log('Pour plus d\'aide, consultez COMMENCEZ_ICI.md\n');
}

console.log('='.repeat(50) + '\n');

process.exit(allPassed ? 0 : 1);
