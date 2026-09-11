const mysql = require('mysql2/promise');

// Ordre de priorité :
// 1. MYSQL_PUBLIC_URL → URL publique Railway (TCP proxy, toujours accessible)
// 2. MYSQL_URL / DATABASE_URL → URL interne Railway (.railway.internal, réseau privé)
// 3. Variables individuelles MYSQLHOST / DB_HOST → fallback
const connectionUrl = process.env.MYSQL_PUBLIC_URL
  || process.env.MYSQL_URL
  || process.env.DATABASE_URL;

// Options communes du pool
const basePoolOptions = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectAttributes: { program_name: 'gestion_heures' },
};

let pool;

if (connectionUrl) {
  // Mode 1 : Connexion via URL complète (ex: mysql://user:pass@host:port/db)
  const sanitizedUrl = connectionUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 Connexion MySQL via URL distante : ${sanitizedUrl}`);
  
  pool = mysql.createPool({
    uri: connectionUrl,
    ...basePoolOptions,
  });
} else {
  // Mode 2 : Connexion via variables individuelles (Railway ou variables DB_ classiques)
  const host = process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQLPORT || process.env.DB_PORT) || 3306;
  const user = process.env.MYSQLUSER || process.env.DB_USER || 'root';
  const password = process.env.MYSQLPASSWORD !== undefined ? process.env.MYSQLPASSWORD : (process.env.DB_PASSWORD || '');
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME || 'gestion_heures';

  console.log(`🔌 Connexion MySQL cible : ${user}@${host}:${port}/${database}`);

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ...basePoolOptions,
  });
}

// Guarantee utf8mb4 is used for every connection pulled from the pool
pool.on('connection', (connection) => {
  connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
});

// Test de connectivité non bloquant avec retry (ne crashe pas le serveur)
(async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      const conn = await pool.getConnection();
      console.log('✅ Connexion MySQL établie avec succès');
      conn.release();
      return;
    } catch (err) {
      retries--;
      console.error(`❌ Erreur connexion MySQL (${5 - retries}/5): ${err.message}`);
      if (retries > 0) {
        console.log('   ↻ Nouvelle tentative dans 3 secondes...');
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.error('💀 Impossible de se connecter à MySQL après 5 tentatives. Le serveur continue mais les requêtes DB échoueront.');
      }
    }
  }
})();

module.exports = pool;
