import AppError from '../errors/AppError.js';

export const notFoundHandler = (req, res, next) => {
  next(new AppError(404, 'Route not found', { code: 'ROUTE_NOT_FOUND' }));
};

export default notFoundHandler;
