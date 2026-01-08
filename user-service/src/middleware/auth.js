import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  console.log('\n========== JWT VERIFICATION START ==========');
  console.log(`[${new Date().toISOString()}] Verifying token for request:`, {
    method: req.method,
    path: req.path,
    url: req.originalUrl,
  });

  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader ? 'Present' : 'Missing');

  const token = authHeader?.split(' ')[1];

  if (!token) {
    console.log('❌ TOKEN VERIFICATION FAILED: No token provided');
    console.log('========== JWT VERIFICATION END ==========\n');
    return res.status(401).json({ error: 'No token provided' });
  }

  console.log('✓ Token extracted from header');
  console.log('Token (first 20 chars):', token.substring(0, 20) + '...');

  try {
    const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';
    console.log('Using JWT Secret:', jwtSecret === 'your_jwt_secret_key' ? '(default)' : '(from env)');

    const decoded = jwt.verify(token, jwtSecret);

    console.log('✓ JWT VERIFICATION SUCCESSFUL');
    console.log('Decoded token payload:', {
      id: decoded.id,
      email: decoded.email,
      metaBusinessAccountId: decoded.metaBusinessAccountId,
      iat: new Date(decoded.iat * 1000).toISOString(),
      exp: new Date(decoded.exp * 1000).toISOString(),
    });

    req.user = decoded;
    console.log('✓ User object attached to request');
    console.log('========== JWT VERIFICATION END ==========\n');
    next();
  } catch (error) {
    console.log('❌ TOKEN VERIFICATION FAILED');
    console.log('Error type:', error.name);
    console.log('Error message:', error.message);
    if (error.name === 'TokenExpiredError') {
      console.log('Token expired at:', new Date(error.expiredAt).toISOString());
    }
    console.log('========== JWT VERIFICATION END ==========\n');
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export default verifyToken;
