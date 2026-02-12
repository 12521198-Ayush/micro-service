/**
 * Action Execution Service
 * Executes all action node types in the flow builder
 * Replicates ActionExecutionService from nyife-dev
 */
import axios from 'axios';
import nodemailer from 'nodemailer';

const CONTACT_SERVICE_URL = process.env.CONTACT_SERVICE_URL || 'http://localhost:3002';
const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3006';

class ActionExecutionService {
  constructor(organizationId, authToken) {
    this.organizationId = organizationId;
    this.authToken = authToken;
  }

  /**
   * Execute an action based on type
   */
  async executeAction(actionType, config, contact, userMessage = '', flowData = null, contactId = null) {
    try {
      switch (actionType) {
        case 'add_to_group':
          return this.executeAddToGroup(config, contact);
        case 'remove_from_group':
          return this.executeRemoveFromGroup(config, contact);
        case 'update_contact':
          return this.executeUpdateContact(config, contact, userMessage);
        case 'send_email':
          return this.executeSendEmail(config, contact);
        case 'delay':
          return this.executeDelay(config, contact, flowData, contactId);
        case 'webhook':
          return this.executeWebhook(config, contact, userMessage);
        case 'ai_response':
          return this.executeAIResponse(config, contact, userMessage);
        case 'conditional':
          return this.executeConditional(config, contact, userMessage);
        default:
          console.warn(`Unknown action type: ${actionType}`);
          return false;
      }
    } catch (error) {
      console.error(`Error executing action ${actionType}:`, error.message);
      return false;
    }
  }

  /**
   * Add contact to a group via contact-service
   */
  async executeAddToGroup(config, contact) {
    const groupId = config.group_id;
    if (!groupId) {
      console.warn('No group_id specified for add_to_group action');
      return false;
    }

    try {
      await axios.post(
        `${CONTACT_SERVICE_URL}/api/contacts/${contact.id}/groups`,
        { groupId },
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );
      return true;
    } catch (error) {
      console.error('Failed to add contact to group:', error.message);
      return false;
    }
  }

  /**
   * Remove contact from a group via contact-service
   */
  async executeRemoveFromGroup(config, contact) {
    const groupId = config.group_id;
    if (!groupId) {
      console.warn('No group_id specified for remove_from_group action');
      return false;
    }

    try {
      await axios.delete(
        `${CONTACT_SERVICE_URL}/api/contacts/${contact.id}/groups/${groupId}`,
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );
      return true;
    } catch (error) {
      console.error('Failed to remove contact from group:', error.message);
      return false;
    }
  }

  /**
   * Update a contact field
   */
  async executeUpdateContact(config, contact, userMessage) {
    const targetField = config.target_field;
    if (!targetField || !userMessage) {
      console.warn('No target_field or userMessage for update_contact action');
      return false;
    }

    // Email validation
    if (targetField === 'email' && userMessage) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userMessage)) {
        console.warn(`Invalid email format provided: ${userMessage}`);
        const invalidMessage = config.invalid_email_message || 'Please provide a valid email address.';
        if (invalidMessage) {
          await this.sendWhatsAppMessage(contact.uuid, invalidMessage);
        }
        return false;
      }
    }

    const updateData = {};

    // Standard fields
    const standardFields = ['first_name', 'last_name', 'email', 'phone'];
    if (standardFields.includes(targetField)) {
      updateData[targetField] = userMessage;
    } else if (targetField.startsWith('address.')) {
      const addressKey = targetField.replace('address.', '');
      const currentAddress = contact.address ? (typeof contact.address === 'string' ? JSON.parse(contact.address) : contact.address) : {};
      currentAddress[addressKey] = userMessage;
      updateData.address = JSON.stringify(currentAddress);
    } else {
      // Custom metadata field
      const metadata = contact.metadata ? (typeof contact.metadata === 'string' ? JSON.parse(contact.metadata) : contact.metadata) : {};
      metadata[targetField] = userMessage;
      updateData.metadata = JSON.stringify(metadata);
    }

    try {
      await axios.put(
        `${CONTACT_SERVICE_URL}/api/contacts/${contact.id}`,
        updateData,
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );
      return true;
    } catch (error) {
      console.error('Failed to update contact:', error.message);
      return false;
    }
  }

  /**
   * Send email via SMTP
   */
  async executeSendEmail(config, contact) {
    if (!contact.email) {
      console.warn(`Contact ${contact.id} has no email address`);
      return false;
    }

    const { subject, body, smtp_host, smtp_port = 587, smtp_username, smtp_password,
            smtp_encryption = 'tls', from_name, from_email } = config;

    const senderEmail = from_email || (smtp_username && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtp_username) ? smtp_username : null);

    if (!subject || !body || !smtp_host || !smtp_username || !smtp_password || !senderEmail) {
      console.warn('Incomplete email configuration for send_email action');
      return false;
    }

    const emailBody = this.replacePlaceholders(contact, body);
    const emailSubject = this.replacePlaceholders(contact, subject);

    try {
      const transporter = nodemailer.createTransport({
        host: smtp_host,
        port: smtp_port,
        secure: smtp_encryption === 'ssl',
        auth: { user: smtp_username, pass: smtp_password }
      });

      await transporter.sendMail({
        from: `"${from_name || 'Automation'}" <${senderEmail}>`,
        to: contact.email,
        subject: emailSubject,
        text: emailBody
      });

      return true;
    } catch (error) {
      console.error('Failed to send email:', error.message);
      return false;
    }
  }

  /**
   * Execute delay action
   */
  async executeDelay(config, contact, flowData = null, contactId = null) {
    const duration = config.duration || 5; // minutes

    if (flowData && contactId) {
      // Schedule delayed continuation via setTimeout (in microservice context)
      // In production, this would use a job queue like Bull/BullMQ
      console.log(`Scheduling delayed flow continuation for contact ${contactId} in ${duration} minutes`);

      setTimeout(async () => {
        try {
          // Make an internal API call to continue the flow
          await axios.post(
            `http://localhost:${process.env.PORT || 3008}/api/flows/internal/continue-delayed`,
            {
              contactId,
              flowId: flowData.flow_id,
              currentStep: flowData.current_step,
              organizationId: this.organizationId
            },
            {
              headers: {
                'x-internal-key': process.env.INTERNAL_API_KEY || 'internal-secret',
                Authorization: `Bearer ${this.authToken}`
              }
            }
          );
        } catch (error) {
          console.error('Error continuing delayed flow:', error.message);
        }
      }, duration * 60 * 1000);

      return 'delayed';
    }

    return true;
  }

  /**
   * Execute webhook action
   */
  async executeWebhook(config, contact, userMessage) {
    const url = (config.url || '').trim();
    const method = (config.method || 'POST').toUpperCase();

    if (!url) {
      console.warn('No URL specified for webhook action');
      return false;
    }

    const payload = {
      contact: {
        uuid: contact.uuid,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        address: contact.address ? (typeof contact.address === 'string' ? JSON.parse(contact.address) : contact.address) : {},
        metadata: contact.metadata ? (typeof contact.metadata === 'string' ? JSON.parse(contact.metadata) : contact.metadata) : {}
      },
      message: userMessage,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await axios({
        method,
        url,
        data: payload,
        timeout: 30000
      });

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error('Webhook execution error:', error.message);
      return false;
    }
  }

  /**
   * Execute AI response (placeholder)
   */
  async executeAIResponse(config, contact, userMessage) {
    const prompt = config.prompt || '';
    if (!prompt) {
      console.warn('No prompt specified for ai_response action');
      return false;
    }

    try {
      const processedPrompt = this.replacePlaceholders(contact, prompt);
      const aiResponse = `AI Response: ${processedPrompt.substring(0, 100)}...`;
      await this.sendWhatsAppMessage(contact.uuid, aiResponse);
      return true;
    } catch (error) {
      console.error('AI response execution error:', error.message);
      return false;
    }
  }

  /**
   * Execute conditional action
   */
  executeConditional(config, contact, userMessage) {
    const conditionType = config.condition_type || 'message_contains';
    const conditions = config.conditions || [];

    for (let index = 0; index < conditions.length; index++) {
      const conditionValue = conditions[index].value || '';
      if (this.evaluateCondition(conditionType, conditionValue, userMessage, contact, config.field_name || '', config.field_operator || 'equals')) {
        return index;
      }
    }

    return 'default';
  }

  /**
   * Evaluate a single condition
   */
  evaluateCondition(conditionType, conditionValue, userMessage, contact, fieldName, fieldOperator) {
    switch (conditionType) {
      case 'message_contains':
        return userMessage.toLowerCase().includes(conditionValue.toLowerCase());
      case 'message_equals':
        return userMessage.toLowerCase().trim() === conditionValue.toLowerCase().trim();
      case 'contact_field':
        if (!fieldName) return false;
        const fieldValue = this.getContactFieldValue(contact, fieldName);
        return this.compareValues(fieldValue, fieldOperator, conditionValue);
      default:
        return false;
    }
  }

  /**
   * Get a contact field value
   */
  getContactFieldValue(contact, fieldName) {
    const fieldMapping = {
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone
    };

    if (fieldMapping[fieldName] !== undefined) return fieldMapping[fieldName] || '';

    if (fieldName.startsWith('address.')) {
      const address = contact.address ? (typeof contact.address === 'string' ? JSON.parse(contact.address) : contact.address) : {};
      const key = fieldName.replace('address.', '');
      return address[key] || '';
    }

    const metadata = contact.metadata ? (typeof contact.metadata === 'string' ? JSON.parse(contact.metadata) : contact.metadata) : {};
    return metadata[fieldName] || '';
  }

  /**
   * Compare two values based on operator
   */
  compareValues(fieldValue, operator, conditionValue) {
    switch (operator) {
      case 'equals':
        return (fieldValue || '').toLowerCase().trim() === (conditionValue || '').toLowerCase().trim();
      case 'contains':
        return (fieldValue || '').toLowerCase().includes((conditionValue || '').toLowerCase());
      case 'not_equals':
        return (fieldValue || '').toLowerCase().trim() !== (conditionValue || '').toLowerCase().trim();
      case 'is_empty':
        return !(fieldValue || '').trim();
      case 'is_not_empty':
        return !!(fieldValue || '').trim();
      default:
        return false;
    }
  }

  /**
   * Replace placeholders in text
   */
  replacePlaceholders(contact, text) {
    const address = contact.address ? (typeof contact.address === 'string' ? JSON.parse(contact.address) : contact.address) : {};
    const metadata = contact.metadata ? (typeof contact.metadata === 'string' ? JSON.parse(contact.metadata) : contact.metadata) : {};

    const fullAddress = [address.street, address.city, address.state, address.zip, address.country]
      .filter(Boolean).join(', ');

    const placeholders = {
      '{first_name}': contact.first_name || '',
      '{last_name}': contact.last_name || '',
      '{full_name}': `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
      '{email}': contact.email || '',
      '{phone}': contact.phone || '',
      '{organization_name}': contact.organization_name || '',
      '{full_address}': fullAddress,
      '{street}': address.street || '',
      '{city}': address.city || '',
      '{state}': address.state || '',
      '{zip_code}': address.zip || '',
      '{country}': address.country || ''
    };

    // Add metadata placeholders
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        const transformedKey = key.toLowerCase().replace(/ /g, '_');
        placeholders[`{${transformedKey}}`] = value || '';
      }
    }

    let result = text;
    for (const [placeholder, value] of Object.entries(placeholders)) {
      result = result.split(placeholder).join(value);
    }
    return result;
  }

  /**
   * Send a WhatsApp message via whatsapp-service
   */
  async sendWhatsAppMessage(contactUuid, message) {
    try {
      await axios.post(
        `${WHATSAPP_SERVICE_URL}/api/whatsapp/send-message`,
        {
          contactUuid,
          message,
          messageType: 'text'
        },
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error.message);
      return false;
    }
  }
}

export default ActionExecutionService;
