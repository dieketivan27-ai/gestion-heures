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

Allez dans le service Node.js > **Variables**, et ajoutez les variables suivantes :

### Option A (La plus simple avec Railway - Référence de variable) :
Ajoutez la variable suivante dans le service Backend :
- `MYSQL_URL` : `${{MySQL.MYSQL_URL}}` (ou copiez la valeur de `MYSQL_URL` générée dans l'onglet **Variables** ou **Connect** du service MySQL)

### Option B (Variables individuelles) :
- `MYSQLHOST` : `${{MySQL.MYSQLHOST}}` (ou `DB_HOST`)
- `MYSQLPORT` : `${{MySQL.MYSQLPORT}}` (ou `DB_PORT`)
- `MYSQLUSER` : `${{MySQL.MYSQLUSER}}` (ou `DB_USER`)
- `MYSQLPASSWORD` : `${{MySQL.MYSQLPASSWORD}}` (ou `DB_PASSWORD`)
- `MYSQLDATABASE` : `${{MySQL.MYSQLDATABASE}}` (ou `DB_NAME`, par défaut souvent `railway` ou `gestion_heures`)

### Autres variables requises :
- `PORT` : `3000` (ou laissez vide, Railway injecte son propre port)
- `NODE_ENV` : `production`
- `JWT_SECRET` : *Créez une chaîne complexe aléatoire*
- `JWT_EXPIRES_IN` : `30m`
- `FRONTEND_URL` : *URL de votre projet Vercel générée (ex: https://mon-app.vercel.app)*
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_SECURE`, `MAIL_FROM` : (Vos identifiants SMTP)
- `APP_URL` : *URL de votre projet Vercel*

## 5. Test
Ouvrez l'URL générée suivie de `/api/health` dans votre navigateur.
Ex: `https://votre-backend.up.railway.app/api/health`.
Vous devriez voir `{"status":"OK",...}`.
