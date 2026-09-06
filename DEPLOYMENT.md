# GestionHeures — Deployment Guide

## Architecture production

- **Frontend :** Vercel
- **Backend :** Railway (Node.js/Express)
- **Database :** MySQL sur Railway

## Déploiement local

Pour le développement local, le fonctionnement initial n'a pas été modifié. Vous pouvez lancer le projet entièrement en local avec :
```bash
docker-compose up -d --build
```
Cela démarrera MySQL, le Backend, et le Frontend via Nginx sur les ports habituels.

## Déploiement backend

1. Connectez votre repository GitHub à Railway.
2. Créez un service web et définissez le **Root Directory** sur `backend`.
3. Railway exécutera automatiquement `npm install` et `npm start`.
4. Générez un domaine pour obtenir l'URL publique de l'API.
*Détails dans [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)*

## Déploiement frontend

1. Connectez votre repository GitHub à Vercel.
2. Définissez le **Root Directory** sur `frontend`.
3. Assurez-vous que le framework Angular est détecté.
4. Mettez à jour `frontend/src/environments/environment.prod.ts` avec l'URL de votre Backend Railway générée.
5. Déployez.
*Détails dans [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)*

## Variables d'environnement

Les variables nécessaires pour le Backend en production (sur Railway) :
- `PORT` : 3000 (ou laisser vide)
- `NODE_ENV` : production
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `FRONTEND_URL` (URL Vercel pour le CORS)
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_SECURE`, `MAIL_FROM`
- `APP_URL` (URL Vercel pour les liens emails)

*Référence: `backend/.env.example`*

## Base de données

La base de données MySQL doit être initialisée en exécutant le script `database/schema.sql`.
Ce script consolide toutes les migrations et la création du super admin.
Utilisez un outil de gestion MySQL (ex: DBeaver, Workbench) pour vous connecter à la base de données de production sur Railway, et exécutez le script complet.

## CORS

Le CORS est dynamiquement configuré pour utiliser `process.env.FRONTEND_URL`. 
Il autorise explicitement cette origine. Les requêtes de test en local (Postman) sont également autorisées.

## Avatars

Le système d'upload utilise toujours le stockage local (`uploads/`) pour garantir la compatibilité ascendante.
**ATTENTION :** Sur Railway, le système de fichiers est éphémère à chaque déploiement (les images uploadées seront perdues lors d'un nouveau build).
*Migration future recommandée :* Configurer un volume persistant sur Railway, ou intégrer un service cloud comme AWS S3 / Cloudinary via Multer S3.

## SMTP

Le système d'email s'appuie sur `nodemailer`. Assurez-vous de définir les variables d'environnement `MAIL_*` dans Railway.
L'URL pour les boutons de redirection dans les emails s'appuie sur `APP_URL`.

## Tests

Ordre recommandé pour les tests de production :
1. Test de disponibilité : `https://VOTRE_BACKEND/api/health`
2. Test de connexion (login) avec l'utilisateur Super Admin initial.
3. Test de création d'un utilisateur enseignant (vérification de l'email de bienvenue SMTP).
4. Test d'upload d'un avatar (limite 5 Mo, mime-types).
5. Test de réinitialisation de mot de passe (token SMTP).
6. Test de rafraîchissement (F5) de l'application sur Vercel (doit rester sur la page courante grâce à `vercel.json`).

## Troubleshooting

- **404 sur les pages Angular :** Assurez-vous que le fichier `vercel.json` est bien présent à la racine de `/frontend`.
- **CORS error :** Vérifiez que `FRONTEND_URL` sur Railway correspond exactement à votre URL Vercel (sans le slash à la fin).
- **Database connection :** Assurez-vous que les variables `DB_*` correspondent à la base MySQL de Railway.
- **JWT issues :** Assurez-vous d'avoir défini `JWT_SECRET` dans les variables de production.
- **SMTP :** Si vous utilisez Gmail, vous pourriez avoir besoin de créer un "Mot de passe d'application" dans Google.
- **Build Angular :** Sur Vercel, vérifiez les logs de construction si une dépendance manque.
- **Uploads disparus :** Conforme au comportement éphémère de Railway. Il faudra monter un volume si besoin.
