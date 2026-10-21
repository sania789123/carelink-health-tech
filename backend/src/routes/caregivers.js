import express from 'express';
import { db } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/helpers.js';

const router = express.Router();
router.use(authenticate, requireRole('caregiver'));

router.get('/me/patients', asyncHandler(async (req, res) => {
  const rows = db.prepare("SELECT u.id, u.full_name, u.email, u.phone, cl.status, cl.permissions FROM caregiver_links cl JOIN users u ON u.id = cl.patient_id WHERE cl.caregiver_id = ? AND cl.status = 'active' ORDER BY u.full_name").all(req.user.id);
  res.json({ ok: true, patients: rows.map(r => ({ ...r, permissions: JSON.parse(r.permissions||'[]') })) });
}));

export default router;
