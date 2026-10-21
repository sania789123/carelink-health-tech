import express from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePatientAccess } from '../middleware/auth.js';
import { asyncHandler, newId } from '../utils/helpers.js';

const router = express.Router();
router.use(authenticate);

router.get('/:patientId/checkins', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM check_ins WHERE patient_id=? ORDER BY check_date DESC LIMIT 60').all(req.params.patientId);
  res.json({ ok: true, checkins: rows.map(r => ({ ...r, symptoms: JSON.parse(r.symptoms||'[]'), measurements: JSON.parse(r.measurements||'{}') })) });
}));

router.post('/:patientId/checkins', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { care_plan_id, check_date, symptoms, adherence, measurements, notes } = req.body;
  if (!check_date) return res.status(400).json({ error: 'check_date required' });
  const id = newId('ci');
  db.prepare('INSERT INTO check_ins (id,patient_id,care_plan_id,check_date,symptoms,adherence,measurements,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, req.params.patientId, care_plan_id||null, check_date,
         JSON.stringify(symptoms||[]), adherence||null,
         JSON.stringify(measurements||{}), notes||null, req.user.id);
  res.status(201).json({ ok: true, id });
}));

export default router;
