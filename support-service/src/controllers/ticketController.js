import SupportTicket from '../models/supportTicket.js';
import TicketMessage from '../models/ticketMessage.js';
import TicketFeedback from '../models/ticketFeedBack.js';
import pool from '../config/database.js';

/**
 * Create new support ticket
 */
export const createTicket = async (req, res) => {
  console.log('\n========== CREATE TICKET START ==========');

  try {
    const { subject, description, category, priority, tags, attachments } = req.body;

    // Validate input
    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        error: 'Subject and description are required',
      });
    }

    const result = await SupportTicket.create(req.user.id, {
      subject,
      description,
      category: category || 'GENERAL',
      priority: priority || 'MEDIUM',
      tags,
      attachments,
    });

    console.log('✓ Ticket created:', result.ticketNumber);
    console.log('========== CREATE TICKET END ==========\n');

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: {
        ticketId: result.id,
        ticketNumber: result.ticketNumber,
      },
    });
  } catch (error) {
    console.error('❌ CREATE TICKET ERROR:', error);
    console.log('========== CREATE TICKET END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to create support ticket',
    });
  }
};

/**
 * Get user's tickets
 */
export const getUserTickets = async (req, res) => {
  console.log('\n========== GET USER TICKETS START ==========');

  try {
    const filters = {
      status: req.query.status,
      category: req.query.category,
      priority: req.query.priority,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    const tickets = await SupportTicket.getUserTickets(req.user.id, filters);
    const totalCount = await SupportTicket.getTicketCount(filters, req.user.id);

    console.log('✓ Tickets fetched:', tickets.length);
    console.log('========== GET USER TICKETS END ==========\n');

    res.status(200).json({
      success: true,
      count: tickets.length,
      totalCount,
      data: tickets.map(t => ({
        id: t.id,
        ticketNumber: t.ticket_number,
        subject: t.subject,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        hasFeedback: t.has_feedback,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        resolvedAt: t.resolved_at,
      })),
    });
  } catch (error) {
    console.error('❌ GET USER TICKETS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets',
    });
  }
};

/**
 * Get single ticket details
 */
export const getTicketDetails = async (req, res) => {
  console.log('\n========== GET TICKET DETAILS START ==========');

  try {
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findById(ticketId, req.user.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Get messages
    const isAdmin = (process.env.ADMIN_EMAILS || '').split(',').includes(req.user.email);
    const messages = await TicketMessage.getTicketMessages(ticketId, isAdmin);

    // Get feedback if exists
    const feedback = await TicketFeedback.findByTicketId(ticketId);

    console.log('✓ Ticket details fetched');
    console.log('========== GET TICKET DETAILS END ==========\n');

    res.status(200).json({
      success: true,
      data: {
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          subject: ticket.subject,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          assignedTo: ticket.assigned_to,
          assignedAt: ticket.assigned_at,
          resolvedBy: ticket.resolved_by,
          resolvedAt: ticket.resolved_at,
          resolutionTime: ticket.resolution_time,
          hasFeedback: ticket.has_feedback,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
        },
        messages: messages.map(m => ({
          id: m.id,
          message: m.message,
          messageType: m.message_type,
          userId: m.user_id,
          isInternal: m.is_internal,
          createdAt: m.created_at,
        })),
        feedback: feedback ? {
          overallRating: feedback.overall_rating,
          responseTimeRating: feedback.response_time_rating,
          solutionQualityRating: feedback.solution_quality_rating,
          supportAgentRating: feedback.support_agent_rating,
          comment: feedback.comment,
          wouldRecommend: feedback.would_recommend,
          createdAt: feedback.created_at,
        } : null,
      },
    });
  } catch (error) {
    console.error('❌ GET TICKET DETAILS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket details',
    });
  }
};

/**
 * Reply to ticket
 */
export const replyToTicket = async (req, res) => {
  console.log('\n========== REPLY TO TICKET START ==========');

  try {
    const { ticketId } = req.params;
    const { message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const ticket = await SupportTicket.findById(ticketId, req.user.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Check if ticket is closed
    if (ticket.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        error: 'Cannot reply to closed ticket',
      });
    }

    const isAdmin = (process.env.ADMIN_EMAILS || '').split(',').includes(req.user.email);
    const messageType = isAdmin ? 'ADMIN_REPLY' : 'USER_REPLY';

    const messageId = await TicketMessage.create(ticketId, req.user.id, {
      message,
      messageType,
      attachments,
    });

    // Update ticket status if user replied to resolved ticket
    if (ticket.status === 'RESOLVED' && !isAdmin) {
      await SupportTicket.reopen(ticketId, req.user.id);
    }

    // Log activity
    await SupportTicket.logActivity(ticketId, req.user.id, 'REPLIED');

    console.log('✓ Reply added to ticket');
    console.log('========== REPLY TO TICKET END ==========\n');

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: {
        messageId,
        ticketId,
      },
    });
  } catch (error) {
    console.error('❌ REPLY TO TICKET ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add reply',
    });
  }
};

/**
 * Submit feedback for resolved ticket
 */
export const submitFeedback = async (req, res) => {
  console.log('\n========== SUBMIT FEEDBACK START ==========');

  try {
    const { ticketId } = req.params;
    const {
      overallRating,
      responseTimeRating,
      solutionQualityRating,
      supportAgentRating,
      comment,
      wouldRecommend,
      feedbackTags,
    } = req.body;

    // Validate
    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Overall rating is required and must be between 1 and 5',
      });
    }

    const ticket = await SupportTicket.findById(ticketId, req.user.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
      return res.status(400).json({
        success: false,
        error: 'Can only submit feedback for resolved or closed tickets',
      });
    }

    if (ticket.has_feedback) {
      return res.status(400).json({
        success: false,
        error: 'Feedback already submitted for this ticket',
      });
    }

    await TicketFeedback.create(ticketId, req.user.id, {
      overallRating,
      responseTimeRating,
      solutionQualityRating,
      supportAgentRating,
      comment,
      wouldRecommend,
      feedbackTags,
    });

    await SupportTicket.logActivity(ticketId, req.user.id, 'FEEDBACK_SUBMITTED');

    console.log('✓ Feedback submitted');
    console.log('========== SUBMIT FEEDBACK END ==========\n');

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('❌ SUBMIT FEEDBACK ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
    });
  }
};

/**
 * Get all tickets with advanced filters (Admin)
 */
export const getAllTickets = async (req, res) => {
  console.log('\n========== GET ALL TICKETS (ADMIN) START ==========');

  try {
    const filters = {
      status: req.query.status,
      category: req.query.category,
      priority: req.query.priority,
      assignedTo: req.query.assignedTo,
      unassigned: req.query.unassigned,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    const tickets = await SupportTicket.getAllTickets(filters);
    const totalCount = await SupportTicket.getTicketCount(filters);

    console.log('✓ All tickets fetched:', tickets.length);
    console.log('========== GET ALL TICKETS END ==========\n');

    res.status(200).json({
      success: true,
      count: tickets.length,
      totalCount,
      data: tickets.map(t => ({
        id: t.id,
        ticketNumber: t.ticket_number,
        userId: t.user_id,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        assignedTo: t.assigned_to,
        resolvedBy: t.resolved_by,
        resolutionTime: t.resolution_time,
        hasFeedback: t.has_feedback,
        createdAt: t.created_at,
        resolvedAt: t.resolved_at,
      })),
    });
  } catch (error) {
    console.error('❌ GET ALL TICKETS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets',
    });
  }
};

/**
 * Assign ticket to agent (Admin)
 */
export const assignTicket = async (req, res) => {
  console.log('\n========== ASSIGN TICKET START ==========');

  try {
    const { ticketId } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        error: 'Assigned to user ID is required',
      });
    }

    await SupportTicket.update(ticketId, req.user.id, { assigned_to: assignedTo });

    console.log('✓ Ticket assigned');
    console.log('========== ASSIGN TICKET END ==========\n');

    res.status(200).json({
      success: true,
      message: 'Ticket assigned successfully',
    });
  } catch (error) {
    console.error('❌ ASSIGN TICKET ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign ticket',
    });
  }
};

/**
 * Update ticket status (Admin)
 */
export const updateTicketStatus = async (req, res) => {
  console.log('\n========== UPDATE TICKET STATUS START ==========');

  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED', 'REOPENED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    if (status === 'RESOLVED') {
      await SupportTicket.resolve(ticketId, req.user.id);
    } else if (status === 'CLOSED') {
      await SupportTicket.close(ticketId, req.user.id);
    } else {
      await SupportTicket.update(ticketId, req.user.id, { status });
    }

    console.log('✓ Ticket status updated');
    console.log('========== UPDATE TICKET STATUS END ==========\n');

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      data: {
        ticketId,
        status,
      },
    });
  } catch (error) {
    console.error('❌ UPDATE TICKET STATUS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ticket status',
    });
  }
};

/**
 * Update ticket priority (Admin)
 */
export const updateTicketPriority = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { priority } = req.body;

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
      });
    }

    await SupportTicket.update(ticketId, req.user.id, { priority });

    res.status(200).json({
      success: true,
      message: 'Ticket priority updated successfully',
    });
  } catch (error) {
    console.error('❌ UPDATE TICKET PRIORITY ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ticket priority',
    });
  }
};

/**
 * Get support analytics (Admin)
 */
export const getAnalytics = async (req, res) => {
  console.log('\n========== GET SUPPORT ANALYTICS START ==========');

  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    // Get overall statistics
    const stats = await SupportTicket.getStatistics(filters);

    // Get feedback averages
    const feedbackStats = await TicketFeedback.getAverageRatings();

    // Get tickets by category
    const connection = await pool.getConnection();
    try {
      let categoryQuery = 'SELECT category, COUNT(*) as count FROM support_tickets';
      const params = [];

      if (startDate && endDate) {
        categoryQuery += ' WHERE created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      categoryQuery += ' GROUP BY category';
      const [categoryRows] = await connection.execute(categoryQuery, params);

      // Get tickets by status
      let statusQuery = 'SELECT status, COUNT(*) as count FROM support_tickets';
      const statusParams = [];

      if (startDate && endDate) {
        statusQuery += ' WHERE created_at BETWEEN ? AND ?';
        statusParams.push(startDate, endDate);
      }

      statusQuery += ' GROUP BY status';
      const [statusRows] = await connection.execute(statusQuery, statusParams);

      // Get tickets by priority
      let priorityQuery = 'SELECT priority, COUNT(*) as count FROM support_tickets';
      const priorityParams = [];

      if (startDate && endDate) {
        priorityQuery += ' WHERE created_at BETWEEN ? AND ?';
        priorityParams.push(startDate, endDate);
      }

      priorityQuery += ' GROUP BY priority';
      const [priorityRows] = await connection.execute(priorityQuery, priorityParams);

      console.log('✓ Analytics fetched successfully');
      console.log('========== GET SUPPORT ANALYTICS END ==========\n');

      res.status(200).json({
        success: true,
        data: {
          overview: {
            totalTickets: stats.total_tickets || 0,
            openTickets: stats.open_tickets || 0,
            inProgressTickets: stats.in_progress_tickets || 0,
            resolvedTickets: stats.resolved_tickets || 0,
            closedTickets: stats.closed_tickets || 0,
            urgentTickets: stats.urgent_tickets || 0,
            highPriorityTickets: stats.high_priority_tickets || 0,
            unassignedTickets: stats.unassigned_tickets || 0,
            averageResolutionTime: Math.round(stats.avg_resolution_time || 0),
          },
          byCategory: categoryRows.map(r => ({
            category: r.category,
            count: r.count,
          })),
          byStatus: statusRows.map(r => ({
            status: r.status,
            count: r.count,
          })),
          byPriority: priorityRows.map(r => ({
            priority: r.priority,
            count: r.count,
          })),
          feedback: {
            totalFeedback: feedbackStats.total_feedback || 0,
            averageOverallRating: parseFloat((feedbackStats.avg_overall || 0).toFixed(2)),
            averageResponseTime: parseFloat((feedbackStats.avg_response_time || 0).toFixed(2)),
            averageSolutionQuality: parseFloat((feedbackStats.avg_solution_quality || 0).toFixed(2)),
            averageAgentRating: parseFloat((feedbackStats.avg_agent || 0).toFixed(2)),
          },
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ GET SUPPORT ANALYTICS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
};

/**
 * Reopen ticket (User)
 */
export const reopenTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findById(ticketId, req.user.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
      return res.status(400).json({
        success: false,
        error: 'Can only reopen resolved or closed tickets',
      });
    }

    await SupportTicket.reopen(ticketId, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Ticket reopened successfully',
    });
  } catch (error) {
    console.error('❌ REOPEN TICKET ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reopen ticket',
    });
  }
};
