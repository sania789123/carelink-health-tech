import express from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/helpers.js';

const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(req.user.id);
  res.json({ ok: true, notifications: rows });
}));

router.post('/:id/read', asyncHandler(async (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user.id);
  res.json({ ok: true });
}));

export default router;
