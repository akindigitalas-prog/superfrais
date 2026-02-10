# Guide de Déploiement - Super Frais

## Étape 1: Déployer l'application sur Netlify (GRATUIT)

### Option A: Déploiement via GitHub (Recommandé)

1. **Créer un compte GitHub** (si vous n'en avez pas)
   - Allez sur https://github.com
   - Cliquez sur "Sign up"

2. **Créer un nouveau repository**
   - Cliquez sur le bouton "+" en haut à droite
   - Sélectionnez "New repository"
   - Donnez un nom (ex: "super-frais")
   - Cliquez sur "Create repository"

3. **Pousser votre code sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/VOTRE_USERNAME/super-frais.git
   git push -u origin main
   ```

4. **Créer un compte Netlify**
   - Allez sur https://netlify.com
   - Cliquez sur "Sign up" et connectez-vous avec GitHub

5. **Déployer sur Netlify**
   - Dans Netlify, cliquez sur "Add new site" > "Import an existing project"
   - Sélectionnez "GitHub"
   - Choisissez votre repository "super-frais"
   - Laissez les paramètres par défaut (ils seront automatiquement détectés)
   - Cliquez sur "Deploy site"

6. **Attendre le déploiement**
   - Le déploiement prend environ 2-3 minutes
   - Une fois terminé, vous aurez une URL comme: `https://votre-site.netlify.app`

### Option B: Déploiement via Netlify Drop (Plus simple mais manuel)

1. **Build l'application**
   ```bash
   npm run build
   ```

2. **Allez sur Netlify Drop**
   - Visitez https://app.netlify.com/drop
   - Glissez-déposez le dossier `dist` dans la zone

3. **Obtenir l'URL**
   - Netlify vous donnera immédiatement une URL

## Étape 2: Personnaliser votre domaine (Optionnel)

Dans Netlify:
1. Allez dans "Site settings" > "Domain management"
2. Cliquez sur "Add custom domain"
3. Suivez les instructions

Ou utilisez le domaine gratuit Netlify: `votre-nom.netlify.app`

## Étape 3: Installer l'application sur les téléphones

### Pour Android (Chrome):

1. **Ouvrir l'URL de votre application** dans Chrome
   - Exemple: `https://votre-site.netlify.app`

2. **Installer l'application**
   - Cliquez sur le menu (3 points) en haut à droite
   - Sélectionnez "Installer l'application" ou "Ajouter à l'écran d'accueil"
   - Confirmez l'installation

3. **L'icône apparaît sur l'écran d'accueil**
   - L'application fonctionne maintenant comme une vraie app mobile
   - Elle s'ouvre en plein écran sans la barre d'adresse

### Pour iPhone (Safari):

1. **Ouvrir l'URL de votre application** dans Safari
   - Exemple: `https://votre-site.netlify.app`

2. **Ajouter à l'écran d'accueil**
   - Appuyez sur le bouton de partage (carré avec flèche vers le haut)
   - Faites défiler vers le bas
   - Sélectionnez "Sur l'écran d'accueil"
   - Donnez un nom (ex: "Super Frais")
   - Appuyez sur "Ajouter"

3. **L'icône apparaît sur l'écran d'accueil**
   - L'application fonctionne comme une vraie app iOS

## Étape 4: Partager avec vos employés

### Méthode simple:

Envoyez à vos employés:
1. **L'URL de votre application**: `https://votre-site.netlify.app`
2. **Les instructions d'installation** (voir ci-dessus)
3. **Leurs identifiants** (email et mot de passe)

### Créer un QR Code (Recommandé):

1. Allez sur https://www.qr-code-generator.com
2. Entrez l'URL de votre application
3. Téléchargez le QR Code
4. Imprimez-le et affichez-le dans le magasin
5. Les employés scannent le QR Code avec leur téléphone
6. Ils suivent les instructions d'installation

## Mises à jour automatiques

Chaque fois que vous modifiez votre code:
1. Poussez les changements sur GitHub:
   ```bash
   git add .
   git commit -m "Description des modifications"
   git push
   ```

2. Netlify détecte automatiquement les changements et redéploie l'application
3. Les employés recevront automatiquement les mises à jour la prochaine fois qu'ils ouvriront l'app

## Fonctionnalités PWA disponibles

✅ Installation sur l'écran d'accueil
✅ Fonctionnement hors ligne (cache)
✅ Notifications push
✅ Scan de codes-barres
✅ Appareil photo (pour photos Rapport Z)
✅ Interface en plein écran

## Support et dépannage

### L'application ne s'installe pas:
- Vérifiez que vous utilisez HTTPS (Netlify le fait automatiquement)
- Videz le cache du navigateur
- Réessayez en mode navigation privée

### Les employés ne peuvent pas se connecter:
- Vérifiez que vous avez créé leurs comptes dans la section "Utilisateurs"
- Vérifiez que le mot de passe est correct
- Vérifiez que leur email est bien orthographié

### L'application ne se met pas à jour:
- Les employés doivent fermer complètement l'application
- Rouvrir l'application
- La mise à jour se fera automatiquement

## Coûts

- **Netlify (Hébergement)**: GRATUIT pour toujours
  - 100 GB de bande passante/mois
  - 300 minutes de build/mois
  - Largement suffisant pour une petite équipe

- **Supabase (Base de données)**: GRATUIT pour toujours
  - 500 MB de stockage
  - 50,000 utilisateurs actifs/mois
  - Largement suffisant pour votre utilisation

## Prochaines étapes recommandées

1. ✅ Déployer l'application
2. ✅ Tester sur votre propre téléphone
3. ✅ Créer les comptes de vos employés
4. ✅ Partager l'URL avec 1-2 employés pour tester
5. ✅ Déployer à tous les employés une fois les tests réussis

Besoin d'aide? Consultez:
- Documentation Netlify: https://docs.netlify.com
- Documentation Supabase: https://supabase.com/docs
