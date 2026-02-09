import pool from '../config/database.js';
import { cache } from '../config/redis.js';

class TicketFeedback {
  static async create(ticketId, userId, feedbackData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const query = `
        INSERT INTO ticket_feedback (
          ticket_id, user_id, overall_rating, response_time_rating,
          solution_quality_rating, support_agent_rating, comment,
          would_recommend, feedback_tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(query, [
        ticketId,
        userId,
        feedbackData.overallRating,
        feedbackData.responseTimeRating || null,
        feedbackData.solutionQualityRating || null,
        feedbackData.supportAgentRating || null,
        feedbackData.comment || null,
        feedbackData.wouldRecommend || null,
        feedbackData.feedbackTags ? JSON.stringify(feedbackData.feedbackTags) : null,
      ]);

      // Update ticket
      await connection.execute(
        'UPDATE support_tickets SET has_feedback = TRUE WHERE id = ?',
        [ticketId]
      );

      await connection.commit();
      await cache.delete(`ticket:${ticketId}`);
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findByTicketId(ticketId) {
    const connection = await pool.getConnection();
    try {
      const query = 'SELECT * FROM ticket_feedback WHERE ticket_id = ?';
      const [rows] = await connection.execute(query, [ticketId]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  static async getAverageRatings() {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT 
          AVG(overall_rating) as avg_overall,
          AVG(response_time_rating) as avg_response_time,
          AVG(solution_quality_rating) as avg_solution_quality,
          AVG(support_agent_rating) as avg_agent,
          COUNT(*) as total_feedback
        FROM ticket_feedback
      `;
      const [rows] = await connection.execute(query);
      return rows[0];
    } finally {
      connection.release();
    }
  }
}

export default TicketFeedback;