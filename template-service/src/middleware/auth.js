import jwt from 'jsonwebtoken';
import AppError from '../errors/AppError.js';
import env from '../config/env.js';

const buildUserContext = (decodedToken) => {
  const userIdCandidate =
    decodedToken.id ??
    decodedToken.userId ??
    decodedToken.user_id ??
    decodedToken.sub;

  const userId = Number.parseInt(userIdCandidate, 10);

  const metaBusinessAccountId =
    decodedToken.metaBusinessAccountId ||
    decodedToken.meta_business_account_id ||
    decodedToken.whatsappBusinessAccountId ||
    env.defaultMetaBusinessAccountId ||
    null;
  const metaAppId =
    decodedToken.metaAppId ||
    decodedToken.meta_app_id ||
    decodedToken.appId ||
    decodedToken.app_id ||
    env.metaAppId ||
    null;

  return {
    ...decodedToken,
    userId: Number.isFinite(userId) ? userId : null,
    id: Number.isFinite(userId) ? userId : null,
    metaBusinessAccountId,
    metaAppId,
  };
};

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (!token || scheme !== 'Bearer') {
      throw new AppError(401, 'Authorization token is required', {
        code: 'AUTH_TOKEN_MISSING',
      });
    }

    const decodedToken = jwt.verify(token, env.jwtSecret);
    const userContext = buildUserContext(decodedToken);

    if (!userContext.userId) {
      throw new AppError(401, 'Token payload is missing a valid user id', {
        code: 'AUTH_INVALID_TOKEN_PAYLOAD',
      });
    }

    req.user = userContext;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(
      new AppError(401, 'Invalid or expired token', {
        code: 'AUTH_INVALID_TOKEN',
      })
    );
  }
};

export default verifyToken;
