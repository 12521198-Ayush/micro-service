import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import planRoutes from './routes/PlanRoutes.js';
import subscriptionRoutes from './routes/SubscriptionRoutes.js';
import usageRoutes from './routes/UsageRoutes.js';
import transactionRoutes from './routes/TransactionRoutes.js';
import promoRoutes from './routes/PromoRoutes.js';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

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
    message: 'Subscription Service is running',
    timestamp: new Date().toISOString(),
    service: 'subscription-service',
    version: '1.0.0',
  });
});

// API Routes
app.use('/subscription-service/api', planRoutes);
app.use('/subscription-service/api/subscriptions', subscriptionRoutes);
app.use('/subscription-service/api/usage', usageRoutes);
app.use('/subscription-service/api/transactions', transactionRoutes);
app.use('/subscription-service/api/promo-codes', promoRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found - ${req.originalUrl}`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       SUBSCRIPTION SERVICE - WhatsApp Business API        ║
║                                                           ║
║   Port: ${PORT}                                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                               ║
║   Database: MySQL                                         ║
║   Cache: Redis                                            ║
║   Currency: INR (₹)                                       ║
║                                                           ║
║   Ready to accept requests! 🚀                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
