const mysql = require('mysql2/promise');

// 1. Détection de l'URL de connexion (Railway fournit MYSQL_URL ou DATABASE_URL)
const connectionUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

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

pool.getConnection()
  .then(conn => {
    console.log('✅ Connexion MySQL établie avec succès');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Erreur connexion MySQL:', err.message);
  });

module.exports = pool;
