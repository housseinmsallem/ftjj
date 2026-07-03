import { Router } from 'express';
import multer from 'multer';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { importClubAthletes, getImportBatches } from '../controllers/federalIntegration.controller.js';

const router = Router();

// Use memory storage so we can pass the buffer to the parsing service
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];
    const ext = (file.originalname || '').toLowerCase().split('.').pop();
    const allowedExts = ['xlsx', 'xls', 'csv'];

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporte. Utilisez XLSX ou CSV.'));
    }
  }
});

// Import athletes - accessible to CLUB_ADMIN and FEDERATION_ADMIN
router.post(
  '/athletes',
  protect,
  allowRoles('CLUB_ADMIN', 'FEDERATION_ADMIN', 'SUPER_ADMIN'),
  upload.single('file'),
  importClubAthletes
);

// Get import batch history
router.get(
  '/batches',
  protect,
  allowRoles('CLUB_ADMIN', 'FEDERATION_ADMIN', 'SUPER_ADMIN'),
  getImportBatches
);

router.get(
  '/batches/:clubId',
  protect,
  allowRoles('FEDERATION_ADMIN', 'SUPER_ADMIN'),
  getImportBatches
);

export default router;
