import crypto from 'crypto';
export const generateShareToken = () => crypto.randomBytes(32).toString('base64url');
export const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
