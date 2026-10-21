import express from 'express';
import { db } from '../config/database.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { asyncHandler, newId } from '../utils/helpers.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// ---------- Public: get invitation details by token ----------
// No auth required — the invitee may not have an account yet.
router.get('/:token', asyncHandler(async (req, res) => {
  const inv = db.prepare('SELECT * FROM caregiver_invitations WHERE token=?').get(req.params.token);
  if (!inv) return res.status(404).json({ error: 'Invitation not found' });

  if (inv.status === 'cancelled') return res.status(410).json({ error: 'This invitation was cancelled by the patient' });
  if (inv.status === 'accepted') return res.status(410).json({ error: 'This invitation has already been accepted' });
  if (inv.status === 'declined') return res.status(410).json({ error: 'This invitation was declined' });
  if (new Date(inv.expires_at) < new Date()) {
    db.prepare("UPDATE caregiver_invitations SET status='expired' WHERE id=?").run(inv.id);
    return res.status(410).json({ error: 'This invitation has expired' });
  }

  // Get patient display name only (privacy — do not leak other patient data)
  const patient = db.prepare('SELECT full_name FROM users WHERE id=?').get(inv.patient_id);

  res.json({
    ok: true,
    invitation: {
      id: inv.id,
      invitedEmail: inv.invited_email,
      invitedName: inv.invited_name,
      patientName: patient ? patient.full_name : 'A patient',
      permissions: (() => { try { return JSON.parse(inv.permissions || '[]'); } catch { return []; } })(),
      expiresAt: inv.expires_at,
      status: inv.status
    }
  });
}));

// ---------- Auth required: accept ----------
router.post('/:token/accept', authenticate, asyncHandler(async (req, res) => {
  const inv = db.prepare('SELECT * FROM caregiver_invitations WHERE token=?').get(req.params.token);
  if (!inv) return res.status(404).json({ error: 'Invitation not found' });

  if (inv.status !== 'pending') {
    return res.status(410).json({ error: 'This invitation is no longer valid' });
  }
  if (new Date(inv.expires_at) < new Date()) {
    db.prepare("UPDATE caregiver_invitations SET status='expired' WHERE id=?").run(inv.id);
    return res.status(410).json({ error: 'This invitation has expired' });
  }

  // The user accepting must be a caregiver
  if (req.user.role !== 'caregiver') {
    return res.status(403).json({
      error: 'Only users with the Caregiver role can accept this invitation. Please log out and register as a caregiver.'
    });
  }

  // Optional: verify email matches invited email (recommended)
  const userEmail = db.prepare('SELECT email FROM users WHERE id=?').get(req.user.id)?.email;
  if (userEmail && userEmail.toLowerCase() !== inv.invited_email.toLowerCase()) {
    return res.status(403).json({
      error: `This invitation was sent to ${inv.invited_email}. Please log in with that email address to accept.`
    });
  }

  // Create/activate the caregiver link
  const existing = db.prepare('SELECT * FROM caregiver_links WHERE patient_id=? AND caregiver_id=?')
    .get(inv.patient_id, req.user.id);

  const linkId = existing ? existing.id : newId('link');
  const perms = inv.permissions || '[]';

  if (existing) {
    db.prepare("UPDATE caregiver_links SET status='active', permissions=? WHERE id=?")
      .run(perms, linkId);
  } else {
    db.prepare('INSERT INTO caregiver_links (id, patient_id, caregiver_id, status, permissions) VALUES (?,?,?,?,?)')
      .run(linkId, inv.patient_id, req.user.id, 'active', perms);
  }

  // Mark invitation accepted
  db.prepare("UPDATE caregiver_invitations SET status='accepted', accepted_by=?, accepted_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(req.user.id, inv.id);

  // Notify the patient
  const patient = db.prepare('SELECT full_name FROM users WHERE id=?').get(inv.patient_id);
  const caregiver = db.prepare('SELECT full_name FROM users WHERE id=?').get(req.user.id);
  db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?,?,?,?,?)')
    .run(newId('n'), inv.patient_id,
      'Caregiver accepted your invitation',
      `${caregiver?.full_name || 'Your caregiver'} has accepted your invitation.`,
      'success');

  logAudit(req.user.id, 'caregiver_invitation_accept', 'invitation', inv.id, { patient: inv.patient_id }, req.ip);

  res.json({
    ok: true,
    message: 'Invitation accepted. You are now connected as a caregiver.',
    patientId: inv.patient_id,
    linkId
  });
}));

// ---------- Auth required: decline ----------
router.post('/:token/decline', authenticate, asyncHandler(async (req, res) => {
  const inv = db.prepare('SELECT * FROM caregiver_invitations WHERE token=?').get(req.params.token);
  if (!inv) return res.status(404).json({ error: 'Invitation not found' });
  if (inv.status !== 'pending') return res.status(410).json({ error: 'Invitation is no longer valid' });

  db.prepare("UPDATE caregiver_invitations SET status='declined' WHERE id=?").run(inv.id);
  logAudit(req.user.id, 'caregiver_invitation_decline', 'invitation', inv.id, null, req.ip);
  res.json({ ok: true, message: 'Invitation declined' });
}));

export default router;