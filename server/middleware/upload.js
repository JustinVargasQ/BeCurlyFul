const multer     = require('multer');
const path       = require('path');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
};

const MAGIC = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

function matchesMagic(buffer, mime) {
  const entry = MAGIC.find((m) => m.mime === mime);
  if (!entry) return false;
  return entry.bytes.every((b, i) => buffer[i] === b);
}

const fileFilter = (req, file, cb) => {
  const ext    = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED[ext];
  if (!mimeOk || file.mimetype !== mimeOk) {
    return cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
  cb(null, true);
};

// Store in memory — no disk write, validated then streamed to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

function streamToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'becurlyfulcr', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// Validate magic bytes then upload each file to Cloudinary.
// Attaches req.cloudinaryFiles = [{ url, publicId }] for the controller.
upload.toCloud = async (req, res, next) => {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  if (!files.length) return next();

  const results = [];
  for (const f of files) {
    if (!matchesMagic(f.buffer, f.mimetype)) {
      return res.status(400).json({ error: 'El archivo no es una imagen válida.' });
    }
    try {
      const result = await streamToCloudinary(f.buffer);
      results.push({ url: result.secure_url, publicId: result.public_id });
    } catch {
      return res.status(500).json({ error: 'Error al subir la imagen a la nube.' });
    }
  }
  req.cloudinaryFiles = results;
  next();
};

// Delete an image from Cloudinary by its public_id
upload.deleteFromCloud = (publicId) =>
  cloudinary.uploader.destroy(publicId).catch(() => {});

module.exports = upload;
