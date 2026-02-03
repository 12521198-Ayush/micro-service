import SubscriptionPlan from '../models/SubscriptionPlan.js';
import UserSubscription from '../models/UserSubscription.js';
import SubscriptionTransaction from '../models/SubscriptionTransaction.js';
import UsageTracking from '../models/UsageTracking.js';
import PromoCode from '../models/PromoCode.js';

/**
 * Subscribe to a plan
 */
export const subscribe = async (req, res) => {
  console.log('\n========== SUBSCRIBE START ==========');
  console.log(`[${new Date().toISOString()}] Subscribe request`);
  console.log('User ID:', req.user.id);

  try {
    const { planId, billingCycle, promoCode, paymentMethod } = req.body;

    // Validate input
    if (!planId || !billingCycle) {
      console.log('❌ VALIDATION FAILED');
      return res.status(400).json({
        success: false,
        error: 'Plan ID and billing cycle are required',
      });
    }

    if (!['MONTHLY', 'YEARLY', 'LIFETIME'].includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid billing cycle',
      });
    }

    console.log('✓ Input validation passed');

    // Get plan details
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      console.log('❌ Plan not found');
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found',
      });
    }

    console.log('✓ Plan found:', plan.plan_name);

    // Calculate amount
    let amount = 0;
    if (billingCycle === 'MONTHLY') amount = parseFloat(plan.monthly_price);
    else if (billingCycle === 'YEARLY') amount = parseFloat(plan.yearly_price);
    else if (billingCycle === 'LIFETIME') amount = parseFloat(plan.lifetime_price);

    console.log('Original amount:', amount);

    // Apply promo code if provided
    let discountAmount = 0;
    let promoCodeId = null;

    if (promoCode) {
      console.log('Validating promo code:', promoCode);
      const validation = await PromoCode.validate(promoCode, req.user.id, planId, billingCycle);

      if (!validation.valid) {
        console.log('❌ Promo code validation failed:', validation.message);
        return res.status(400).json({
          success: false,
          error: validation.message,
        });
      }

      const promo = validation.promo;
      const discountCalc = PromoCode.calculateDiscount(promo, amount);
      amount = discountCalc.final_amount;
      discountAmount = discountCalc.discount_amount;
      promoCodeId = promo.id;

      console.log('✓ Promo code applied');
      console.log('Discount:', discountAmount);
      console.log('Final amount:', amount);
    }

    // Calculate dates
    const startDate = new Date();
    let endDate = null;
    let nextBillingDate = null;

    if (billingCycle === 'MONTHLY') {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      nextBillingDate = new Date(endDate);
    } else if (billingCycle === 'YEARLY') {
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      nextBillingDate = new Date(endDate);
    }
    // LIFETIME has no end date

    console.log('Start date:', startDate);
    console.log('End date:', endDate);

    // Check if user has active subscription
    const activeSubscription = await UserSubscription.getActiveSubscription(req.user.id);
    if (activeSubscription) {
      console.log('⚠️ User already has active subscription');
      return res.status(409).json({
        success: false,
        error: 'You already have an active subscription. Please cancel or let it expire before subscribing to a new plan.',
        currentSubscription: {
          planName: activeSubscription.plan_name,
          endDate: activeSubscription.end_date,
        },
      });
    }

    // Create subscription record
    const subscriptionId = await UserSubscription.create(req.user.id, {
      plan_id: planId,
      billing_cycle: billingCycle,
      amount_paid: amount,
      currency: 'INR',
      start_date: startDate,
      end_date: endDate,
      next_billing_date: nextBillingDate,
      status: amount === 0 ? 'ACTIVE' : 'ACTIVE', // For now, mark as active immediately
      auto_renew: true,
    });

    console.log('✓ Subscription created with ID:', subscriptionId);

    // Create transaction record
    const transactionId = await SubscriptionTransaction.create({
      subscription_id: subscriptionId,
      user_id: req.user.id,
      transaction_type: 'NEW',
      amount: amount,
      currency: 'INR',
      payment_method: paymentMethod || 'RAZORPAY',
      payment_status: amount === 0 ? 'SUCCESS' : 'SUCCESS', // For demo, mark as success
      description: `Subscription to ${plan.plan_name} - ${billingCycle}`,
    });

    console.log('✓ Transaction created with ID:', transactionId);

    // Record promo code usage if applicable
    if (promoCodeId) {
      await PromoCode.recordUsage(promoCodeId, req.user.id, subscriptionId, transactionId, discountAmount);
      console.log('✓ Promo code usage recorded');
    }

    // Create usage tracking record
    await UsageTracking.getOrCreateMonthlyUsage(req.user.id, subscriptionId);
    console.log('✓ Usage tracking initialized');

    console.log('✓ SUBSCRIPTION SUCCESSFUL');
    console.log('========== SUBSCRIBE END ==========\n');

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscriptionId,
        transactionId,
        planName: plan.plan_name,
        billingCycle,
        amount: parseFloat(amount),
        discountApplied: parseFloat(discountAmount),
        currency: 'INR',
        startDate,
        endDate,
        status: 'ACTIVE',
      },
    });
  } catch (error) {
    console.error('❌ SUBSCRIBE ERROR');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.log('========== SUBSCRIBE END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
    });
  }
};

/**
 * Get user's current subscription
 */
export const getCurrentSubscription = async (req, res) => {
  console.log('\n========== GET CURRENT SUBSCRIPTION START ==========');
  console.log(`[${new Date().toISOString()}] Get current subscription request`);
  console.log('User ID:', req.user.id);

  try {
    const subscription = await UserSubscription.getActiveSubscription(req.user.id);

    if (!subscription) {
      console.log('ℹ️ No active subscription found');
      console.log('========== GET CURRENT SUBSCRIPTION END ==========\n');
      return res.status(404).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    // Get usage data
    const usage = await UsageTracking.getCurrentUsage(req.user.id);

    console.log('✓ Subscription found:', subscription.plan_name);
    console.log('========== GET CURRENT SUBSCRIPTION END ==========\n');

    res.status(200).json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          planName: subscription.plan_name,
          planType: subscription.plan_type,
          billingCycle: subscription.billing_cycle,
          amount: parseFloat(subscription.amount_paid),
          currency: subscription.currency,
          status: subscription.status,
          startDate: subscription.start_date,
          endDate: subscription.end_date,
          nextBillingDate: subscription.next_billing_date,
          autoRenew: subscription.auto_renew,
        },
        limits: {
          contacts: subscription.max_contacts,
          templates: subscription.max_templates,
          campaignsPerMonth: subscription.max_campaigns_per_month,
          messagesPerMonth: subscription.max_messages_per_month,
          teamMembers: subscription.max_team_members,
          whatsappNumbers: subscription.max_whatsapp_numbers,
        },
        features: {
          advancedAnalytics: subscription.has_advanced_analytics,
          automation: subscription.has_automation,
          apiAccess: subscription.has_api_access,
          prioritySupport: subscription.has_priority_support,
          whiteLabel: subscription.has_white_label,
          customReports: subscription.has_custom_reports,
          webhooks: subscription.has_webhooks,
          bulkMessaging: subscription.has_bulk_messaging,
        },
        usage: usage ? {
          contacts: usage.contacts_count,
          templates: usage.templates_count,
          campaigns: usage.campaigns_count,
          messages: usage.messages_sent,
          teamMembers: usage.team_members_count,
          whatsappNumbers: usage.whatsapp_numbers_count,
          monthYear: usage.month_year,
        } : null,
      },
    });
  } catch (error) {
    console.error('❌ GET CURRENT SUBSCRIPTION ERROR');
    console.error('Error:', error.message);
    console.log('========== GET CURRENT SUBSCRIPTION END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription',
    });
  }
};

/**
 * Get subscription history
 */
export const getSubscriptionHistory = async (req, res) => {
  console.log('\n========== GET SUBSCRIPTION HISTORY START ==========');
  console.log(`[${new Date().toISOString()}] Get subscription history request`);

  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const subscriptions = await UserSubscription.getUserSubscriptions(req.user.id, limit, offset);

    console.log('✓ Subscription history fetched');
    console.log('Count:', subscriptions.length);
    console.log('========== GET SUBSCRIPTION HISTORY END ==========\n');

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions.map(sub => ({
        id: sub.id,
        planName: sub.plan_name,
        planType: sub.plan_type,
        billingCycle: sub.billing_cycle,
        amount: parseFloat(sub.amount_paid),
        currency: sub.currency,
        status: sub.status,
        startDate: sub.start_date,
        endDate: sub.end_date,
        createdAt: sub.created_at,
      })),
      pagination: {
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('❌ GET SUBSCRIPTION HISTORY ERROR');
    console.error('Error:', error.message);
    console.log('========== GET SUBSCRIPTION HISTORY END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription history',
    });
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (req, res) => {
  console.log('\n========== CANCEL SUBSCRIPTION START ==========');
  console.log(`[${new Date().toISOString()}] Cancel subscription request`);
  console.log('User ID:', req.user.id);

  try {
    const { reason } = req.body;
    const { subscriptionId } = req.params;

    // Get subscription
    const subscription = await UserSubscription.findById(subscriptionId);

    if (!subscription) {
      console.log('❌ Subscription not found');
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }

    // Verify ownership
    if (subscription.user_id !== req.user.id) {
      console.log('❌ Unauthorized: User does not own this subscription');
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Check if already cancelled
    if (subscription.status === 'CANCELLED') {
      console.log('⚠️ Subscription already cancelled');
      return res.status(400).json({
        success: false,
        error: 'Subscription is already cancelled',
      });
    }

    // Cancel subscription
    await UserSubscription.cancel(subscriptionId, reason, req.user.id);

    console.log('✓ Subscription cancelled successfully');
    console.log('========== CANCEL SUBSCRIPTION END ==========\n');

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        subscriptionId,
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  } catch (error) {
    console.error('❌ CANCEL SUBSCRIPTION ERROR');
    console.error('Error:', error.message);
    console.log('========== CANCEL SUBSCRIPTION END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
    });
  }
};

/**
 * Toggle auto-renewal
 */
export const toggleAutoRenew = async (req, res) => {
  console.log('\n========== TOGGLE AUTO RENEW START ==========');
  console.log(`[${new Date().toISOString()}] Toggle auto renew request`);

  try {
    const { subscriptionId } = req.params;
    const { autoRenew } = req.body;

    if (autoRenew === undefined) {
      return res.status(400).json({
        success: false,
        error: 'autoRenew field is required',
      });
    }

    // Get subscription
    const subscription = await UserSubscription.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }

    // Verify ownership
    if (subscription.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Update auto renew
    await UserSubscription.update(subscriptionId, { auto_renew: autoRenew });

    console.log('✓ Auto renew updated');
    console.log('========== TOGGLE AUTO RENEW END ==========\n');

    res.status(200).json({
      success: true,
      message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'}`,
      data: {
        subscriptionId,
        autoRenew,
      },
    });
  } catch (error) {
    console.error('❌ TOGGLE AUTO RENEW ERROR');
    console.error('Error:', error.message);
    console.log('========== TOGGLE AUTO RENEW END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to update auto-renewal setting',
    });
  }
};