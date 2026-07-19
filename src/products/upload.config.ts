import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

export const PRODUCT_UPLOAD_DIR = './uploads/products';

export const productImageUpload = {
  storage: diskStorage({
    destination: PRODUCT_UPLOAD_DIR,
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
    if (/^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Only image files are allowed'), false);
    }
  },
};
