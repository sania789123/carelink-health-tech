import express from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePatientAccess } from '../middleware/auth.js';
import { asyncHandler, newId } from '../utils/helpers.js';

const router = express.Router();
router.use(authenticate);

router.get('/:patientId/plans', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const plans = db.prepare('SELECT cp.*, u.full_name as doctor_name FROM care_plans cp LEFT JOIN users u ON u.id=cp.doctor_id WHERE cp.patient_id=? ORDER BY cp.created_at DESC').all(req.params.patientId);
  res.json({ ok: true, plans });
}));

router.post('/:patientId/plans', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { title, description, start_date, end_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = newId('cp');
  db.prepare('INSERT INTO care_plans (id,patient_id,doctor_id,title,description,start_date,end_date) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.params.patientId, req.user.id, title, description||null, start_date||null, end_date||null);
  res.status(201).json({ ok: true, id });
}));

router.get('/:patientId/tasks', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT ct.*, u.full_name as assignee_name, cu.full_name as creator_name FROM care_tasks ct LEFT JOIN users u ON u.id=ct.assigned_to LEFT JOIN users cu ON cu.id=ct.created_by WHERE ct.patient_id=? ORDER BY ct.created_at DESC').all(req.params.patientId);
  res.json({ ok: true, tasks: rows });
}));

router.post('/:patientId/tasks', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { care_plan_id, title, description, task_type, due_date, assigned_to } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = newId('ct');
  db.prepare('INSERT INTO care_tasks (id,care_plan_id,patient_id,assigned_to,title,description,task_type,due_date,created_by) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, care_plan_id||null, req.params.patientId, assigned_to||null, title, description||null,
         task_type||'general', due_date||null, req.user.id);
  res.status(201).json({ ok: true, id });
}));

router.put('/:patientId/tasks/:taskId', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { status, doctor_comment, description } = req.body;
  db.prepare("UPDATE care_tasks SET status=COALESCE(?,status), doctor_comment=COALESCE(?,doctor_comment), description=COALESCE(?,description), completed_at=CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id=? AND patient_id=?")
    .run(status??null, doctor_comment??null, description??null, status||'', req.params.taskId, req.params.patientId);
  res.json({ ok: true });
}));

// ---------- Permanently DELETE a task ----------
router.delete('/:patientId/tasks/:taskId', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const task = db.prepare('SELECT * FROM care_tasks WHERE id=? AND patient_id=?').get(req.params.taskId, req.params.patientId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare('DELETE FROM care_tasks WHERE id=? AND patient_id=?').run(req.params.taskId, req.params.patientId);
  res.json({ ok: true });
}));

export default router;