const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'mocu-ams-enterprise-secure-key-2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role_code,
      role_id: user.role_id,
      department_id: user.department_id,
      staff_id: user.staff_id,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired authentication token.' });
    }

    // Fetch fresh user details with role & permissions
    const user = db.get(`
      SELECT u.id, u.username, u.email, u.full_name, u.role_id, u.department_id, u.staff_id, u.is_active,
             r.code as role_code, r.name as role_name, r.permissions
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [decoded.id]);

    if (!user || !user.is_active) {
      return res.status(403).json({ success: false, message: 'User account is inactive or not found.' });
    }

    try {
      user.permissions = JSON.parse(user.permissions || '[]');
    } catch {
      user.permissions = [];
    }

    req.user = user;
    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.user.role_code === 'super_admin' || allowedRoles.includes(req.user.role_code)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Your role: ${req.user.role_code}`
    });
  };
}

function requirePermission(...requiredPerms) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.user.role_code === 'super_admin' || req.user.permissions.includes('*')) {
      return next();
    }

    const hasAll = requiredPerms.every(p => req.user.permissions.includes(p));
    if (hasAll) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Missing required permissions: [${requiredPerms.join(', ')}]`
    });
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  requireRole,
  requirePermission
};
