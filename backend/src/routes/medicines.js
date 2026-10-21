import express from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePatientAccess } from '../middleware/auth.js';
import { asyncHandler, newId } from '../utils/helpers.js';

const router = express.Router();
router.use(authenticate);

// GET — only return ACTIVE medicines
router.get('/:patientId', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM medicines WHERE patient_id=? AND active=1 ORDER BY created_at DESC').all(req.params.patientId);
  res.json({
    ok: true,
    medicines: rows.map(r => ({
      ...r,
      times: JSON.parse(r.times || '[]'),
      uncertain_fields: JSON.parse(r.uncertain_fields || '[]')
    }))
  });
}));

router.post('/:patientId', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { name, dosage, frequency, times, duration_days, start_date, instructions, confirmed, uncertain_fields } = req.body;
  if (!name) return res.status(400).json({ error: 'Medicine name required' });
  const id = newId('med');
  db.prepare('INSERT INTO medicines (id,patient_id,name,dosage,frequency,times,duration_days,start_date,instructions,confirmed,uncertain_fields) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, req.params.patientId, name, dosage || null, frequency || null,
         JSON.stringify(times || []), duration_days || null, start_date || null,
         instructions || null, confirmed ? 1 : 0, JSON.stringify(uncertain_fields || []));
  res.status(201).json({ ok: true, id });
}));

router.put('/:patientId/:medId', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { name, dosage, frequency, times, duration_days, start_date, instructions, confirmed } = req.body;
  db.prepare('UPDATE medicines SET name=COALESCE(?,name), dosage=COALESCE(?,dosage), frequency=COALESCE(?,frequency), times=COALESCE(?,times), duration_days=COALESCE(?,duration_days), start_date=COALESCE(?,start_date), instructions=COALESCE(?,instructions), confirmed=COALESCE(?,confirmed) WHERE id=? AND patient_id=?')
    .run(name ?? null, dosage ?? null, frequency ?? null, times ? JSON.stringify(times) : null,
         duration_days ?? null, start_date ?? null, instructions ?? null,
         confirmed === undefined ? null : (confirmed ? 1 : 0), req.params.medId, req.params.patientId);
  res.json({ ok: true });
}));

// HARD DELETE — permanently remove the medicine row
router.delete('/:patientId/:medId', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  // Delete associated medicine events first (FK safety)
  db.prepare('DELETE FROM medicine_events WHERE medicine_id=? AND patient_id=?')
    .run(req.params.medId, req.params.patientId);

  // Then hard-delete the medicine row itself
  const result = db.prepare('DELETE FROM medicines WHERE id=? AND patient_id=?')
    .run(req.params.medId, req.params.patientId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Medicine not found' });
  }

  res.json({ ok: true, deleted: result.changes });
}));

router.post('/:patientId/:medId/take', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { scheduled_time, status, notes } = req.body;
  const id = newId('evt');
  db.prepare('INSERT INTO medicine_events (id,medicine_id,patient_id,scheduled_time,taken_at,status,marked_by,notes) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, req.params.medId, req.params.patientId, scheduled_time || null, new Date().toISOString(),
         status || 'taken', req.user.id, notes || null);
  res.json({ ok: true, id });
}));

router.get('/:patientId/history', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT e.*, m.name as medicine_name FROM medicine_events e JOIN medicines m ON m.id=e.medicine_id WHERE e.patient_id=? ORDER BY e.taken_at DESC LIMIT 100').all(req.params.patientId);
  res.json({ ok: true, history: rows });
}));

export default router;