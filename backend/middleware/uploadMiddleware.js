import multer from 'multer';
import path from 'path';

// Use memory storage — file is in RAM as a Buffer (works on Render, no disk needed)
const storage = multer.memoryStorage();

// File filter to restrict to Excel/CSV files
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export default upload;
