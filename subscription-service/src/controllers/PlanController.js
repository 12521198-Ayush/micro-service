import SubscriptionPlan from '../models/SubscriptionPlan.js';

/**
 * Get all available subscription plans
 */
export const getAllPlans = async (req, res) => {
  console.log('\n========== GET ALL PLANS START ==========');
  console.log(`[${new Date().toISOString()}] Get all plans request`);

  try {
    const plans = await SubscriptionPlan.getAllPlans();

    console.log('✓ Plans fetched successfully');
    console.log(`Total plans: ${plans.length}`);
    console.log('========== GET ALL PLANS END ==========\n');

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans.map(plan => ({
        id: plan.id,
        code: plan.plan_code,
        name: plan.plan_name,
        description: plan.plan_description,
        type: plan.plan_type,
        pricing: {
          monthly: parseFloat(plan.monthly_price),
          yearly: parseFloat(plan.yearly_price),
          lifetime: parseFloat(plan.lifetime_price),
          currency: 'INR',
        },
        limits: {
          contacts: plan.max_contacts,
          templates: plan.max_templates,
          campaignsPerMonth: plan.max_campaigns_per_month,
          messagesPerMonth: plan.max_messages_per_month,
          teamMembers: plan.max_team_members,
          whatsappNumbers: plan.max_whatsapp_numbers,
        },
        features: {
          advancedAnalytics: plan.has_advanced_analytics,
          automation: plan.has_automation,
          apiAccess: plan.has_api_access,
          prioritySupport: plan.has_priority_support,
          whiteLabel: plan.has_white_label,
          customReports: plan.has_custom_reports,
          webhooks: plan.has_webhooks,
          bulkMessaging: plan.has_bulk_messaging,
        },
        messagePricing: {
          marketing: parseFloat(plan.marketing_message_price),
          utility: parseFloat(plan.utility_message_price),
          auth: parseFloat(plan.auth_message_price),
          currency: 'INR',
        },
      })),
    });
  } catch (error) {
    console.error('❌ GET ALL PLANS ERROR');
    console.error('Error:', error.message);
    console.log('========== GET ALL PLANS END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans',
    });
  }
};

/**
 * Get single plan by ID
 */
export const getPlanById = async (req, res) => {
  console.log('\n========== GET PLAN BY ID START ==========');
  console.log(`[${new Date().toISOString()}] Get plan by ID request`);
  console.log('Plan ID:', req.params.planId);

  try {
    const { planId } = req.params;

    const plan = await SubscriptionPlan.findById(planId);

    if (!plan) {
      console.log('❌ Plan not found');
      console.log('========== GET PLAN BY ID END ==========\n');
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found',
      });
    }

    console.log('✓ Plan fetched successfully');
    console.log('========== GET PLAN BY ID END ==========\n');

    res.status(200).json({
      success: true,
      data: {
        id: plan.id,
        code: plan.plan_code,
        name: plan.plan_name,
        description: plan.plan_description,
        type: plan.plan_type,
        pricing: {
          monthly: parseFloat(plan.monthly_price),
          yearly: parseFloat(plan.yearly_price),
          lifetime: parseFloat(plan.lifetime_price),
          currency: 'INR',
        },
        limits: {
          contacts: plan.max_contacts,
          templates: plan.max_templates,
          campaignsPerMonth: plan.max_campaigns_per_month,
          messagesPerMonth: plan.max_messages_per_month,
          teamMembers: plan.max_team_members,
          whatsappNumbers: plan.max_whatsapp_numbers,
        },
        features: {
          advancedAnalytics: plan.has_advanced_analytics,
          automation: plan.has_automation,
          apiAccess: plan.has_api_access,
          prioritySupport: plan.has_priority_support,
          whiteLabel: plan.has_white_label,
          customReports: plan.has_custom_reports,
          webhooks: plan.has_webhooks,
          bulkMessaging: plan.has_bulk_messaging,
        },
        messagePricing: {
          marketing: parseFloat(plan.marketing_message_price),
          utility: parseFloat(plan.utility_message_price),
          auth: parseFloat(plan.auth_message_price),
          currency: 'INR',
        },
      },
    });
  } catch (error) {
    console.error('❌ GET PLAN BY ID ERROR');
    console.error('Error:', error.message);
    console.log('========== GET PLAN BY ID END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plan',
    });
  }
};

/**
 * Compare plans
 */
export const comparePlans = async (req, res) => {
  console.log('\n========== COMPARE PLANS START ==========');
  console.log(`[${new Date().toISOString()}] Compare plans request`);

  try {
    const { planIds } = req.query; // ?planIds=1,2,3

    if (!planIds) {
      return res.status(400).json({
        success: false,
        error: 'Plan IDs are required',
      });
    }

    const ids = planIds.split(',').map(id => parseInt(id));
    const plans = await Promise.all(ids.map(id => SubscriptionPlan.findById(id)));

    // Filter out null values (plans not found)
    const validPlans = plans.filter(p => p !== null);

    console.log('✓ Plans compared successfully');
    console.log(`Comparing ${validPlans.length} plans`);
    console.log('========== COMPARE PLANS END ==========\n');

    res.status(200).json({
      success: true,
      count: validPlans.length,
      data: validPlans.map(plan => ({
        id: plan.id,
        name: plan.plan_name,
        type: plan.plan_type,
        pricing: {
          monthly: parseFloat(plan.monthly_price),
          yearly: parseFloat(plan.yearly_price),
          lifetime: parseFloat(plan.lifetime_price),
        },
        limits: {
          contacts: plan.max_contacts,
          templates: plan.max_templates,
          campaignsPerMonth: plan.max_campaigns_per_month,
          messagesPerMonth: plan.max_messages_per_month,
          teamMembers: plan.max_team_members,
          whatsappNumbers: plan.max_whatsapp_numbers,
        },
        features: {
          advancedAnalytics: plan.has_advanced_analytics,
          automation: plan.has_automation,
          apiAccess: plan.has_api_access,
          prioritySupport: plan.has_priority_support,
          whiteLabel: plan.has_white_label,
          customReports: plan.has_custom_reports,
          webhooks: plan.has_webhooks,
          bulkMessaging: plan.has_bulk_messaging,
        },
      })),
    });
  } catch (error) {
    console.error('❌ COMPARE PLANS ERROR');
    console.error('Error:', error.message);
    console.log('========== COMPARE PLANS END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to compare plans',
    });
  }
};

/**
 * Get plan pricing for specific billing cycle
 */
export const getPlanPricing = async (req, res) => {
  console.log('\n========== GET PLAN PRICING START ==========');
  console.log(`[${new Date().toISOString()}] Get plan pricing request`);

  try {
    const { planId } = req.params;
    const { billingCycle } = req.query; // ?billingCycle=MONTHLY

    if (!billingCycle || !['MONTHLY', 'YEARLY', 'LIFETIME'].includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        error: 'Valid billing cycle is required (MONTHLY, YEARLY, or LIFETIME)',
      });
    }

    const pricing = await SubscriptionPlan.getPricing(planId, billingCycle);

    if (!pricing) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
      });
    }

    console.log('✓ Pricing fetched successfully');
    console.log('========== GET PLAN PRICING END ==========\n');

    res.status(200).json({
      success: true,
      data: {
        planId: pricing.plan_id,
        planName: pricing.plan_name,
        billingCycle: pricing.billing_cycle,
        amount: parseFloat(pricing.amount),
        currency: pricing.currency,
      },
    });
  } catch (error) {
    console.error('❌ GET PLAN PRICING ERROR');
    console.error('Error:', error.message);
    console.log('========== GET PLAN PRICING END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plan pricing',
    });
  }
};