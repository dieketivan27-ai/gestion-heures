const { Pool } = require('pg');

// ─────────────────────────────────────────────────────────────────
// Résolution de l'URL de connexion PostgreSQL
// Ordre de priorité :
//  1. DATABASE_URL (format Render/Heroku: postgres://user:pass@host:port/db)
//  2. Variables individuelles DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
// ─────────────────────────────────────────────────────────────────
const connectionUrl = process.env.DATABASE_URL;

let poolConfig;

if (connectionUrl) {
  const sanitized = connectionUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 Connexion PostgreSQL via URL : ${sanitized}`);
  poolConfig = {
    connectionString: connectionUrl,
    // SSL activé si DB_SSL=true ou en prod sur Render (sauf si host local/docker ou DB_SSL=false)
    ssl: (() => {
      if (process.env.DB_SSL === 'false') return false;
      if (process.env.DB_SSL === 'true') return { rejectUnauthorized: false };
      try {
        const u = new URL(connectionUrl.replace(/^postgresql:\/\//, 'http://').replace(/^postgres:\/\//, 'http://'));
        if (['localhost', '127.0.0.1', 'postgres'].includes(u.hostname)) return false;
      } catch (e) {}
      return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
    })(),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
} else {
  const host     = process.env.DB_HOST     || '127.0.0.1';
  const port     = Number(process.env.DB_PORT) || 5432;
  const user     = process.env.DB_USER     || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME     || 'gestion_heures';

  console.log(`🔌 Connexion PostgreSQL : ${user}@${host}:${port}/${database}`);
  poolConfig = {
    host,
    port,
    user,
    password,
    database,
    ssl: false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

const pool = new Pool(poolConfig);

// ─────────────────────────────────────────────────────────────────
// Couche de compatibilité : convertit la syntaxe mysql2 (? et VALUES ?)
// en syntaxe PostgreSQL ($1, $2, ...)
// ─────────────────────────────────────────────────────────────────

/**
 * Convertit les placeholders '?' en '$1', '$2', ...
 * Normalise également les comparaisons booléennes héritées de MySQL (= 1 / = 0)
 */
function convertPlaceholders(sql) {
  const normalized = sql
    .replace(/\bis_active\s*=\s*1\b/gi, 'is_active = TRUE')
    .replace(/\bis_active\s*=\s*0\b/gi, 'is_active = FALSE')
    .replace(/\bvalide\s*=\s*1\b/gi, 'valide = TRUE')
    .replace(/\bvalide\s*=\s*0\b/gi, 'valide = FALSE')
    .replace(/\bmust_change_password\s*=\s*1\b/gi, 'must_change_password = TRUE')
    .replace(/\bmust_change_password\s*=\s*0\b/gi, 'must_change_password = FALSE');
  let i = 0;
  return normalized.replace(/\?/g, () => `$${++i}`);
}

/**
 * pool.execute(sql, params) — API mysql2-compatible
 * Retourne [rows, fields] comme mysql2/promise.
 * Ajoute .insertId sur le résultat si SQL contient RETURNING.
 */
pool.execute = async function (sql, params = []) {
  const pgSql = convertPlaceholders(sql);
  const result = await pool.query(pgSql, params);

  // Simuler [rows] comme mysql2
  const rows = result.rows;

  // Simuler result.insertId et result.affectedRows
  rows.insertId      = result.rows[0]?.id ?? null;
  rows.affectedRows  = result.rowCount ?? 0;

  return [rows, result.fields];
};

/**
 * pool.getConnection() — Simule la récupération d'un client dédié (pour les transactions)
 * Retourne un objet client avec .execute(), .beginTransaction(), .commit(), .rollback(), .release()
 */
pool.getConnection = async function () {
  const client = await pool.connect();

  // Wrapper execute() sur le client
  client.execute = async function (sql, params = []) {
    const pgSql = convertPlaceholders(sql);
    const result = await client.query(pgSql, params);
    const rows = result.rows;
    rows.insertId     = result.rows[0]?.id ?? null;
    rows.affectedRows = result.rowCount ?? 0;
    return [rows, result.fields];
  };

  // mysql2 bulk INSERT: conn.query('INSERT ... VALUES ?', [[...]])
  // pg n'a pas cet équivalent direct — on le gère dans les contrôleurs
  client.query = client.query.bind(client);

  client.beginTransaction = async function () {
    await client.query('BEGIN');
  };
  client.commit = async function () {
    await client.query('COMMIT');
  };
  client.rollback = async function () {
    await client.query('ROLLBACK');
  };
  // client.release() existe déjà nativement sur les clients pg

  return client;
};

// ─────────────────────────────────────────────────────────────────
// Test de connectivité non bloquant avec retry
// ─────────────────────────────────────────────────────────────────
(async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      const res = await client.query('SELECT current_database() as db');
      console.log(`✅ Connexion PostgreSQL établie — base : ${res.rows[0].db}`);
      client.release();
      return;
    } catch (err) {
      retries--;
      console.error(`❌ Erreur connexion PostgreSQL (${3 - retries}/3): ${err.message}`);
      if (retries > 0) {
        console.log('   ↻ Nouvelle tentative dans 5 secondes...');
        await new Promise(r => setTimeout(r, 5000));
      } else {
        console.error('⚠️  PostgreSQL inaccessible au démarrage — le serveur continue (HTTP OK, DB KO).');
      }
    }
  }
})().catch(err => {
  console.error('⚠️  Erreur inattendue lors du test de connexion PostgreSQL:', err.message);
});

pool.on('error', (err) => {
  console.error('❌ Erreur pool PostgreSQL:', err.message);
});

module.exports = pool;
