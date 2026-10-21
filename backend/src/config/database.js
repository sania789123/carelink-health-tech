import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../db/carelink.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('patient','doctor','caregiver')),
  phone TEXT,
  language TEXT DEFAULT 'en',
  senior_mode INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS patient_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth TEXT, blood_group TEXT, address TEXT, emergency_contact TEXT
);
CREATE TABLE IF NOT EXISTS doctor_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  license_number TEXT, specialization TEXT, hospital TEXT
);
CREATE TABLE IF NOT EXISTS caregiver_links (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caregiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','active','revoked')),
  permissions TEXT DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(patient_id, caregiver_id)
);
CREATE TABLE IF NOT EXISTS caregiver_invitations (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_name TEXT,
  permissions TEXT DEFAULT '["view_reports","view_medicines","checkins"]',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','expired','cancelled')),
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  accepted_by TEXT REFERENCES users(id),
  accepted_at TEXT
);
CREATE TABLE IF NOT EXISTS doctor_access (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT, revoked INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  report_type TEXT DEFAULT 'lab',
  report_date TEXT, hospital TEXT, doctor_name TEXT,
  file_path TEXT, file_type TEXT,
  original_extraction TEXT, corrected_data TEXT,
  extraction_confidence TEXT DEFAULT '{}',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS report_corrections (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  corrected_by TEXT NOT NULL REFERENCES users(id),
  field_name TEXT, old_value TEXT, new_value TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  value REAL, value_text TEXT,
  unit TEXT, reference_range TEXT, flag TEXT,
  confidence TEXT DEFAULT 'high'
);
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  file_path TEXT, file_type TEXT,
  original_extraction TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected')),
  prescribed_date TEXT, doctor_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS medicines (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prescription_id TEXT REFERENCES prescriptions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  dosage TEXT, frequency TEXT,
  times TEXT DEFAULT '[]',
  duration_days INTEGER,
  start_date TEXT, instructions TEXT,
  confirmed INTEGER DEFAULT 0,
  uncertain_fields TEXT DEFAULT '[]',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS medicine_events (
  id TEXT PRIMARY KEY,
  medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_time TEXT, taken_at TEXT,
  status TEXT DEFAULT 'taken' CHECK(status IN ('taken','skipped','missed')),
  marked_by TEXT REFERENCES users(id),
  notes TEXT
);
CREATE TABLE IF NOT EXISTS share_tokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id),
  report_ids TEXT DEFAULT '[]',
  expires_at TEXT NOT NULL,
  revoked INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS share_access_log (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL REFERENCES share_tokens(id) ON DELETE CASCADE,
  accessed_by TEXT REFERENCES users(id),
  accessed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ip TEXT, action TEXT
);
CREATE TABLE IF NOT EXISTS care_plans (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL, description TEXT,
  start_date TEXT, end_date TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS care_tasks (
  id TEXT PRIMARY KEY,
  care_plan_id TEXT REFERENCES care_plans(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to TEXT REFERENCES users(id),
  title TEXT NOT NULL, description TEXT,
  task_type TEXT DEFAULT 'general',
  due_date TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','missed')),
  created_by TEXT NOT NULL REFERENCES users(id),
  completed_at TEXT, doctor_comment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS check_ins (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  care_plan_id TEXT REFERENCES care_plans(id) ON DELETE SET NULL,
  check_date TEXT NOT NULL,
  symptoms TEXT DEFAULT '[]',
  adherence TEXT,
  measurements TEXT DEFAULT '{}',
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, message TEXT,
  type TEXT DEFAULT 'info',
  read INTEGER DEFAULT 0,
  link TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT, resource_id TEXT,
  details TEXT, ip TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reports_patient ON reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_test_results_report ON test_results(report_id);
CREATE INDEX IF NOT EXISTS idx_medicines_patient ON medicines(patient_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_care_tasks_patient ON care_tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_inv_token ON caregiver_invitations(token);
CREATE INDEX IF NOT EXISTS idx_caregiver_inv_patient ON caregiver_invitations(patient_id);
`;

export function initDb() { db.exec(SCHEMA); console.log('DB schema initialized'); }

export function seedDb() {
  const existing = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (existing.c > 0) { console.log('Users exist, skipping seed.'); return; }
  const hash = (p) => bcrypt.hashSync(p, 10);
  const insUser = db.prepare('INSERT INTO users (id,email,password_hash,full_name,role,language) VALUES (?,?,?,?,?,?)');
  const insPat = db.prepare('INSERT INTO patient_profiles (user_id,blood_group,emergency_contact) VALUES (?,?,?)');
  const insDoc = db.prepare('INSERT INTO doctor_profiles (user_id,specialization,hospital) VALUES (?,?,?)');

  const tx = db.transaction(() => {
    insUser.run('pat-001','patient@demo.com',hash('Patient123!'),'Rajesh Kumar','patient','en');
    insPat.run('pat-001','O+','+91-9876543210');
    insUser.run('doc-001','doctor@demo.com',hash('Doctor123!'),'Dr. Anita Sharma','doctor','en');
    insDoc.run('doc-001','Internal Medicine','City General Hospital');
    insUser.run('cg-001','caregiver@demo.com',hash('Caregiver123!'),'Priya Kumar','caregiver','en');

    db.prepare('INSERT INTO caregiver_links (id,patient_id,caregiver_id,status,permissions) VALUES (?,?,?,?,?)')
      .run('link-001','pat-001','cg-001','active', JSON.stringify(['view_reports','view_medicines','upload_reports','checkins']));
    db.prepare('INSERT INTO doctor_access (id,patient_id,doctor_id,expires_at) VALUES (?,?,?,?)')
      .run('da-001','pat-001','doc-001', new Date(Date.now()+90*24*3600*1000).toISOString());

    db.prepare('INSERT INTO reports (id,patient_id,uploaded_by,title,report_type,report_date,hospital,doctor_name) VALUES (?,?,?,?,?,?,?,?)')
      .run('rep-001','pat-001','pat-001','Blood Test - Jan 2025','lab','2025-01-15','City Lab','Dr. Mehta');
    const tr = db.prepare('INSERT INTO test_results (id,report_id,test_name,value,unit,reference_range) VALUES (?,?,?,?,?,?)');
    tr.run('tr-1','rep-001','Hemoglobin', 11.2, 'g/dL', '13-17');
    tr.run('tr-2','rep-001','Blood Sugar (Fasting)', 142, 'mg/dL', '70-100');
    tr.run('tr-3','rep-001','Total Cholesterol', 240, 'mg/dL', '<200');

    db.prepare('INSERT INTO reports (id,patient_id,uploaded_by,title,report_type,report_date,hospital,doctor_name) VALUES (?,?,?,?,?,?,?,?)')
      .run('rep-002','pat-001','pat-001','Blood Test - Apr 2025','lab','2025-04-10','City Lab','Dr. Mehta');
    const tr2 = db.prepare('INSERT INTO test_results (id,report_id,test_name,value,unit,reference_range) VALUES (?,?,?,?,?,?)');
    tr2.run('tr-4','rep-002','Hemoglobin', 12.5, 'g/dL', '13-17');
    tr2.run('tr-5','rep-002','Blood Sugar (Fasting)', 118, 'mg/dL', '70-100');
    tr2.run('tr-6','rep-002','Total Cholesterol', 210, 'mg/dL', '<200');

    const med = db.prepare('INSERT INTO medicines (id,patient_id,name,dosage,frequency,times,duration_days,start_date,instructions,confirmed) VALUES (?,?,?,?,?,?,?,?,?,?)');
    med.run('med-1','pat-001','Metformin','500 mg','Twice daily', JSON.stringify(['08:00','20:00']),30,'2025-04-10','After meals',1);
    med.run('med-2','pat-001','Atorvastatin','10 mg','Once daily', JSON.stringify(['21:00']),30,'2025-04-10','At bedtime',1);

    db.prepare('INSERT INTO care_plans (id,patient_id,doctor_id,title,description,start_date,end_date) VALUES (?,?,?,?,?,?,?)')
      .run('cp-1','pat-001','doc-001','Diabetes Management Plan','Monitor sugar, take meds, follow diet','2025-04-10','2025-07-10');

    db.prepare('INSERT INTO care_tasks (id,care_plan_id,patient_id,assigned_to,title,task_type,due_date,created_by) VALUES (?,?,?,?,?,?,?,?)')
      .run('ct-1','cp-1','pat-001','pat-001','Daily morning sugar check','measurement','2025-04-30','doc-001');
    db.prepare('INSERT INTO care_tasks (id,care_plan_id,patient_id,assigned_to,title,task_type,due_date,created_by) VALUES (?,?,?,?,?,?,?,?)')
      .run('ct-2','cp-1','pat-001','cg-001','Upload monthly lab report','upload','2025-05-10','doc-001');

    db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)')
      .run('n-1','pat-001','Welcome to CareLink','Your account is ready. Start by uploading a report.','info');
  });
  tx();
  console.log('Demo data seeded');
  console.log('   patient@demo.com / Patient123!');
  console.log('   doctor@demo.com / Doctor123!');
  console.log('   caregiver@demo.com / Caregiver123!');
}

const arg = process.argv[2];
if (arg === '--init') { initDb(); process.exit(0); }
if (arg === '--seed') { initDb(); seedDb(); process.exit(0); }
initDb();