import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import messageRoutes from './routes/messageRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';

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

// Raw body parser for webhook signature verification
app.use('/whatsapp-service/api/whatsapp/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp Service is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/messages', messageRoutes); // Legacy routes
app.use('/whatsapp-service/api/whatsapp', whatsappRoutes); // New comprehensive routes

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
  console.log(`WhatsApp Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
