import { db } from '../config/database.js';
import { nanoid } from 'nanoid';

export function logAudit(userId, action, resourceType, resourceId, details, ip) {
  try {
    db.prepare('INSERT INTO audit_logs (id,user_id,action,resource_type,resource_id,details,ip) VALUES (?,?,?,?,?,?,?)')
      .run(nanoid(12), userId||null, action, resourceType||null, resourceId||null,
           details ? JSON.stringify(details) : null, ip||null);
  } catch (e) { console.error('Audit failed:', e.message); }
}
