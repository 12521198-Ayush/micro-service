export default class AppError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = options.code || 'APP_ERROR';
    this.details = options.details || null;
    this.expose = options.expose ?? statusCode < 500;
    this.cause = options.cause;
  }
}
