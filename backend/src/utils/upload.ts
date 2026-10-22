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

// Storage configuration: memory for serverless (zero file loss), disk for local
const storage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, uploadDir);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `prod-${uniqueSuffix}${ext}`);
      },
    });

// File filter (images only: jpeg, jpg, png, webp)
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = file.mimetype.toLowerCase();

  if (allowed.test(ext) && (mime.includes('image/') || allowed.test(mime))) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, webp) are permitted.'));
  }
};

export const uploadProductImage = multer({
  storage,
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB limit for cloud persistence
  },
  fileFilter,
});
