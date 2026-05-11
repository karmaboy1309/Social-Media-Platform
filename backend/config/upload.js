const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ══════════════════════════════════════════════════════
// File Upload Configuration (Multer)
// ══════════════════════════════════════════════════════
// Provides configured multer instances for different
// upload scenarios (profile pictures, post images).
// ══════════════════════════════════════════════════════

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Allowed image types ──
const ALLOWED_TYPES = /jpeg|jpg|png|gif|webp/;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

// ── Storage: Save files to /uploads with unique names ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// ── Filter: Only allow image files ──
const imageFilter = (req, file, cb) => {
  const extValid = ALLOWED_TYPES.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimeValid = ALLOWED_TYPES.test(file.mimetype);

  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname),
      false
    );
  }
};

// ── Base multer instance ──
const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ── Multer error handling middleware ──
// Place AFTER any multer upload middleware in the route chain
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: `File too large — maximum size is ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB`,
      LIMIT_UNEXPECTED_FILE: 'Only image files (jpeg, jpg, png, gif, webp) are allowed',
      LIMIT_FILE_COUNT: 'Too many files uploaded',
      LIMIT_PART_COUNT: 'Too many parts in upload',
    };

    return res.status(400).json({
      success: false,
      message: messages[err.code] || `Upload error: ${err.message}`,
    });
  }

  if (err && err.message && err.message.includes('image')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
};

// ── Helper: Delete uploaded file ──
const deleteFile = (filename) => {
  if (!filename || filename === 'default-avatar.png') return;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error(`Failed to delete file ${filename}:`, err.message);
    }
  });
};

module.exports = { upload, handleMulterError, deleteFile };
