import multer from 'multer';
import path from 'path';
import fs from 'fs';

// On serverless platforms like Vercel, use memory storage to store as persistent base64 data URI
// On local server, use disk storage
const isVercel = Boolean(process.env.VERCEL);

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!isVercel && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed extensions and MIME types whitelist (Strictly no SVG to prevent XSS)
const ALLOWED_EXTENSIONS = new Set(['jpeg', 'jpg', 'png', 'webp']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Storage configuration: memory for serverless (zero file loss), disk for local
const storage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, uploadDir);
      },
      filename: (_req, file, cb) => {
        const rawExt = path.extname(file.originalname).toLowerCase().replace('.', '');
        const safeExt = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : 'jpg';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e8)}`;
        cb(null, `prod-${uniqueSuffix}.${safeExt}`);
      },
    });

// File filter (strict whitelist verification)
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = (file.mimetype || '').toLowerCase().trim();

  if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIME_TYPES.has(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Security violation: Only legitimate JPEG, PNG, and WebP image files are permitted.'));
  }
};

export const uploadProductImage = multer({
  storage,
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB maximum file size
    files: 1, // Only 1 file per request
  },
  fileFilter,
});
