import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = db.prepare('SELECT id,email,full_name,role,language,senior_mode FROM users WHERE id=?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

export function canAccessPatient(user, patientId) {
  if (user.role === 'patient') return user.id === patientId;
  if (user.role === 'doctor') {
    return !!db.prepare("SELECT 1 FROM doctor_access WHERE patient_id=? AND doctor_id=? AND revoked=0 AND (expires_at IS NULL OR expires_at > datetime('now'))").get(patientId, user.id);
  }
  if (user.role === 'caregiver') {
    return !!db.prepare("SELECT 1 FROM caregiver_links WHERE patient_id=? AND caregiver_id=? AND status='active'").get(patientId, user.id);
  }
  return false;
}

export function requirePatientAccess(paramName = 'patientId') {
  return (req, res, next) => {
    const patientId = req.params[paramName] || req.body.patientId || req.query.patientId;
    if (!patientId) return res.status(400).json({ error: 'Patient id required' });
    if (!canAccessPatient(req.user, patientId))
      return res.status(403).json({ error: 'No access to this patient' });
    next();
  };
}
