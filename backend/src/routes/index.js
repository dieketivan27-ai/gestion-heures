const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');

const authCtrl = require('../controllers/authController');
const ensCtrl = require('../controllers/enseignantController');
const heureCtrl = require('../controllers/heureController');
const dashCtrl = require('../controllers/dashboardController');
const refCtrl = require('../controllers/referentielController');

// Configuration Multer pour les avatars
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists (absolute path)
const uploadsDir = path.resolve(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées (JPG, PNG, WEBP…)'), false);
  }
});

// ---- AUTH ----
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', authMiddleware, authCtrl.me);
router.put('/auth/password', authMiddleware, authCtrl.changePassword);
router.put('/auth/first-password', authMiddleware, authCtrl.changeFirstPassword);
router.post('/auth/forgot-password', authCtrl.forgotPassword);
router.put('/auth/reset-password', authCtrl.resetPassword);
router.put('/auth/profile', authMiddleware, authCtrl.updateProfile);
router.post('/auth/avatar', authMiddleware, upload.single('avatar'), authCtrl.updateAvatar);
router.delete('/auth/avatar', authMiddleware, authCtrl.deleteAvatar);

// ---- ENSEIGNANTS ----
router.get('/enseignants', authMiddleware, ensCtrl.getAll);
router.get('/enseignants/:id', authMiddleware, ensCtrl.getById);
router.get('/enseignants/:id/heures', authMiddleware, ensCtrl.getHeures);
router.post('/enseignants', authMiddleware, requireRole('admin','rh'), ensCtrl.create);
router.put('/enseignants/:id', authMiddleware, requireRole('admin','rh'), ensCtrl.update);
router.delete('/enseignants/:id', authMiddleware, requireRole('admin'), ensCtrl.delete);

// ---- HEURES ----
router.get('/heures/pending-count', authMiddleware, heureCtrl.getPendingCount);
router.get('/heures', authMiddleware, heureCtrl.getAll);
router.get('/heures/:id', authMiddleware, heureCtrl.getById);
router.post('/heures', authMiddleware, requireRole('admin','rh'), heureCtrl.create);
router.put('/heures/:id', authMiddleware, requireRole('admin','rh'), heureCtrl.update);
router.delete('/heures/:id', authMiddleware, requireRole('admin','rh'), heureCtrl.delete);
router.patch('/heures/:id/valider', authMiddleware, requireRole('admin','rh'), heureCtrl.valider);

// ---- DASHBOARD & RAPPORTS ----
router.get('/dashboard', authMiddleware, dashCtrl.getDashboard);
router.get('/rapports/paiement', authMiddleware, requireRole('admin','rh'), dashCtrl.getEtatPaiement);

// ---- RÉFÉRENTIELS ----
router.get('/departements', authMiddleware, refCtrl.getDepartements);
router.post('/departements', authMiddleware, requireRole('admin'), refCtrl.createDepartement);
router.put('/departements/:id', authMiddleware, requireRole('admin'), refCtrl.updateDepartement);
router.delete('/departements/:id', authMiddleware, requireRole('admin'), refCtrl.deleteDepartement);

router.get('/filieres', authMiddleware, refCtrl.getFilieres);
router.post('/filieres', authMiddleware, requireRole('admin'), refCtrl.createFiliere);
router.put('/filieres/:id', authMiddleware, requireRole('admin'), refCtrl.updateFiliere);
router.delete('/filieres/:id', authMiddleware, requireRole('admin'), refCtrl.deleteFiliere);

router.get('/matieres', authMiddleware, refCtrl.getMatieres);
router.post('/matieres', authMiddleware, requireRole('admin','rh'), refCtrl.createMatiere);
router.put('/matieres/:id', authMiddleware, requireRole('admin','rh'), refCtrl.updateMatiere);
router.delete('/matieres/:id', authMiddleware, requireRole('admin'), refCtrl.deleteMatiere);

router.get('/annees', authMiddleware, refCtrl.getAnnees);
router.post('/annees', authMiddleware, requireRole('admin'), refCtrl.createAnnee);
router.patch('/annees/:id/activer', authMiddleware, requireRole('admin'), refCtrl.activateAnnee);
router.delete('/annees/:id', authMiddleware, requireRole('admin'), refCtrl.deleteAnnee);

router.get('/parametres', authMiddleware, refCtrl.getParametres);
router.put('/parametres/:cle', authMiddleware, requireRole('admin'), refCtrl.updateParametre);

router.get('/users', authMiddleware, requireRole('admin'), refCtrl.getUsers);
router.patch('/users/:id/toggle', authMiddleware, requireRole('admin'), refCtrl.toggleUser);
router.get('/logs', authMiddleware, requireRole('admin'), refCtrl.getLogs);

module.exports = router;
