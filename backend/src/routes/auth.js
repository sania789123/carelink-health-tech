import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { signToken, authenticate } from '../middleware/auth.js';
import { newId, asyncHandler } from '../utils/helpers.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, full_name, role, phone, language } = req.body;
  if (!email || !password || !full_name || !role) return res.status(400).json({ error: 'Missing required fields' });
  if (!['patient','doctor','caregiver'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email.toLowerCase()))
    return res.status(409).json({ error: 'Email already registered' });

  const id = newId('usr');
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id,email,password_hash,full_name,role,phone,language) VALUES (?,?,?,?,?,?,?)')
    .run(id, email.toLowerCase(), hash, full_name, role, phone||null, language||'en');

  if (role === 'patient') db.prepare('INSERT INTO patient_profiles (user_id) VALUES (?)').run(id);
  if (role === 'doctor') db.prepare('INSERT INTO doctor_profiles (user_id) VALUES (?)').run(id);

  const user = db.prepare('SELECT id,email,full_name,role,language FROM users WHERE id=?').get(id);
  logAudit(id, 'register', 'user', id, { role }, req.ip);
  res.status(201).json({ ok: true, user, token: signToken(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });
  const safe = { id: user.id, email: user.email, full_name: user.full_name, role: user.role, language: user.language };
  logAudit(user.id, 'login', 'user', user.id, null, req.ip);
  res.json({ ok: true, user: safe, token: signToken(safe) });
}));

router.get('/me', authenticate, (req, res) => res.json({ ok: true, user: req.user }));
router.post('/logout', authenticate, (req, res) => {
  logAudit(req.user.id, 'logout', 'user', req.user.id, null, req.ip);
  res.json({ ok: true });
});

export default router;
