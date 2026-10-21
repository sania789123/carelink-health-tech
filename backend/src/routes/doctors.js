import express from 'express';
import { db } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler, newId } from '../utils/helpers.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();
router.use(authenticate, requireRole('doctor'));

router.get('/me/patients', asyncHandler(async (req, res) => {
  const rows = db.prepare("SELECT DISTINCT u.id, u.full_name, u.email, u.phone, da.expires_at, da.granted_at FROM doctor_access da JOIN users u ON u.id = da.patient_id WHERE da.doctor_id = ? AND da.revoked = 0 AND (da.expires_at IS NULL OR da.expires_at > datetime('now')) ORDER BY u.full_name").all(req.user.id);
  res.json({ ok: true, patients: rows });
}));

router.post('/me/patients/:patientId/grant', asyncHandler(async (req, res) => {
  const { expiresInDays } = req.body;
  const id = newId('da');
  const exp = expiresInDays ? new Date(Date.now() + expiresInDays*86400000).toISOString() : null;
  db.prepare('INSERT INTO doctor_access (id,patient_id,doctor_id,expires_at) VALUES (?,?,?,?)')
    .run(id, req.params.patientId, req.user.id, exp);
  logAudit(req.user.id, 'grant_access', 'doctor_access', id, { patientId: req.params.patientId }, req.ip);
  res.json({ ok: true, id });
}));

router.post('/me/patients/:patientId/revoke', asyncHandler(async (req, res) => {
  db.prepare('UPDATE doctor_access SET revoked=1 WHERE patient_id=? AND doctor_id=?').run(req.params.patientId, req.user.id);
  logAudit(req.user.id, 'revoke_access', 'doctor_access', null, { patientId: req.params.patientId }, req.ip);
  res.json({ ok: true });
}));

router.get('/me/tasks', asyncHandler(async (req, res) => {
  const rows = db.prepare("SELECT ct.*, u.full_name as patient_name FROM care_tasks ct JOIN users u ON u.id = ct.patient_id JOIN doctor_access da ON da.patient_id = ct.patient_id WHERE da.doctor_id = ? AND da.revoked = 0 ORDER BY ct.due_date").all(req.user.id);
  res.json({ ok: true, tasks: rows });
}));

router.get('/me/care-plans', asyncHandler(async (req, res) => {
  const rows = db.prepare("SELECT cp.*, u.full_name as patient_name FROM care_plans cp JOIN users u ON u.id = cp.patient_id WHERE cp.doctor_id = ? ORDER BY cp.created_at DESC").all(req.user.id);
  res.json({ ok: true, plans: rows });
}));

export default router;
