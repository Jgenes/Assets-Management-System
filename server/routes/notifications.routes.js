const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/v1/notifications
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const roleId = req.user.role_id;

  const notifications = db.query(`
    SELECT * FROM notifications
    WHERE (user_id = ? OR (user_id IS NULL AND (role_id = ? OR role_id IS NULL)))
    ORDER BY id DESC
    LIMIT 50
  `, [userId, roleId]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  res.json({ success: true, unreadCount, notifications });
});

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', authenticateToken, (req, res) => {
  db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Notification marked as read.' });
});

// PUT /api/v1/notifications/read-all
router.put('/read-all', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const roleId = req.user.role_id;

  db.run(`
    UPDATE notifications
    SET is_read = 1
    WHERE (user_id = ? OR (user_id IS NULL AND (role_id = ? OR role_id IS NULL)))
  `, [userId, roleId]);

  res.json({ success: true, message: 'All notifications marked as read.' });
});

module.exports = router;
