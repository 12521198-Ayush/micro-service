import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { createTrafficLogger } from '../../shared/trafficLogger.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import flowRoutes from './routes/flowRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Traffic logger - writes req/res to logs/automation-service-YYYY-MM-DD.log
const [captureRes, logTraffic] = createTrafficLogger('automation-service', morgan);
app.use(captureRes);
app.use(logTraffic);

// Serve uploaded media files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Automation Service is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/flows', flowRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3008;

app.listen(PORT, () => {
  console.log(`Automation Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
