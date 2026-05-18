const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant ou invalide' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Support dynamic X-University-Id scoping for super_admin
    if (decoded.role === 'super_admin' && req.headers['x-university-id']) {
      const uId = parseInt(req.headers['x-university-id'], 10);
      if (!isNaN(uId)) {
        req.user.university_id = uId;
      } else if (req.headers['x-university-id'] === 'all' || req.headers['x-university-id'] === 'null') {
        req.user.university_id = null;
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token expiré ou invalide' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès interdit - droits insuffisants' });
  }
  next();
};

module.exports = { authMiddleware, requireRole };
