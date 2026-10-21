import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = ['application/pdf','image/jpeg','image/jpg','image/png'];
const MAX_MB = Number(process.env.MAX_FILE_SIZE_MB || 10);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, nanoid(16) + path.extname(file.originalname).toLowerCase())
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) return cb(new Error('Only PDF, JPG, JPEG, PNG allowed'));
    cb(null, true);
  }
});
