const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, callback) => callback(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
  storage,
  limits: { files: 3, fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

const router = express.Router();
router.post('/', upload.array('images', 3), (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  res.json({ urls: req.files.map(file => `${origin}/uploads/${file.filename}`) });
});
module.exports = router;
