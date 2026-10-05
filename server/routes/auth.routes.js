const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken, authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
    }

    const user = db.get(`
      SELECT u.*, r.code as role_code, r.name as role_name, r.permissions
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE (u.username = ? OR u.email = ?) AND u.is_active = 1
    `, [username.trim(), username.trim()]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Update last login
    db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);

    const token = generateToken(user);

    logAudit(req, {
      action: 'USER_LOGIN',
      entity_type: 'user',
      entity_id: user.id,
      entity_code: user.username,
      details: `User ${user.full_name} (${user.role_name}) logged in successfully`
    });

    let permissions = [];
    try {
      permissions = JSON.parse(user.permissions || '[]');
    } catch {
      permissions = [];
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role_code,
        role_name: user.role_name,
        department_id: user.department_id,
        staff_id: user.staff_id,
        permissions
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      full_name: req.user.full_name,
      role: req.user.role_code,
      role_name: req.user.role_name,
      department_id: req.user.department_id,
      staff_id: req.user.staff_id,
      permissions: req.user.permissions
    }
  });
});

// GET /api/v1/auth/roles
router.get('/roles', authenticateToken, (req, res) => {
  const roles = db.query('SELECT * FROM roles ORDER BY id ASC');
  const parsed = roles.map(r => ({
    ...r,
    permissions: JSON.parse(r.permissions || '[]')
  }));
  res.json({ success: true, roles: parsed });
});

// GET /api/v1/auth/users
router.get('/users', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  const users = db.query(`
    SELECT u.id, u.username, u.email, u.full_name, u.role_id, u.department_id, u.staff_id,
           u.is_active, u.last_login, u.created_at,
           r.name as role_name, r.code as role_code,
           d.name as department_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.id ASC
  `);
  res.json({ success: true, users });
});

// POST /api/v1/auth/users
router.post('/users', authenticateToken, requireRole('super_admin', 'asset_admin'), async (req, res) => {
  try {
    const { username, email, password, full_name, role_id, department_id, staff_id } = req.body;
    if (!username || !email || !password || !full_name || !role_id) {
      return res.status(400).json({ success: false, message: 'Missing required user fields.' });
    }

    const exists = db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Username or email already exists.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = db.run(`
      INSERT INTO users (username, email, password_hash, full_name, role_id, department_id, staff_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [username.trim(), email.trim(), hash, full_name.trim(), role_id, department_id || null, staff_id || null]);

    const newId = Number(result.lastInsertRowid);

    logAudit(req, {
      action: 'USER_CREATED',
      entity_type: 'user',
      entity_id: newId,
      entity_code: username,
      details: `Created new user account for ${full_name}`
    });

    res.status(201).json({ success: true, message: 'User created successfully.', userId: newId });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// PUT /api/v1/auth/users/:id
router.put('/users/:id', authenticateToken, requireRole('super_admin', 'asset_admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { full_name, email, role_id, department_id, staff_id, is_active, password } = req.body;

    const existing = db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let passwordHash = existing.password_hash;
    if (password && password.trim()) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    db.run(`
      UPDATE users
      SET full_name = ?, email = ?, role_id = ?, department_id = ?, staff_id = ?, is_active = ?, password_hash = ?
      WHERE id = ?
    `, [
      full_name || existing.full_name,
      email || existing.email,
      role_id || existing.role_id,
      department_id !== undefined ? department_id : existing.department_id,
      staff_id !== undefined ? staff_id : existing.staff_id,
      is_active !== undefined ? is_active : existing.is_active,
      passwordHash,
      userId
    ]);

    logAudit(req, {
      action: 'USER_UPDATED',
      entity_type: 'user',
      entity_id: userId,
      entity_code: existing.username,
      details: `Updated user account for ${existing.username}`
    });

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

module.exports = router;
