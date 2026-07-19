import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

export const BUSINESS_UPLOAD_DIR = './uploads/businesses';

export const businessImageUpload = {
  storage: diskStorage({
    destination: BUSINESS_UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (/^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Only image files are allowed'), false);
    }
  },
};
