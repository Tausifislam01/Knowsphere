// backend/middleware/media.js
// Thin middleware: Multer (memory) + validation. No Cloudinary logic here.

const multer = require('multer');

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
      err.message = 'Only JPG, PNG, or WebP images are allowed.';
      return cb(err);
    }
    cb(null, true);
  },
});

// Matches your UI key name <input name="profilePicture" .../>
const uploadAvatar = upload.single('profilePicture');

module.exports = { uploadAvatar };
