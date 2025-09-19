'use strict';
const multer = require('multer');

const storage = multer.memoryStorage();
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','image/gif']);

function fileFilter(req, file, cb) {
  if (ALLOWED.has(file.mimetype)) return cb(null, true);
  return cb(new Error('Only image uploads are allowed'));
}

const MAX_SIZE_MB = parseInt(process.env.UPLOAD_MAX_MB || '5', 10);
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

const uploadAvatar = upload.single('profilePicture');

module.exports = { uploadAvatar };
