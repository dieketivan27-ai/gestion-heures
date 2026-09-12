require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { runMigrations } = require('./config/migrate');

const app = express();
const PORT = process.env.PORT || 3000;

const APP_VERSION = Date.now().toString();

// Security
app.use(helmet());

const allowedOrigins = [
  'https://gestion-heures-gold.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-University-Id'],
  exposedHeaders: ['x-app-version'],
  credentials: true
}));

// Traitement explicite des requêtes preflight OPTIONS
app.options('*', cors());

app.use((req, res, next) => {
  res.setHeader('x-app-version', APP_VERSION);
  next();
});

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use(limiter);

// Logging & parsing
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (avatars) — disable CORP header so images can be loaded cross-origin
const path = require('path');
const uploadsPath = path.join(__dirname, 'uploads');
console.log('Static uploads path:', uploadsPath);
app.use('/uploads', (req, res, next) => {
  // Override CORP header set by Helmet to allow cross-origin image loading
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath));

// Health check
app.get('/health', (req, res) => res.status(200).json({ success: true, message: 'API is running', timestamp: new Date() }));
app.get('/api/health', (req, res) => res.status(200).json({ success: true, message: 'API is running', timestamp: new Date() }));

// Routes
app.use('/api', require('./routes/index'));

// 404
app.use((req, res) => res.status(404).json({ message: 'Route introuvable' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur inattendue est survenue.'
  });
});

// Start server immediately so health checks pass on Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 Environnement: ${process.env.NODE_ENV}`);
  
  // Run database migrations in background
  runMigrations().catch(err => {
    console.error('⚠️ Échec des migrations au démarrage:', err.message);
  });
});
