import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

const MAX_UPLOAD_LABEL = '5 MB';

// Multer throws its own error type when a file breaks one of the limits in the
// upload configs. Without this it surfaces as an opaque 500, so the client can
// only show "upload failed". Mapping it gives the user the actual reason.
@Catch(MulterError)
export class UploadExceptionFilter implements ExceptionFilter {
  catch(error: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const status =
      error.code === 'LIMIT_FILE_SIZE'
        ? HttpStatus.PAYLOAD_TOO_LARGE
        : HttpStatus.BAD_REQUEST;

    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? `That image is too large — the limit is ${MAX_UPLOAD_LABEL}. Please pick a smaller photo.`
        : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Upload one image at a time.'
          : 'That image could not be uploaded.';

    response.status(status).json({ statusCode: status, message });
  }
}
