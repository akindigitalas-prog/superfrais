# Super Frais - Application de Gestion de Magasin

Application web progressive (PWA) pour la gestion quotidienne d'un magasin alimentaire.

## Fonctionnalités

✅ **Gestion des produits** - Catalogue complet avec codes-barres
✅ **DLC Management** - Suivi des dates limites de consommation avec alertes automatiques
✅ **Comptage de caisse** - Comptage quotidien avec détection des écarts
✅ **Comptage manuel** - Inventaire des produits avec scan de codes-barres
✅ **Système de tâches** - Attribution et suivi des tâches aux employés
✅ **Messagerie interne** - Communication entre employés
✅ **Notifications push** - Alertes en temps réel
✅ **Mode hors ligne** - Fonctionne sans connexion internet
✅ **Multi-utilisateurs** - Gestion des employés et permissions

## Démarrage rapide

### Installation locale

```bash
# Installer les dépendances
npm install

# Lancer l'application en développement
npm run dev

# Builder pour la production
npm run build
```

### Variables d'environnement

Le fichier `.env` contient vos identifiants Supabase:
```
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon
```

## Déploiement

Consultez le fichier **[DEPLOIEMENT.md](./DEPLOIEMENT.md)** pour le guide complet de déploiement.

### Résumé rapide:

1. **Créer les icônes** (voir [ICONES.md](./ICONES.md))
2. **Déployer sur Netlify** (gratuit)
3. **Partager l'URL** avec vos employés
4. **Installer sur mobile** comme application

## Structure du projet

```
super-frais/
├── src/
│   ├── pages/           # Pages de l'application
│   ├── components/      # Composants réutilisables
│   ├── lib/            # Utilitaires (Supabase, notifications, etc.)
│   └── store/          # État global (Zustand)
├── public/             # Fichiers statiques (icônes, manifest)
├── supabase/
│   ├── migrations/     # Migrations de base de données
│   └── functions/      # Edge functions Supabase
└── dist/               # Build de production (généré)
```

## Technologies utilisées

- **React** - Interface utilisateur
- **TypeScript** - Typage statique
- **Vite** - Build tool
- **Supabase** - Backend (base de données, auth, storage)
- **Zustand** - Gestion d'état
- **date-fns** - Manipulation des dates
- **html5-qrcode** - Scanner de codes-barres
- **xlsx** - Import/export Excel

## Pages principales

- **Dashboard** - Vue d'ensemble et indicateurs
- **Produits** - Gestion du catalogue avec import Excel
- **DLC Management** - Suivi des dates de péremption
- **Comptage caisse** - Comptage quotidien avec rapport Z
- **Comptage manuel** - Inventaire avec scan
- **Tâches** - Attribution et suivi des tâches
- **Messages** - Messagerie interne
- **Notifications** - Centre de notifications
- **Utilisateurs** - Gestion des employés (Admin uniquement)

## Permissions

### Administrateur
- Accès complet à toutes les fonctionnalités
- Gestion des utilisateurs
- Import de produits
- Suppression de données

### Employé standard
- Consultation des produits
- Gestion des DLC
- Comptage de caisse
- Comptage manuel
- Tâches
- Messages
- Notifications

### Employé en lecture seule
- Consultation uniquement
- Pas de modification

## Base de données

La structure de la base de données est définie dans `supabase/migrations/`.

Tables principales:
- `profiles` - Profils utilisateurs
- `products` - Catalogue de produits
- `dlc_items` - Produits avec DLC à surveiller
- `cash_counts` - Comptages de caisse
- `manual_counts` - Inventaires manuels
- `tasks` - Tâches des employés
- `messages` - Messages internes
- `notifications` - Notifications système

## Support PWA

L'application est une Progressive Web App qui peut être installée sur:
- ✅ Android (Chrome)
- ✅ iOS (Safari)
- ✅ Windows (Chrome/Edge)
- ✅ macOS (Chrome/Safari)

## Développement

### Ajouter une nouvelle page
1. Créer le fichier dans `src/pages/`
2. Ajouter la route dans `src/App.tsx`
3. Ajouter le lien dans `src/components/Layout.tsx`

### Modifier la base de données
1. Créer un fichier de migration dans `supabase/migrations/`
2. Nommer selon le format: `YYYYMMDDHHMMSS_description.sql`
3. Appliquer la migration via Supabase

### Ajouter une notification
```typescript
import { sendNotification } from './lib/notifications'

await sendNotification(
  userId,
  'Titre de la notification',
  'Message de la notification',
  'info', // ou 'success', 'warning', 'error'
  '/path/to/page'
)
```

## Sécurité

- ✅ Row Level Security (RLS) activé sur toutes les tables
- ✅ Authentification via Supabase Auth
- ✅ Validation des permissions côté serveur
- ✅ Protection CSRF
- ✅ HTTPS obligatoire en production

## Licence

Propriétaire - Tous droits réservés

## Support

Pour toute question ou problème, consultez:
- [Guide de déploiement](./DEPLOIEMENT.md)
- [Guide des icônes](./ICONES.md)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation React](https://react.dev)
