import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';

export const addBalance = async (req, res) => {
  console.log('\n========== ADD BALANCE START ==========');
  console.log(`[${new Date().toISOString()}] Add balance request`);
  console.log('Authenticated user:', { id: req.user.id, email: req.user.email });

  try {
    const { amount, description } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      console.log('❌ VALIDATION FAILED: Invalid amount');
      console.log('========== ADD BALANCE END ==========\n');
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    console.log('✓ Input validation passed');
    console.log('Amount to add:', amount);
    console.log('Description:', description || 'No description provided');

    // Get current balance
    console.log('Fetching current balance...');
    const currentBalance = await User.getBalance(req.user.id);
    console.log('Current balance:', currentBalance);

    // Calculate new balance
    const newBalance = parseFloat(currentBalance) + parseFloat(amount);
    console.log('New balance:', newBalance);

    // Update balance
    console.log('Updating user balance...');
    const updated = await User.updateBalance(req.user.id, newBalance);
    if (!updated) {
      console.log('❌ ADD BALANCE FAILED: Database update failed');
      console.log('========== ADD BALANCE END ==========\n');
      return res.status(500).json({ error: 'Failed to update balance' });
    }

    console.log('✓ Balance updated successfully');

    // Create transaction record
    console.log('Creating transaction record...');
    const transactionId = await WalletTransaction.create(
      req.user.id,
      'credit',
      amount,
      currentBalance,
      newBalance,
      description || 'Balance added'
    );
    console.log('✓ Transaction recorded with ID:', transactionId);

    console.log('✓ BALANCE ADDED SUCCESSFULLY');
    console.log('========== ADD BALANCE END ==========\n');

    res.status(200).json({
      message: 'Balance added successfully',
      transaction: {
        id: transactionId,
        type: 'credit',
        amount: parseFloat(amount),
        balanceBefore: parseFloat(currentBalance),
        balanceAfter: parseFloat(newBalance),
        description: description || 'Balance added'
      },
      currentBalance: parseFloat(newBalance)
    });
  } catch (error) {
    console.error('❌ ADD BALANCE ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    console.log('========== ADD BALANCE END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deductBalance = async (req, res) => {
  console.log('\n========== DEDUCT BALANCE START ==========');
  console.log(`[${new Date().toISOString()}] Deduct balance request`);
  console.log('Authenticated user:', { id: req.user.id, email: req.user.email });

  try {
    const { amount, description } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      console.log('❌ VALIDATION FAILED: Invalid amount');
      console.log('========== DEDUCT BALANCE END ==========\n');
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    console.log('✓ Input validation passed');
    console.log('Amount to deduct:', amount);
    console.log('Description:', description || 'No description provided');

    // Get current balance
    console.log('Fetching current balance...');
    const currentBalance = await User.getBalance(req.user.id);
    console.log('Current balance:', currentBalance);

    // Check if sufficient balance
    if (parseFloat(currentBalance) < parseFloat(amount)) {
      console.log('❌ DEDUCT BALANCE FAILED: Insufficient balance');
      console.log('========== DEDUCT BALANCE END ==========\n');
      return res.status(400).json({ 
        error: 'Insufficient balance',
        currentBalance: parseFloat(currentBalance),
        required: parseFloat(amount)
      });
    }

    // Calculate new balance
    const newBalance = parseFloat(currentBalance) - parseFloat(amount);
    console.log('New balance:', newBalance);

    // Update balance
    console.log('Updating user balance...');
    const updated = await User.updateBalance(req.user.id, newBalance);
    if (!updated) {
      console.log('❌ DEDUCT BALANCE FAILED: Database update failed');
      console.log('========== DEDUCT BALANCE END ==========\n');
      return res.status(500).json({ error: 'Failed to update balance' });
    }

    console.log('✓ Balance updated successfully');

    // Create transaction record
    console.log('Creating transaction record...');
    const transactionId = await WalletTransaction.create(
      req.user.id,
      'debit',
      amount,
      currentBalance,
      newBalance,
      description || 'Balance deducted'
    );
    console.log('✓ Transaction recorded with ID:', transactionId);

    console.log('✓ BALANCE DEDUCTED SUCCESSFULLY');
    console.log('========== DEDUCT BALANCE END ==========\n');

    res.status(200).json({
      message: 'Balance deducted successfully',
      transaction: {
        id: transactionId,
        type: 'debit',
        amount: parseFloat(amount),
        balanceBefore: parseFloat(currentBalance),
        balanceAfter: parseFloat(newBalance),
        description: description || 'Balance deducted'
      },
      currentBalance: parseFloat(newBalance)
    });
  } catch (error) {
    console.error('❌ DEDUCT BALANCE ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    console.log('========== DEDUCT BALANCE END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBalance = async (req, res) => {
  console.log('\n========== GET BALANCE START ==========');
  console.log(`[${new Date().toISOString()}] Get balance request`);
  console.log('Authenticated user:', { id: req.user.id, email: req.user.email });

  try {
    console.log('Fetching user data...');
    const user = await User.findById(req.user.id);
    
    if (!user) {
      console.log('❌ GET BALANCE FAILED: User not found');
      console.log('========== GET BALANCE END ==========\n');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✓ User data fetched successfully');
    console.log('Balance:', user.user_balance);
    console.log('========== GET BALANCE END ==========\n');

    res.status(200).json({
      balance: parseFloat(user.user_balance || 0),
      pricing: {
        marketingMessage: parseFloat(user.marketing_message_price || 0),
        utilityMessage: parseFloat(user.utility_message_price || 0),
        authMessage: parseFloat(user.auth_message_price || 0)
      }
    });
  } catch (error) {
    console.error('❌ GET BALANCE ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.log('========== GET BALANCE END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactions = async (req, res) => {
  console.log('\n========== GET TRANSACTIONS START ==========');
  console.log(`[${new Date().toISOString()}] Get transactions request`);
  console.log('Authenticated user:', { id: req.user.id, email: req.user.email });

  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    console.log('Pagination:', { limit, page, offset });

    console.log('Fetching transactions...');
    const transactions = await WalletTransaction.findByUserId(req.user.id, limit, offset);
    const totalCount = await WalletTransaction.getTransactionCount(req.user.id);

    console.log('✓ Transactions fetched successfully');
    console.log('Total transactions:', totalCount);
    console.log('Returned transactions:', transactions.length);
    console.log('========== GET TRANSACTIONS END ==========\n');

    res.status(200).json({
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.transaction_type,
        amount: parseFloat(t.amount),
        balanceBefore: parseFloat(t.balance_before),
        balanceAfter: parseFloat(t.balance_after),
        description: t.description,
        createdAt: t.created_at
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit
      }
    });
  } catch (error) {
    console.error('❌ GET TRANSACTIONS ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.log('========== GET TRANSACTIONS END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMessagePrices = async (req, res) => {
  console.log('\n========== UPDATE MESSAGE PRICES START ==========');
  console.log(`[${new Date().toISOString()}] Update message prices request`);
  console.log('Authenticated user:', { id: req.user.id, email: req.user.email });

  try {
    const { marketingMessagePrice, utilityMessagePrice, authMessagePrice } = req.body;

    // Validate at least one price is provided
    if (marketingMessagePrice === undefined && 
        utilityMessagePrice === undefined && 
        authMessagePrice === undefined) {
      console.log('❌ VALIDATION FAILED: No prices provided');
      console.log('========== UPDATE MESSAGE PRICES END ==========\n');
      return res.status(400).json({ 
        error: 'At least one message price must be provided' 
      });
    }

    // Validate prices are positive
    const prices = {};
    if (marketingMessagePrice !== undefined) {
      if (marketingMessagePrice < 0) {
        return res.status(400).json({ error: 'Marketing message price must be non-negative' });
      }
      prices.marketingMessagePrice = marketingMessagePrice;
    }
    if (utilityMessagePrice !== undefined) {
      if (utilityMessagePrice < 0) {
        return res.status(400).json({ error: 'Utility message price must be non-negative' });
      }
      prices.utilityMessagePrice = utilityMessagePrice;
    }
    if (authMessagePrice !== undefined) {
      if (authMessagePrice < 0) {
        return res.status(400).json({ error: 'Auth message price must be non-negative' });
      }
      prices.authMessagePrice = authMessagePrice;
    }

    console.log('✓ Input validation passed');
    console.log('Prices to update:', prices);

    // Update prices
    console.log('Updating message prices...');
    const updated = await User.updateMessagePrices(req.user.id, prices);
    if (!updated) {
      console.log('❌ UPDATE FAILED: Database update failed');
      console.log('========== UPDATE MESSAGE PRICES END ==========\n');
      return res.status(500).json({ error: 'Failed to update message prices' });
    }

    console.log('✓ Message prices updated successfully');

    // Get updated user data
    const user = await User.findById(req.user.id);
    
    console.log('✓ MESSAGE PRICES UPDATED SUCCESSFULLY');
    console.log('========== UPDATE MESSAGE PRICES END ==========\n');

    res.status(200).json({
      message: 'Message prices updated successfully',
      pricing: {
        marketingMessage: parseFloat(user.marketing_message_price),
        utilityMessage: parseFloat(user.utility_message_price),
        authMessage: parseFloat(user.auth_message_price)
      }
    });
  } catch (error) {
    console.error('❌ UPDATE MESSAGE PRICES ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    console.log('========== UPDATE MESSAGE PRICES END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};
