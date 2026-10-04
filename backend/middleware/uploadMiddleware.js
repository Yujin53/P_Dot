const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure base upload folders exist
const baseUploadDir = path.join(__dirname, '../uploads');
const folders = ['profiles', 'driver-documents', 'vehicles', 'support'];
folders.forEach(dir => {
  const p = path.join(baseUploadDir, dir);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
});

// Create storage engine
const createStorage = (subfolder) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = path.join(baseUploadDir, subfolder);
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      // Create safe sanitized unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
  });
};

// File filters
const imageFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only images (jpg, jpeg, png, webp) are permitted'));
};

const docFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|pdf/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype) || file.mimetype === 'application/pdf';

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpg, png) or PDF documents are permitted'));
};

const uploadProfile = multer({
  storage: createStorage('profiles'),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: imageFileFilter
});

const uploadVehicle = multer({
  storage: createStorage('vehicles'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFileFilter
});

const uploadDriverDoc = multer({
  storage: createStorage('driver-documents'),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
  fileFilter: docFileFilter
});

const uploadSupport = multer({
  storage: createStorage('support'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: docFileFilter
});

module.exports = {
  uploadProfile,
  uploadVehicle,
  uploadDriverDoc,
  uploadSupport
};
