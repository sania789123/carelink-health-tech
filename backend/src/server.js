import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import './config/database.js';

import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import doctorRoutes from './routes/doctors.js';
import caregiverRoutes from './routes/caregivers.js';
import medicineRoutes from './routes/medicines.js';
import reportRoutes from './routes/reports.js';
import healthchangeRoutes from './routes/healthchange.js';
import qrshareRoutes from './routes/qrshare.js';
import carecircleRoutes from './routes/carecircle.js';
import recoverytrackRoutes from './routes/recoverytrack.js';
import notificationRoutes from './routes/notifications.js';
import invitationRoutes from './routes/invitations.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'carelink-api', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/healthchange', healthchangeRoutes);
app.use('/api/qrshare', qrshareRoutes);
app.use('/api/carecircle', carecircleRoutes);
app.use('/api/recoverytrack', recoverytrackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invitations', invitationRoutes);

app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large' });
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('CareLink backend running on http://localhost:' + PORT);
});