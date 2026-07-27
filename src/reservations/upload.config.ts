import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

export const RESERVATION_DOC_UPLOAD_DIR = './uploads/reservations';

// Requirement documents (valid ID, driver's licence) attached to a booking.
// Same disk-storage approach as avatars and product images.
export const reservationDocUpload = {
  storage: diskStorage({
    destination: RESERVATION_DOC_UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (/^image\/(jpe?g|png|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Upload a JPG, PNG or WEBP image'), false);
    }
  },
};
