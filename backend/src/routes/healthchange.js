import express from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePatientAccess } from '../middleware/auth.js';
import { asyncHandler } from '../utils/helpers.js';
import { compareReports } from '../services/comparisonService.js';

const router = express.Router();
router.use(authenticate);

router.get('/:patientId/timeline', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT id,title,report_date,report_type,hospital,doctor_name FROM reports WHERE patient_id=? ORDER BY COALESCE(report_date,created_at) DESC').all(req.params.patientId);
  res.json({ ok: true, timeline: rows });
}));

router.get('/:patientId/compare', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to report ids required' });
  const result = compareReports(from, to);
  if (!result) return res.status(404).json({ error: 'One or both reports not found' });
  const r1 = db.prepare('SELECT patient_id FROM reports WHERE id=?').get(from);
  const r2 = db.prepare('SELECT patient_id FROM reports WHERE id=?').get(to);
  if (!r1 || !r2 || r1.patient_id !== req.params.patientId || r2.patient_id !== req.params.patientId)
    return res.status(403).json({ error: 'Reports do not belong to this patient' });
  res.json({ ok: true, ...result });
}));

export default router;
