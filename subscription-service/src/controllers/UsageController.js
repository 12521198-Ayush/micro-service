import UsageTracking from '../models/UsageTracking.js';

/**
 * Get current usage
 */
export const getCurrentUsage = async (req, res) => {
  console.log('\n========== GET CURRENT USAGE START ==========');
  
  try {
    const usage = await UsageTracking.getCurrentUsage(req.user.id);

    if (!usage) {
      return res.status(404).json({
        success: false,
        error: 'No usage data found',
        data:req?.user?.id
      });
    }

    res.status(200).json({
      success: true,
      data: {
        monthYear: usage.month_year,
        usage: {
          contacts: usage.contacts_count,
          templates: usage.templates_count,
          campaigns: usage.campaigns_count,
          messages: usage.messages_sent,
          teamMembers: usage.team_members_count,
          whatsappNumbers: usage.whatsapp_numbers_count,
        },
        messageBreakdown: {
          marketing: usage.marketing_messages,
          utility: usage.utility_messages,
          auth: usage.auth_messages,
        },
        limits: {
          contacts: usage.max_contacts,
          templates: usage.max_templates,
          campaigns: usage.max_campaigns_per_month,
          messages: usage.max_messages_per_month,
          teamMembers: usage.max_team_members,
          whatsappNumbers: usage.max_whatsapp_numbers,
        },
        remaining: {
          contacts: usage.max_contacts === -1 ? -1 : Math.max(0, usage.max_contacts - usage.contacts_count),
          templates: usage.max_templates === -1 ? -1 : Math.max(0, usage.max_templates - usage.templates_count),
          campaigns: usage.max_campaigns_per_month === -1 ? -1 : Math.max(0, usage.max_campaigns_per_month - usage.campaigns_count),
          messages: usage.max_messages_per_month === -1 ? -1 : Math.max(0, usage.max_messages_per_month - usage.messages_sent),
          teamMembers: usage.max_team_members === -1 ? -1 : Math.max(0, usage.max_team_members - usage.team_members_count),
          whatsappNumbers: usage.max_whatsapp_numbers === -1 ? -1 : Math.max(0, usage.max_whatsapp_numbers - usage.whatsapp_numbers_count),
        },
      },
    });
  } catch (error) {
    console.error('❌ GET CURRENT USAGE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage data',
    });
  }
};

/**
 * Check limit for specific feature
 */
export const checkLimit = async (req, res) => {
  try {
    const { limitType } = req.params; // contacts, templates, campaigns, etc.

    const limitCheck = await UsageTracking.checkLimit(req.user.id, limitType);

    res.status(200).json({
      success: true,
      data: {
        limitType,
        canProceed: limitCheck.canProceed,
        current: limitCheck.current,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining,
      },
    });
  } catch (error) {
    console.error('❌ CHECK LIMIT ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check limit',
    });
  }
};

/**
 * Get usage history
 */
export const getUsageHistory = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const history = await UsageTracking.getUsageHistory(req.user.id, months);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history.map(h => ({
        monthYear: h.month_year,
        contacts: h.contacts_count,
        templates: h.templates_count,
        campaigns: h.campaigns_count,
        messages: h.messages_sent,
        marketingMessages: h.marketing_messages,
        utilityMessages: h.utility_messages,
        authMessages: h.auth_messages,
      })),
    });
  } catch (error) {
    console.error('❌ GET USAGE HISTORY ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage history',
    });
  }
};