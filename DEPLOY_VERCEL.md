# Déploiement Frontend sur Vercel

## Configuration Requise

Le frontend Angular a été préparé pour être déployé sur Vercel. 
Le fichier de configuration SPA `vercel.json` a déjà été créé.

## Procédure

1. Allez sur le Dashboard [Vercel](https://vercel.com).
2. Cliquez sur **Add New...** > **Project**.
3. Importez votre repository GitHub contenant ce projet.
4. Dépliez la section **Build and Output Settings** (Framework Preset : **Angular** détecté automatiquement).
5. Dans **Root Directory**, cliquez sur `Edit` et sélectionnez `frontend`.

## Build Command et Output Directory

Ces paramètres seront normalement détectés automatiquement via `vercel.json` :
- **Build Command** : `npm run build`
- **Output Directory** : `dist/gestion-heures/browser`

## Variables d'Environnement

Dans la section **Environment Variables** sur Vercel, ajoutez :
- (Aucune variable requise par défaut pour Angular car l'URL du backend a été compilée, mais si vous souhaitez la rendre dynamique, vous pouvez l'ajouter à vos scripts de build).

6. Cliquez sur **Deploy**.

## SPA Routing

Grâce au fichier `vercel.json` créé à la racine du dossier `frontend`, le rafraîchissement des pages (F5) fonctionnera correctement et renverra vers `index.html` sans erreur 404.
