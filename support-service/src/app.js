import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import ticketRoutes from './routes/ticketRoutes.js';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

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
    message: 'Support Service is running',
    timestamp: new Date().toISOString(),
    service: 'support-service',
    version: '1.0.0',
  });
});

// API Routes
app.use('/support-service/api/tickets', ticketRoutes);

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
║         SUPPORT TICKET SERVICE - Customer Support        ║
║                                                           ║
║   Port: ${PORT}                                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                               ║
║   Database: MySQL                                         ║
║   Cache: Redis                                            ║
║                                                           ║
║   Ready to accept requests! 🎫                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
