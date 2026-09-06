# Déploiement Backend et MySQL sur Railway

## 1. Création du Projet

1. Allez sur le Dashboard [Railway](https://railway.app/).
2. Cliquez sur **New Project** > **Deploy from GitHub repo**.
3. Sélectionnez votre repository.
4. Railway détectera probablement tout le repository. Nous allons devoir configurer le sous-dossier.

## 2. Configuration du Service Node.js (Backend)

1. Allez dans les réglages de votre service Web (celui qui vient d'être créé).
2. Dans **Settings** > **General** > **Root Directory**, tapez `backend`.
3. Dans **Settings** > **Build**, le Build Command devrait être `npm install`.
4. Dans **Settings** > **Deploy**, le Start Command est défini par `npm start` (ce qui correspond à `node src/server.js`).
5. Dans **Settings** > **Networking**, cliquez sur **Generate Domain** pour avoir votre URL publique (ex: `votre-backend.up.railway.app`).

## 3. Base de Données MySQL

1. Dans votre projet Railway, cliquez sur **New** > **Database** > **Add MySQL**.
2. Railway génère automatiquement des identifiants (`MYSQLUSER`, `MYSQLPASSWORD`, etc.).

### Initialiser la base de données
Vous devez exécuter le script SQL généré localement dans `database/schema.sql` sur la base de données Railway.
- Vous pouvez utiliser un outil comme **MySQL Workbench** ou **DBeaver**.
- Connectez-vous à la base de données Railway avec les identifiants fournis (dans l'onglet **Connect** du service MySQL).
- Copiez-collez tout le contenu de `database/schema.sql` et exécutez-le.

## 4. Variables d'Environnement (Backend)

Allez dans le service Node.js > **Variables**, et ajoutez le contenu basé sur `backend/.env.example` :

- `PORT` : `3000` (ou laissez vide, Railway injecte le sien)
- `NODE_ENV` : `production`
- `DB_HOST` : (Valeur de MYSQLHOST dans le service MySQL)
- `DB_PORT` : (Valeur de MYSQLPORT, ex: 3306)
- `DB_USER` : (Valeur de MYSQLUSER)
- `DB_PASSWORD` : (Valeur de MYSQLPASSWORD)
- `DB_NAME` : (Valeur de MYSQLDATABASE)
- `JWT_SECRET` : *Créez une chaîne complexe aléatoire*
- `JWT_EXPIRES_IN` : `30m`
- `FRONTEND_URL` : *URL de votre projet Vercel générée (ex: https://mon-app.vercel.app)*
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_SECURE`, `MAIL_FROM` : (Vos identifiants SMTP)
- `APP_URL` : *URL de votre projet Vercel*

## 5. Test
Ouvrez l'URL générée suivie de `/api/health` dans votre navigateur.
Ex: `https://votre-backend.up.railway.app/api/health`.
Vous devriez voir `{"status":"OK",...}`.
