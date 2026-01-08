import express from 'express';
import 'dotenv/config';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import templateRoutes from './routes/templates.js';
import { connectRedis } from './config/redis.js';

const app = express();

// Initialize Redis connection
connectRedis();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'Template Service is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/templates', templateRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Template Service started on port ${PORT}`);
});
