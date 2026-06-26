import multer from "multer";
import path from "path";
import fs from "fs";
import { storeFile } from "../services/storage.service.js";

const uploadDir = path.join(process.cwd(), 'src', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

export const parseMultipart = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  upload.any()(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    // Coerce common types coming from FormData (since everything is sent as a string)
    for (const [k, v] of Object.entries(req.body || {})) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string') {
        if (v === 'true') {
          req.body[k] = true;
        } else if (v === 'false') {
          req.body[k] = false;
        } else if (/^-?\d+(\.\d+)?$/.test(v)) {
          // Coerce numeric values for common fields
          const numericFields = [
            'experienceYears', 'year', 'amount', 'weight', 'rankingPoints',
            'maxParticipants', 'degree', 'jiujitsuBlackBeltDegree', 'newazaBlackBeltDegree',
            'licenseYear'
          ];
          if (numericFields.includes(k)) {
            req.body[k] = Number(v);
          }
        }
      }
    }

    if (req.files && req.files.length > 0) {
      try {
        const endpoint = req.baseUrl ? req.baseUrl.split('/').pop() : 'uploads';
        for (const file of req.files) {
          const result = await storeFile(file, endpoint);
          req.body[file.fieldname] = result.url;
        }
      } catch (storeErr) {
        // Cleanup uploaded files on failure
        for (const file of req.files) {
          if (fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch (e) {
              console.error('Failed to delete temp file:', e);
            }
          }
        }
        return next(storeErr);
      }
    }
    next();
  });
};

export default upload;