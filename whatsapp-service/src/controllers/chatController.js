import pool from '../config/database.js';

/**
 * @desc    List all chat conversations (inbox)
 * @route   GET /whatsapp-service/api/chats
 * @access  Private
 */
export const listChats = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, direction } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `SELECT * FROM chats WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM chats WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (search) {
      query += ` AND (phone_number LIKE ? OR contact_name LIKE ? OR last_message LIKE ?)`;
      countQuery += ` AND (phone_number LIKE ? OR contact_name LIKE ? OR last_message LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      query += ` AND status = ?`;
      countQuery += ` AND status = ?`;
      params.push(status);
      countParams.push(status);
    }

    if (direction) {
      query += ` AND direction = ?`;
      countQuery += ` AND direction = ?`;
      params.push(direction);
      countParams.push(direction);
    }

    query += ` ORDER BY last_message_at DESC, updated_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [chats] = await pool.execute(query, params);
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: chats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing chats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get chat messages for a specific conversation
 * @route   GET /whatsapp-service/api/chats/:phoneNumber/messages
 * @access  Private
 */
export const getChatMessages = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { page = 1, limit = 100, before } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `SELECT * FROM chat_logs WHERE phone_number = ?`;
    const params = [phoneNumber];

    if (before) {
      query += ` AND created_at < ?`;
      params.push(new Date(before));
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [messages] = await pool.execute(query, params);

    // Parse JSON content
    const parsed = messages.map(msg => {
      if (msg.content && typeof msg.content === 'string') {
        try { msg.content = JSON.parse(msg.content); } catch(e) {}
      }
      return msg;
    });

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM chat_logs WHERE phone_number = ?`,
      [phoneNumber]
    );

    // Mark as read: reset unread count for this chat
    await pool.execute(
      `UPDATE chats SET unread_count = 0, updated_at = NOW() WHERE phone_number = ?`,
      [phoneNumber]
    );

    res.json({
      success: true,
      data: parsed.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get a single chat detail
 * @route   GET /whatsapp-service/api/chats/:phoneNumber
 * @access  Private
 */
export const getChatDetail = async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const [chats] = await pool.execute(
      `SELECT * FROM chats WHERE phone_number = ?`,
      [phoneNumber]
    );

    if (chats.length === 0) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    res.json({ success: true, data: chats[0] });
  } catch (error) {
    console.error('Error getting chat detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Send a message in a chat conversation
 * @route   POST /whatsapp-service/api/chats/:phoneNumber/send
 * @access  Private
 */
export const sendChatMessage = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { type = 'text', text, templateName, language, components } = req.body;
    const userId = req.user.id || req.user.userId;

    // Get WABA config for this phone number / user
    const config = req.wabaConfig;
    if (!config?.phoneNumberId || !config?.accessToken) {
      return res.status(400).json({ success: false, error: 'WhatsApp not configured' });
    }

    const axios = (await import('axios')).default;
    const META_API_VERSION = process.env.META_API_VERSION || 'v24.0';
    const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

    let payload;
    if (type === 'template') {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language || 'en' },
          ...(components?.length > 0 ? { components } : {})
        }
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: { body: text }
      };
    }

    const response = await axios.post(
      `${META_GRAPH_URL}/${config.phoneNumberId}/messages`,
      payload,
      { headers: { 'Authorization': `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' } }
    );

    const waMessageId = response.data.messages?.[0]?.id;

    // Save to chat_logs
    await pool.execute(
      `INSERT INTO chat_logs (phone_number, phone_number_id, whatsapp_message_id, direction, message_type, content, status, created_at)
       VALUES (?, ?, ?, 'outbound', ?, ?, 'sent', NOW())`,
      [phoneNumber, config.phoneNumberId, waMessageId, type, JSON.stringify(type === 'text' ? { text } : payload.template)]
    );

    // Update chat record
    await pool.execute(
      `INSERT INTO chats (phone_number, phone_number_id, last_message, last_message_type, last_message_at, direction, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), 'outbound', 'sent', NOW(), NOW())
       ON DUPLICATE KEY UPDATE last_message = VALUES(last_message), last_message_type = VALUES(last_message_type), 
       last_message_at = NOW(), direction = 'outbound', status = 'sent', updated_at = NOW()`,
      [phoneNumber, config.phoneNumberId, type === 'text' ? text?.substring(0, 500) : `Template: ${templateName}`, type]
    );

    res.json({
      success: true,
      data: {
        whatsappMessageId: waMessageId,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('Error sending chat message:', error.response?.data || error);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error?.message || error.message 
    });
  }
};

/**
 * @desc    Mark chat as read
 * @route   POST /whatsapp-service/api/chats/:phoneNumber/read
 * @access  Private
 */
export const markChatAsRead = async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    await pool.execute(
      `UPDATE chats SET unread_count = 0, updated_at = NOW() WHERE phone_number = ?`,
      [phoneNumber]
    );

    res.json({ success: true, message: 'Chat marked as read' });
  } catch (error) {
    console.error('Error marking chat as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Close/archive a chat
 * @route   POST /whatsapp-service/api/chats/:phoneNumber/close
 * @access  Private
 */
export const closeChat = async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    await pool.execute(
      `UPDATE chats SET is_closed = 1, updated_at = NOW() WHERE phone_number = ?`,
      [phoneNumber]
    );

    res.json({ success: true, message: 'Chat closed' });
  } catch (error) {
    console.error('Error closing chat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get chat statistics (unread count, total chats, etc.)
 * @route   GET /whatsapp-service/api/chats/stats
 * @access  Private
 */
export const getChatStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_chats,
        SUM(CASE WHEN direction = 'inbound' AND unread_count > 0 THEN 1 ELSE 0 END) as unread_chats,
        SUM(unread_count) as total_unread,
        SUM(CASE WHEN is_closed = 0 THEN 1 ELSE 0 END) as open_chats
      FROM chats
    `);

    res.json({ success: true, data: stats[0] || {} });
  } catch (error) {
    console.error('Error getting chat stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  listChats,
  getChatMessages,
  getChatDetail,
  sendChatMessage,
  markChatAsRead,
  closeChat,
  getChatStats
};
