const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads', 'support');
fs.mkdirSync(uploadsRoot, { recursive: true });

// Max 1 MB per file
const MAX_FILE_SIZE = 1 * 1024 * 1024;

// Allowed: images + common document types
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/json',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    const safeExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      const err = new Error('Unsupported file type. Allowed: images, PDF, DOC, XLS, TXT, CSV, ZIP, JSON.');
      err.code = 'UNSUPPORTED_TYPE';
      return cb(err);
    }
    cb(null, true);
  },
});

/**
 * POST /api/support/upload
 * Accepts up to 5 files under field name "files", each up to 1 MB.
 * Returns: { success, data: { urls: string[], files: { name, size, mimeType, url }[] } }
 */
const uploadSupportFiles = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const files = req.files.map((f) => ({
      name: f.originalname,
      size: f.size,
      mimeType: f.mimetype,
      url: `${baseUrl}/uploads/support/${f.filename}`,
    }));
    return res.json({ success: true, data: { urls: files.map((f) => f.url), files } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  upload,
  uploadSupportFiles,
  MAX_FILE_SIZE,
  ALLOWED_MIME,
};
