import express from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePatientAccess, requireRole } from '../middleware/auth.js';
import { asyncHandler, newId } from '../utils/helpers.js';
import { generateShareToken } from '../services/qrService.js';
import { logAudit } from '../middleware/audit.js';
import { summarizePatient } from '../services/reportSummary.js';
import QRCode from 'qrcode';

const router = express.Router();

router.post('/:patientId/create', authenticate, requireRole('patient'), requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { reportIds, expiresInHours, maxUses } = req.body;
  if (!Array.isArray(reportIds) || reportIds.length === 0)
    return res.status(400).json({ error: 'Select at least one report' });
  for (const rid of reportIds) {
    const r = db.prepare('SELECT patient_id FROM reports WHERE id=?').get(rid);
    if (!r || r.patient_id !== req.params.patientId)
      return res.status(403).json({ error: 'Invalid report selection' });
  }
  const token = generateShareToken();
  const id = newId('shr');
  const expiresAt = new Date(Date.now() + (expiresInHours||24) * 3600 * 1000).toISOString();
  db.prepare('INSERT INTO share_tokens (id,token,patient_id,created_by,report_ids,expires_at,max_uses) VALUES (?,?,?,?,?,?,?)')
    .run(id, token, req.params.patientId, req.user.id, JSON.stringify(reportIds), expiresAt, maxUses||1);
  logAudit(req.user.id, 'qr_create', 'share_token', id, { reportIds, expiresInHours }, req.ip);

  const shareUrl = (process.env.FRONTEND_URL || 'http://localhost:5173') + '/share/' + token;
  const qrDataUrl = await QRCode.toDataURL(shareUrl, { width: 400, margin: 2 });
  res.json({ ok: true, id, token, shareUrl, qrDataUrl, expiresAt });
}));

router.get('/:patientId/list', authenticate, requireRole('patient'), requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM share_tokens WHERE patient_id=? ORDER BY created_at DESC').all(req.params.patientId);
  res.json({ ok: true, tokens: rows.map(r => ({ ...r, report_ids: JSON.parse(r.report_ids||'[]') })) });
}));

router.post('/:patientId/revoke/:id', authenticate, requireRole('patient'), requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  db.prepare('UPDATE share_tokens SET revoked=1 WHERE id=? AND patient_id=?').run(req.params.id, req.params.patientId);
  logAudit(req.user.id, 'qr_revoke', 'share_token', req.params.id, null, req.ip);
  res.json({ ok: true });
}));

// ---------- Permanently DELETE a revoked or expired token ----------
router.delete('/:patientId/delete/:id', authenticate, requireRole('patient'), requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const tk = db.prepare('SELECT * FROM share_tokens WHERE id=? AND patient_id=?').get(req.params.id, req.params.patientId);
  if (!tk) return res.status(404).json({ error: 'Token not found' });

  const isExpired = new Date(tk.expires_at) < new Date();
  if (!tk.revoked && !isExpired) {
    return res.status(400).json({ error: 'Please revoke the token before deleting it.' });
  }

  // Delete related access logs first (foreign key safety)
  db.prepare('DELETE FROM share_access_log WHERE token_id=?').run(tk.id);
  db.prepare('DELETE FROM share_tokens WHERE id=?').run(tk.id);

  logAudit(req.user.id, 'qr_delete', 'share_token', tk.id, null, req.ip);
  res.json({ ok: true });
}));

// ---------- PUBLIC endpoint — NO auth required (for /share/:token links) ----------
router.get('/public/:token', asyncHandler(async (req, res) => {
  const t = db.prepare('SELECT * FROM share_tokens WHERE token=?').get(req.params.token);
  if (!t) return res.status(404).json({ error: 'This link is invalid or has been removed.' });
  if (t.revoked) return res.status(403).json({ error: 'This share has been revoked by the patient.' });
  if (new Date(t.expires_at) < new Date()) return res.status(403).json({ error: 'This share has expired.' });
  if (t.use_count >= t.max_uses) return res.status(403).json({ error: 'This share has reached its use limit.' });

  db.prepare('UPDATE share_tokens SET use_count = use_count + 1 WHERE id=?').run(t.id);
  db.prepare('INSERT INTO share_access_log (id,token_id,accessed_by,ip,action) VALUES (?,?,?,?,?)')
    .run(newId('sal'), t.id, null, req.ip, 'public_view');

  const ids = JSON.parse(t.report_ids || '[]');
  const placeholders = ids.length ? ids.map(() => '?').join(',') : null;
  const reports = ids.length
    ? db.prepare('SELECT id, title, report_date, hospital, doctor_name, report_type FROM reports WHERE id IN (' + placeholders + ')').all(...ids)
    : [];

  let summary = null;
  try {
    summary = summarizePatient(t.patient_id);
  } catch (e) {
    console.error('Summary generation failed:', e.message);
  }

  const patient = db.prepare('SELECT full_name FROM users WHERE id=?').get(t.patient_id);

  res.json({
    ok: true,
    patientName: patient?.full_name || 'Patient',
    expiresAt: t.expires_at,
    reports,
    summary
  });
}));

// ---------- Doctor endpoint (authenticated) ----------
router.get('/access/:token', authenticate, requireRole('doctor'), asyncHandler(async (req, res) => {
  const t = db.prepare('SELECT * FROM share_tokens WHERE token=?').get(req.params.token);
  if (!t) return res.status(404).json({ error: 'Invalid token' });
  if (t.revoked) return res.status(403).json({ error: 'This share has been revoked' });
  if (new Date(t.expires_at) < new Date()) return res.status(403).json({ error: 'This share has expired' });
  if (t.use_count >= t.max_uses) return res.status(403).json({ error: 'Share limit reached' });

  db.prepare('UPDATE share_tokens SET use_count = use_count + 1 WHERE id=?').run(t.id);
  db.prepare('INSERT INTO share_access_log (id,token_id,accessed_by,ip,action) VALUES (?,?,?,?,?)')
    .run(newId('sal'), t.id, req.user.id, req.ip, 'view');
  logAudit(req.user.id, 'qr_access', 'share_token', t.id, null, req.ip);

  const ids = JSON.parse(t.report_ids||'[]');
  if (ids.length === 0) return res.json({ ok: true, reports: [] });
  const placeholders = ids.map(()=>'?').join(',');
  const reports = db.prepare('SELECT id,title,report_date,hospital,doctor_name,report_type FROM reports WHERE id IN (' + placeholders + ')').all(...ids);

  let summary = null;
  try {
    summary = summarizePatient(t.patient_id);
  } catch (e) {
    console.error('Summary generation failed:', e.message);
  }

  const patient = db.prepare('SELECT full_name FROM users WHERE id=?').get(t.patient_id);

  res.json({
    ok: true,
    reports,
    patientId: t.patient_id,
    patientName: patient?.full_name || 'Patient',
    summary
  });
}));

export default router;