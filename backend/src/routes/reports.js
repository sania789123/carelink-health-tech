import express from 'express';
import path from 'path';
import { db } from '../config/database.js';
import { authenticate, requirePatientAccess } from '../middleware/auth.js';
import { upload, UPLOAD_DIR } from '../middleware/upload.js';
import { asyncHandler, newId } from '../utils/helpers.js';
import { logAudit } from '../middleware/audit.js';
import { extractFromFile } from '../services/ocrService.js';
import { suggestSpecialties } from '../services/specialtySuggestions.js';
import { summarizeReport, summarizePatient } from '../services/reportSummary.js';

const router = express.Router();
router.use(authenticate);

router.get('/:patientId', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM reports WHERE patient_id=? ORDER BY COALESCE(report_date, created_at) DESC').all(req.params.patientId);
  res.json({ ok: true, reports: rows });
}));

// ---------- Suggested specialties (based on report data) ----------
// IMPORTANT: placed BEFORE '/:patientId/:reportId' to avoid route conflicts
router.get('/:patientId/suggestions', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const result = suggestSpecialties(req.params.patientId);
  res.json({ ok: true, ...result });
}));

// ---------- Plain-English summary of the whole patient ----------
router.get('/:patientId/summary', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const summary = summarizePatient(req.params.patientId);
  if (!summary) return res.status(404).json({ error: 'Patient not found' });
  res.json({ ok: true, summary });
}));

// ---------- Plain-English summary of a single report ----------
router.get('/:patientId/:reportId/summary', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const summary = summarizeReport(req.params.patientId, req.params.reportId);
  if (!summary) return res.status(404).json({ error: 'Report not found' });
  res.json({ ok: true, summary });
}));

router.get('/:patientId/:reportId', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const r = db.prepare('SELECT * FROM reports WHERE id=? AND patient_id=?').get(req.params.reportId, req.params.patientId);
  if (!r) return res.status(404).json({ error: 'Report not found' });
  const tests = db.prepare('SELECT * FROM test_results WHERE report_id=?').all(r.id);
  res.json({ ok: true, report: r, tests });
}));

router.post('/:patientId/upload', requirePatientAccess('patientId'), upload.single('file'), asyncHandler(async (req, res) => {
  const { title, report_type, report_date, hospital, doctor_name, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = newId('rep');
  const filePath = req.file ? path.basename(req.file.path) : null;
  const fileType = req.file ? req.file.mimetype : null;

  const ocr = await extractFromFile(req.file?.path, fileType);

  db.prepare('INSERT INTO reports (id,patient_id,uploaded_by,title,report_type,report_date,hospital,doctor_name,file_path,file_type,notes,original_extraction,extraction_confidence) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, req.params.patientId, req.user.id, title, report_type||'lab', report_date||null,
         hospital||null, doctor_name||null, filePath, fileType, notes||null,
         JSON.stringify(ocr.fields||{}), JSON.stringify(ocr.confidence||{}));

  logAudit(req.user.id, 'report_upload', 'report', id, { patientId: req.params.patientId }, req.ip);
  res.status(201).json({ ok: true, id, ocr, extractedTests: ocr.tests || [] });
}));

router.post('/:patientId/:reportId/tests', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { test_name, value, unit, reference_range } = req.body;
  if (!test_name) return res.status(400).json({ error: 'Test name required' });
  const id = newId('tr');
  db.prepare('INSERT INTO test_results (id,report_id,test_name,value,unit,reference_range) VALUES (?,?,?,?,?,?)')
    .run(id, req.params.reportId, test_name, value!=null?Number(value):null, unit||null, reference_range||null);
  res.status(201).json({ ok: true, id });
}));

router.put('/:patientId/:reportId/tests/:testId', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { test_name, value, unit, reference_range } = req.body;
  const old = db.prepare('SELECT * FROM test_results WHERE id=?').get(req.params.testId);
  db.prepare('UPDATE test_results SET test_name=COALESCE(?,test_name), value=COALESCE(?,value), unit=COALESCE(?,unit), reference_range=COALESCE(?,reference_range) WHERE id=?')
    .run(test_name??null, value!=null?Number(value):null, unit??null, reference_range??null, req.params.testId);
  db.prepare('INSERT INTO report_corrections (id,report_id,corrected_by,field_name,old_value,new_value) VALUES (?,?,?,?,?,?)')
    .run(newId('cor'), req.params.reportId, req.user.id, test_name||'', JSON.stringify(old), JSON.stringify(req.body));
  res.json({ ok: true });
}));

router.put('/:patientId/:reportId', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { title, report_date, hospital, doctor_name, notes } = req.body;
  db.prepare('UPDATE reports SET title=COALESCE(?,title), report_date=COALESCE(?,report_date), hospital=COALESCE(?,hospital), doctor_name=COALESCE(?,doctor_name), notes=COALESCE(?,notes) WHERE id=? AND patient_id=?')
    .run(title??null, report_date??null, hospital??null, doctor_name??null, notes??null, req.params.reportId, req.params.patientId);
  res.json({ ok: true });
}));

router.delete('/:patientId/:reportId', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  db.prepare('DELETE FROM reports WHERE id=? AND patient_id=?').run(req.params.reportId, req.params.patientId);
  logAudit(req.user.id, 'report_delete', 'report', req.params.reportId, null, req.ip);
  res.json({ ok: true });
}));

router.get('/:patientId/:reportId/file', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const r = db.prepare('SELECT * FROM reports WHERE id=? AND patient_id=?').get(req.params.reportId, req.params.patientId);
  if (!r || !r.file_path) return res.status(404).json({ error: 'File not found' });
  logAudit(req.user.id, 'report_download', 'report', r.id, null, req.ip);
  res.sendFile(path.join(UPLOAD_DIR, r.file_path));
}));

export default router;