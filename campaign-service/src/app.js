import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { createTrafficLogger } from '../../shared/trafficLogger.mjs';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import campaignRoutes from './routes/campaignRoutes.js';

dotenv.config();

const app = express();

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

// Traffic logger - writes req/res to logs/campaign-service-YYYY-MM-DD.log
const [captureRes, logTraffic] = createTrafficLogger('campaign-service', morgan);
app.use(captureRes);
app.use(logTraffic);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Campaign Service is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/campaigns', campaignRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`Campaign Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
