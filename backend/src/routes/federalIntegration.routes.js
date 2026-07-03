import { Router } from 'express';
import multer from 'multer';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import {
  approveAffiliationAndCreateAccess,
  importClubAthletes,
  getImportBatches,
  federationCorrectAthlete,
  requestAssociationTransfer,
  decideAssociationTransfer,
  listTransfers
} from '../controllers/federalIntegration.controller.js';

const router = Router();

// ──────────────────────────────────────────────
// Authentication — all routes require a valid token
// ──────────────────────────────────────────────
router.use(protect);

// ──────────────────────────────────────────────
// Multer configuration for safe file ingestion
// ──────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1
  },
  fileFilter: (_req, file, cb) => {
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
      cb(new Error('Format de fichier non supporte. Utilisez XLSX, XLS ou CSV.'));
    }
  }
});

// ──────────────────────────────────────────────
// 1. Club Affiliation Approval
//    PATCH /clubs/:id/approve-affiliation
// ──────────────────────────────────────────────
router.patch(
  '/clubs/:id/approve-affiliation',
  allowRoles('FEDERATION_ADMIN'),
  approveAffiliationAndCreateAccess
);

// ──────────────────────────────────────────────
// 2. Athlete Batch Imports
//    POST   /import/athletes
//    GET    /import/batches
//    GET    /import/batches/:clubId
// ──────────────────────────────────────────────
router.post(
  '/import/athletes',
  allowRoles('CLUB_ADMIN', 'FEDERATION_ADMIN', 'SUPER_ADMIN'),
  upload.single('file'),
  importClubAthletes
);

router.get(
  '/import/batches',
  allowRoles('CLUB_ADMIN', 'FEDERATION_ADMIN', 'SUPER_ADMIN'),
  getImportBatches
);

router.get(
  '/import/batches/:clubId',
  allowRoles('FEDERATION_ADMIN', 'SUPER_ADMIN'),
  getImportBatches
);

// ──────────────────────────────────────────────
// 3. Manual Profile Correction
//    PATCH /athletes/:athleteId/correct
// ──────────────────────────────────────────────
router.patch(
  '/athletes/:athleteId/correct',
  allowRoles('FEDERATION_ADMIN'),
  federationCorrectAthlete
);

// ──────────────────────────────────────────────
// 4. Transfer Initiation
//    POST   /transfers
//    GET    /transfers
// ──────────────────────────────────────────────
router.post(
  '/transfers',
  allowRoles('CLUB_ADMIN', 'FEDERATION_ADMIN', 'SUPER_ADMIN'),
  requestAssociationTransfer
);

router.get(
  '/transfers',
  allowRoles('CLUB_ADMIN', 'FEDERATION_ADMIN', 'SUPER_ADMIN'),
  listTransfers
);

// ──────────────────────────────────────────────
// 5. Transfer Evaluation
//    PATCH /transfers/:transferId/decide
// ──────────────────────────────────────────────
router.patch(
  '/transfers/:transferId/decide',
  allowRoles('FEDERATION_ADMIN'),
  decideAssociationTransfer
);

export default router;
