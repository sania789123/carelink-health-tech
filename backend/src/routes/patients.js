import express from 'express';
import crypto from 'crypto';
import { db } from '../config/database.js';
import { authenticate, requireRole, requirePatientAccess } from '../middleware/auth.js';
import { asyncHandler, newId } from '../utils/helpers.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();
router.use(authenticate);

const makeToken = () => crypto.randomBytes(24).toString('base64url');

// ---------- Profile ----------
router.get('/:patientId/profile', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const p = db.prepare('SELECT u.id,u.email,u.full_name,u.phone,u.language,u.senior_mode, pp.* FROM users u LEFT JOIN patient_profiles pp ON pp.user_id=u.id WHERE u.id=?').get(req.params.patientId);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  res.json({ ok: true, profile: p });
}));

router.put('/:patientId/profile', requireRole('patient'), requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { phone, language, senior_mode, date_of_birth, blood_group, address, emergency_contact } = req.body;
  db.prepare('UPDATE users SET phone=COALESCE(?,phone), language=COALESCE(?,language), senior_mode=COALESCE(?,senior_mode) WHERE id=?')
    .run(phone ?? null, language ?? null, senior_mode ?? null, req.params.patientId);
  db.prepare('UPDATE patient_profiles SET date_of_birth=COALESCE(?,date_of_birth), blood_group=COALESCE(?,blood_group), address=COALESCE(?,address), emergency_contact=COALESCE(?,emergency_contact) WHERE user_id=?')
    .run(date_of_birth ?? null, blood_group ?? null, address ?? null, emergency_contact ?? null, req.params.patientId);
  res.json({ ok: true });
}));

// ---------- Caregivers (active links) ----------
router.get('/:patientId/caregivers', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const rows = db.prepare(`
    SELECT cl.*, u.full_name, u.email
    FROM caregiver_links cl
    JOIN users u ON u.id = cl.caregiver_id
    WHERE cl.patient_id=?
    ORDER BY cl.created_at DESC
  `).all(req.params.patientId);
  res.json({
    ok: true,
    caregivers: rows.map(r => ({
      ...r,
      permissions: (() => { try { return JSON.parse(r.permissions || '[]'); } catch { return []; } })()
    }))
  });
}));

router.delete('/:patientId/caregivers/:linkId', requireRole('patient'), requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const link = db.prepare('SELECT * FROM caregiver_links WHERE id=? AND patient_id=?').get(req.params.linkId, req.params.patientId);
  if (!link) return res.status(404).json({ error: 'Caregiver link not found' });
  db.prepare("UPDATE caregiver_links SET status='revoked' WHERE id=?").run(req.params.linkId);
  logAudit(req.user.id, 'caregiver_revoke', 'caregiver_link', req.params.linkId, null, req.ip);
  res.json({ ok: true });
}));

// ---------- Invitations (NEW) ----------

// Create invitation
router.post('/:patientId/caregivers/invitations', requireRole('patient'), requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const { email, name, permissions, expiresInHours } = req.body;
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' });
  const normEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  // Cancel any existing pending invite for same email
  db.prepare("UPDATE caregiver_invitations SET status='cancelled' WHERE patient_id=? AND invited_email=? AND status='pending'")
    .run(req.params.patientId, normEmail);

  const token = makeToken();
  const id = newId('inv');
  const perms = Array.isArray(permissions) && permissions.length
    ? permissions
    : ['view_reports', 'view_medicines', 'checkins'];
  const hours = Number(expiresInHours) || 72;
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  db.prepare(`
    INSERT INTO caregiver_invitations (id, token, patient_id, invited_email, invited_name, permissions, expires_at)
    VALUES (?,?,?,?,?,?,?)
  `).run(id, token, req.params.patientId, normEmail, name || null, JSON.stringify(perms), expiresAt);

  logAudit(req.user.id, 'caregiver_invitation_create', 'invitation', id, { email: normEmail }, req.ip);

  const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`;

  res.status(201).json({
    ok: true,
    id,
    token,
    inviteUrl,
    expiresAt,
    email: normEmail,
    deliveryStatus: 'link_only',
    message: 'Invitation created. Email delivery is not configured — copy the link below and share it with your caregiver.'
  });
}));

// List invitations for a patient
router.get('/:patientId/caregivers/invitations', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const rows = db.prepare(`
    SELECT ci.*, u.full_name as accepted_by_name
    FROM caregiver_invitations ci
    LEFT JOIN users u ON u.id = ci.accepted_by
    WHERE ci.patient_id=?
    ORDER BY ci.created_at DESC
  `).all(req.params.patientId);

  const now = new Date().toISOString();
  const invitations = rows.map(r => {
    let status = r.status;
    if (status === 'pending' && r.expires_at < now) status = 'expired';
    return {
      ...r,
      status,
      permissions: (() => { try { return JSON.parse(r.permissions || '[]'); } catch { return []; } })()
    };
  });
  res.json({ ok: true, invitations });
}));

// Cancel invitation
router.post('/:patientId/caregivers/invitations/:invId/cancel', requireRole('patient'), requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const inv = db.prepare('SELECT * FROM caregiver_invitations WHERE id=? AND patient_id=?').get(req.params.invId, req.params.patientId);
  if (!inv) return res.status(404).json({ error: 'Invitation not found' });
  db.prepare("UPDATE caregiver_invitations SET status='cancelled' WHERE id=?").run(req.params.invId);
  logAudit(req.user.id, 'caregiver_invitation_cancel', 'invitation', req.params.invId, null, req.ip);
  res.json({ ok: true });
}));

// Resend invitation (new token, new expiry)
router.post('/:patientId/caregivers/invitations/:invId/resend', requireRole('patient'), requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const inv = db.prepare('SELECT * FROM caregiver_invitations WHERE id=? AND patient_id=?').get(req.params.invId, req.params.patientId);
  if (!inv) return res.status(404).json({ error: 'Invitation not found' });

  const newToken = makeToken();
  const newExpiry = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
  db.prepare("UPDATE caregiver_invitations SET token=?, expires_at=?, status='pending' WHERE id=?")
    .run(newToken, newExpiry, inv.id);

  const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${newToken}`;
  res.json({ ok: true, inviteUrl, expiresAt: newExpiry });
}));

// ---------- Dashboard ----------
router.get('/:patientId/dashboard', requirePatientAccess('patientId'), asyncHandler(async (req, res) => {
  const pid = req.params.patientId;
  const medCount = db.prepare('SELECT COUNT(*) c FROM medicines WHERE patient_id=? AND active=1').get(pid).c;
  const repCount = db.prepare('SELECT COUNT(*) c FROM reports WHERE patient_id=?').get(pid).c;
  const taskCount = db.prepare("SELECT COUNT(*) c FROM care_tasks WHERE patient_id=? AND status IN ('pending','in_progress')").get(pid).c;
  const notifs = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 5').all(pid);
  const meds = db.prepare('SELECT id,name,times,dosage FROM medicines WHERE patient_id=? AND active=1 AND confirmed=1').all(pid);
  const recentReports = db.prepare('SELECT id,title,report_date FROM reports WHERE patient_id=? ORDER BY report_date DESC LIMIT 5').all(pid);
  res.json({ ok: true, medCount, repCount, taskCount, notifs, meds, recentReports });
}));

export default router;