import SubscriptionTransaction from '../models/SubscriptionTransaction.js';

/**
 * Get user's transaction history
 */
export const getTransactionHistory = async (req, res) => {
  console.log('\n========== GET TRANSACTION HISTORY START ==========');

  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const transactions = await SubscriptionTransaction.getUserTransactions(req.user.id, limit, offset);
    const totalCount = await SubscriptionTransaction.getTransactionCount(req.user.id);

    console.log('✓ Transactions fetched');
    console.log('========== GET TRANSACTION HISTORY END ==========\n');

    res.status(200).json({
      success: true,
      data: transactions.map(t => ({
        id: t.id,
        planName: t.plan_name,
        type: t.transaction_type,
        amount: parseFloat(t.amount),
        currency: t.currency,
        paymentMethod: t.payment_method,
        paymentStatus: t.payment_status,
        invoiceNumber: t.invoice_number,
        invoiceUrl: t.invoice_url,
        description: t.description,
        createdAt: t.created_at,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error('❌ GET TRANSACTION HISTORY ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction history',
    });
  }
};

/**
 * Get single transaction by ID
 */
export const getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await SubscriptionTransaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    // Verify ownership
    if (transaction.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: transaction.id,
        type: transaction.transaction_type,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency,
        paymentMethod: transaction.payment_method,
        paymentStatus: transaction.payment_status,
        paymentId: transaction.payment_id,
        gatewayOrderId: transaction.gateway_order_id,
        invoiceNumber: transaction.invoice_number,
        invoiceUrl: transaction.invoice_url,
        description: transaction.description,
        createdAt: transaction.created_at,
      },
    });
  } catch (error) {
    console.error('❌ GET TRANSACTION BY ID ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction',
    });
  }
};

/**
 * Get total revenue (for user)
 */
export const getTotalRevenue = async (req, res) => {
  try {
    const totalRevenue = await SubscriptionTransaction.getTotalRevenue(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: parseFloat(totalRevenue),
        currency: 'INR',
      },
    });
  } catch (error) {
    console.error('❌ GET TOTAL REVENUE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate revenue',
    });
  }
};