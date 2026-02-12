import multer from 'multer';
import env from '../config/env.js';
import AppError from '../errors/AppError.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.templateMediaMaxBytes,
    files: 1,
    fields: 20,
  },
});

const toUploadError = (error) => {
  if (!(error instanceof multer.MulterError)) {
    return new AppError(422, 'Invalid multipart/form-data payload', {
      code: 'INVALID_MULTIPART_PAYLOAD',
      details: { message: error.message },
    });
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError(413, 'Uploaded file exceeds configured size limit.', {
      code: 'MEDIA_FILE_TOO_LARGE',
      details: {
        maxBytes: env.templateMediaMaxBytes,
      },
    });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return new AppError(422, 'Only one file upload is allowed.', {
      code: 'INVALID_FILE_COUNT',
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(422, "Unexpected upload field. Use form-data field name 'file'.", {
      code: 'INVALID_FILE_FIELD',
      details: {
        expectedField: 'file',
      },
    });
  }

  return new AppError(422, 'Invalid multipart/form-data payload', {
    code: 'INVALID_MULTIPART_PAYLOAD',
    details: {
      multerCode: error.code,
      message: error.message,
    },
  });
};

export const uploadTemplateMediaFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    next(toUploadError(error));
  });
};

export default uploadTemplateMediaFile;
