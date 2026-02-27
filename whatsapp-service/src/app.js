import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { createTrafficLogger } from '../../shared/trafficLogger.mjs';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import messageRoutes from './routes/messageRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:3001', 'https://frontend.nyife.chat', process.env.FRONTEND_URL].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/whatsapp-service/socket.io'
});

// Make io accessible to routes
app.set('io', io);

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Join rooms based on auth
  socket.on('join', (data) => {
    if (data.userId) {
      socket.join(`user:${data.userId}`);
      console.log(`Socket ${socket.id} joined user:${data.userId}`);
    }
    if (data.phoneNumberId) {
      socket.join(`phone:${data.phoneNumberId}`);
    }
  });

  // Join a specific chat room
  socket.on('join_chat', (phoneNumber) => {
    socket.join(`chat:${phoneNumber}`);
    console.log(`Socket ${socket.id} joined chat:${phoneNumber}`);
  });

  socket.on('leave_chat', (phoneNumber) => {
    socket.leave(`chat:${phoneNumber}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

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

// Traffic logger - writes req/res to logs/whatsapp-service-YYYY-MM-DD.log
const [captureRes, logTraffic] = createTrafficLogger('whatsapp-service', morgan);
app.use(captureRes);
app.use(logTraffic);

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
app.use('/whatsapp-service/api/chats', chatRoutes); // Chat/Inbox routes

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3006;

server.listen(PORT, () => {
  console.log(`WhatsApp Service running on port ${PORT}`);
  console.log(`Socket.IO enabled at /whatsapp-service/socket.io`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start Kafka consumer for real-time events (non-blocking)
  startRealtimeConsumer().catch(err => {
    console.error('Failed to start realtime consumer (non-critical):', err.message);
  });
});

// Kafka consumer for real-time message/status events
async function startRealtimeConsumer() {
  try {
    const { Kafka } = await import('kafkajs');
    
    const kafka = new Kafka({
      clientId: 'whatsapp-service-realtime',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9093').split(','),
    });

    const consumer = kafka.consumer({ groupId: 'whatsapp-realtime-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'message.status', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          
          if (event.event === 'incoming_message') {
            // Broadcast to all connected clients and specific chat room
            io.emit('new_message', event);
            io.to(`chat:${event.from}`).emit('chat_message', event);
            console.log(`[RT] Incoming message from ${event.from}`);
          } else if (event.event === 'status_update') {
            // Broadcast status updates
            io.emit('message_status', event);
            if (event.recipientId) {
              io.to(`chat:${event.recipientId}`).emit('chat_status', event);
            }
          }
        } catch (err) {
          console.error('Realtime event error:', err.message);
        }
      }
    });

    console.log('Real-time Kafka consumer started for message.status topic');
  } catch (error) {
    console.error('Kafka realtime consumer error:', error.message);
  }
}

export { io };
export default app;
