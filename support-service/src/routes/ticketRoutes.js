import express from 'express';
import {
  createTicket,
  getUserTickets,
  getTicketDetails,
  replyToTicket,
  submitFeedback,
  getAllTickets,
  assignTicket,
  updateTicketStatus,
  updateTicketPriority,
  getAnalytics,
  reopenTicket,
} from '../controllers/ticketController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// User routes
router.post('/', verifyToken, createTicket);
router.get('/my-tickets', verifyToken, getUserTickets);
router.get('/:ticketId', verifyToken, getTicketDetails);
router.post('/:ticketId/reply', verifyToken, replyToTicket);
router.post('/:ticketId/feedback', verifyToken, submitFeedback);
router.post('/:ticketId/reopen', verifyToken, reopenTicket);

// Admin routes
router.get('/', verifyToken, getAllTickets);
router.post('/:ticketId/assign', verifyToken, assignTicket);
router.put('/:ticketId/status', verifyToken, updateTicketStatus);
router.put('/:ticketId/priority', verifyToken, updateTicketPriority);
router.get('/analytics/dashboard', verifyToken, getAnalytics);

export default router;