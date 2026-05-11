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
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['x-app-version']
}));

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
const fs = require('fs');
const uploadsPath = path.join(__dirname, 'uploads');
console.log('Static uploads path:', uploadsPath);
app.use('/uploads', (req, res, next) => {
  // Override CORP header set by Helmet to allow cross-origin image loading
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath));

// Routes
app.use('/api', require('./routes/index'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

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

// Run migrations then start the server
runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📡 Environnement: ${process.env.NODE_ENV}`);
  });
});
