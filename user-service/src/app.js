import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import embeddedSignupRoutes from './routes/embeddedSignupRoutes.js';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize connections
const initializeConnections = async () => {
  await connectDB();
  await connectRedis();
};

initializeConnections();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'User Service is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/user-service/api/auth', authRoutes);
app.use('/user-service/api/organization', organizationRoutes);
app.use('/user-service/api/wallet', walletRoutes);
app.use('/user-service/api/embedded-signup', embeddedSignupRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found - ${req.originalUrl}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});