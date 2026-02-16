/**
 * Flow Execution Service
 * Core engine that processes automation flows for incoming messages
 * Replicates FlowExecutionService from nyife-dev
 */
import axios from 'axios';
import Flow from '../models/Flow.js';
import FlowLog from '../models/FlowLog.js';
import FlowUserData from '../models/FlowUserData.js';
import ActionExecutionService from './ActionExecutionService.js';

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3006';
const CONTACT_SERVICE_URL = process.env.CONTACT_SERVICE_URL || 'http://localhost:3002';

class FlowExecutionService {
  constructor(organizationId, authToken) {
    this.organizationId = organizationId;
    this.authToken = authToken;
  }

  /**
   * Main entry point: execute flow for an incoming message
   * @param {object} chat - { contact_id, organization_id }
   * @param {boolean} isNewContact
   * @param {string} message - the incoming message text
   */
  async executeFlow(chat, isNewContact, message) {
    console.log(`Starting flow execution for contact: ${chat.contact_id}, isNewContact: ${isNewContact}, message: ${message}`);

    let flowData = await FlowUserData.findByContactId(chat.contact_id);
    let flowId = null;

    // If contact has an existing flow in progress
    if (flowData) {
      console.log(`Existing flow data found for contact ${chat.contact_id}, flow_id: ${flowData.flow_id}`);
      const flow = await Flow.findById(flowData.flow_id);

      if (!flow) {
        console.warn(`Flow not found, deleting FlowUserData for contact ${chat.contact_id}`);
        await FlowUserData.deleteByContactId(chat.contact_id);
        flowData = null;
      } else {
        flowId = flowData.flow_id;
        const result = await this.processFlow(chat, isNewContact, flowData, chat.contact_id, (message || '').toLowerCase().trim());

        if (result === 'validation_failed' || result === 'delayed') {
          return false;
        }
        return result;
      }
    }

    // No existing flow - determine which flow to trigger
    if (!flowData) {
      console.log(`No existing flow data for contact ${chat.contact_id}, determining flow based on trigger`);
      let flow = null;

      if (isNewContact) {
        console.log(`Checking for new_contact trigger flow`);
        const flows = await Flow.findActiveByTrigger(chat.organization_id, 'new_contact');
        flow = flows[0] || null;
      } else {
        console.log(`Checking for keyword trigger flow, message: ${message}`);
        const msg = (message || '').toLowerCase().trim();

        // Priority 1: exact phrase match
        flow = await Flow.findByKeywordExact(chat.organization_id, msg);

        // Priority 2: individual word match
        if (!flow) {
          flow = await Flow.findByKeywordPartial(chat.organization_id, msg);
        }
      }

      if (flow) {
        console.log(`Matching flow found for contact ${chat.contact_id}, flow_id: ${flow.id}`);
        flowId = flow.id;
      }

      if (flowId) {
        flowData = await FlowUserData.create({
          contact_id: chat.contact_id,
          flow_id: flowId,
          current_step: '1'
        });

        const result = await this.processFlow(chat, isNewContact, flowData, chat.contact_id, (message || '').toLowerCase().trim());

        if (result === 'validation_failed' || result === 'delayed') {
          return false;
        }
        return result;
      }
    }

    return false;
  }

  /**
   * Check if a contact has an active flow
   */
  async hasActiveFlow(contactId) {
    const activeFlow = await FlowUserData.findByContactId(contactId);
    return !!activeFlow;
  }

  /**
   * Continue a delayed flow after a delay action
   */
  async continueDelayedFlow(contactId, flowId, currentStep) {
    console.log(`Continuing delayed flow for contact: ${contactId}, flow_id: ${flowId}, current_step: ${currentStep}`);

    const flowData = await FlowUserData.findByContactAndFlow(contactId, flowId);
    if (!flowData) {
      console.warn(`FlowUserData not found for delayed flow: contact ${contactId}, flow ${flowId}`);
      return false;
    }

    if (String(flowData.current_step) !== String(currentStep)) {
      await FlowUserData.updateStep(contactId, currentStep);
    }

    const flow = await Flow.findById(flowData.flow_id);
    if (flow && flow.metadata) {
      const edgesArray = JSON.parse(flow.metadata);
      const edges = edgesArray.edges || [];

      const nextNodes = [];
      for (const edge of edges) {
        if (edge.source && String(edge.source) === String(flowData.current_step)) {
          if (edge.targetNode?.id) nextNodes.push(edge.targetNode.id);
        }
      }

      if (nextNodes.length > 0) {
        console.log(`Moving to next step after delay: ${nextNodes[0]}`);
        await FlowUserData.updateStep(contactId, nextNodes[0]);
      }
    }

    // Get contact info
    const contact = await this.getContact(contactId);
    if (!contact) {
      console.warn(`Contact not found for delayed flow continuation: ${contactId}`);
      return false;
    }

    const updatedFlowData = await FlowUserData.findByContactId(contactId);
    const chat = { contact_id: contactId, organization_id: this.organizationId };
    return this.processFlow(chat, false, updatedFlowData, contactId, '');
  }

  /**
   * Process flow: iterate through nodes
   */
  async processFlow(chat, isNewContact, flowData, contactId, message) {
    console.log(`Processing flow for contact: ${contactId}, flow_id: ${flowData.flow_id}, current_step: ${flowData.current_step}`);

    const flow = await Flow.findById(flowData.flow_id);
    if (!flow || !flow.metadata) {
      console.warn(`Flow not found or metadata empty for flow_id: ${flowData.flow_id}`);
      return false;
    }

    const contact = await this.getContact(contactId);
    if (!contact) {
      console.warn(`Contact not found: ${contactId}`);
      return false;
    }

    const edgesArray = JSON.parse(flow.metadata);
    const edges = edgesArray.edges || [];

    const maxIterations = 50;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      console.log(`Flow iteration ${iteration} for contact ${contactId}, current_step: ${flowData.current_step}`);

      const metadataArray = this.findEdgesBySource(edges, flowData.current_step, message);

      if (!metadataArray || Object.keys(metadataArray).length === 0) {
        console.warn(`No next step found for contact ${contactId}, ending flow`);
        await FlowUserData.deleteByContactId(contactId);
        // Try to re-trigger flow
        await this.executeFlow(chat, isNewContact, message);
        return false;
      }

      const nodeType = metadataArray.type || null;
      console.log(`Processing node of type: ${nodeType}`);

      if (nodeType === 'action') {
        const result = await this.processActionNode(metadataArray, contact, message, flowData, contactId);

        if (result === false) return false;
        if (result === 'validation_failed') return 'validation_failed';
        if (result === 'delayed') return 'delayed';

        // Refresh flow data
        flowData = await FlowUserData.findByContactId(contactId);
        if (!flowData) return false;
        continue;
      }

      return this.processMessageNode(metadataArray, contact, flowData, contactId);
    }

    console.warn(`Maximum iterations reached for contact ${contactId}, ending flow`);
    await FlowUserData.deleteByContactId(contactId);
    return false;
  }

  /**
   * Process a message node - send message and pause
   */
  async processMessageNode(metadataArray, contact, flowData, contactId) {
    console.log(`Processing message node for contact: ${contactId}`);
    const fieldsArray = metadataArray.data?.metadata?.fields || {};
    const type = fieldsArray.type || null;

    let message = this.replacePlaceholders(contact, fieldsArray.body || '');
    let response = null;

    switch (type) {
      case 'text':
        response = await this.sendWhatsAppMessage(contact, message, 'text');
        break;

      case 'media': {
        const mediaInfo = fieldsArray.media?.metadata ? JSON.parse(fieldsArray.media.metadata) : {};
        response = await this.sendWhatsAppMedia(contact, {
          mediaType: fieldsArray.mediaType || '',
          name: mediaInfo.name || '',
          path: fieldsArray.media?.path || '',
          location: fieldsArray.media?.location === 'aws' ? 'amazon' : fieldsArray.media?.location || 'local',
          caption: fieldsArray.caption || ''
        });
        break;
      }

      case 'interactive buttons': {
        const buttonType = (fieldsArray.buttonType || '') === 'buttons'
          ? 'interactive buttons'
          : 'interactive call to action url';
        const buttonArray = this.prepareButtonArray(fieldsArray, buttonType);
        const header = this.prepareHeader(fieldsArray);

        response = await this.sendWhatsAppInteractive(contact, {
          body: message,
          type: buttonType,
          buttons: buttonArray,
          header,
          footer: fieldsArray.footer || ''
        });
        break;
      }

      case 'interactive list': {
        const listButtons = this.prepareButtonArray(fieldsArray, 'interactive list');
        const listHeader = this.prepareHeader(fieldsArray);

        response = await this.sendWhatsAppInteractive(contact, {
          body: message,
          type: 'interactive list',
          buttons: listButtons,
          header: listHeader,
          footer: fieldsArray.footer || '',
          buttonLabel: fieldsArray.buttonLabel || ''
        });
        break;
      }
    }

    if (response) {
      this.proceedToNextStep(flowData, contactId);

      await FlowLog.create({
        flow_id: flowData.flow_id,
        chat_id: response.chatId || null,
        contact_id: contactId
      });

      return true;
    } else {
      // Proceed anyway to avoid getting stuck
      this.proceedToNextStep(flowData, contactId);
      return true;
    }
  }

  /**
   * Process an action node
   */
  async processActionNode(metadataArray, contact, message, flowData, contactId) {
    const actionType = (metadataArray.data?.actionType || '').replace(/-/g, '_');
    const config = metadataArray.data?.config || {};
    const isActive = metadataArray.data?.is_active !== undefined ? metadataArray.data.is_active : true;

    if (!actionType || !isActive) {
      await this.proceedToNextStep(flowData, contactId);
      return true;
    }

    const actionService = new ActionExecutionService(this.organizationId, this.authToken);
    const result = await actionService.executeAction(actionType, config, contact, message, flowData, contactId);

    if (actionType === 'conditional') {
      return this.handleConditionalAction(result, flowData, contactId, metadataArray);
    }

    if (actionType === 'update_contact' && result === false) {
      return 'validation_failed';
    }

    if (result === 'delayed') return 'delayed';

    if (result === false) {
      await FlowUserData.deleteByContactId(contactId);
      return false;
    }

    await this.proceedToNextStep(flowData, contactId);
    return true;
  }

  /**
   * Handle conditional action routing
   */
  async handleConditionalAction(conditionResult, flowData, contactId, metadataArray) {
    const flow = await Flow.findById(flowData.flow_id);
    if (!flow || !flow.metadata) return false;

    const edgesArray = JSON.parse(flow.metadata);
    const edges = edgesArray.edges || [];
    const currentStep = flowData.current_step;

    // Update current step to the conditional node if needed
    const conditionalNodeId = metadataArray.id || null;
    if (conditionalNodeId && String(flowData.current_step) !== String(conditionalNodeId)) {
      await FlowUserData.updateStep(contactId, conditionalNodeId);
      flowData = await FlowUserData.findByContactId(contactId);
    }

    const sourceHandle = conditionResult !== 'default'
      ? `condition-${conditionResult}|${currentStep}`
      : `default|${currentStep}`;

    for (const edge of edges) {
      if (
        edge.source && String(edge.source) === String(currentStep) &&
        edge.sourceHandle === sourceHandle
      ) {
        const targetNode = edge.targetNode?.id;
        if (targetNode) {
          await FlowUserData.updateStep(contactId, targetNode);
          flowData = await FlowUserData.findByContactId(contactId);
          const chat = { contact_id: contactId, organization_id: this.organizationId };
          await this.processFlow(chat, false, flowData, contactId, '');
          return true;
        }
      }
    }

    await FlowUserData.deleteByContactId(contactId);
    return false;
  }

  /**
   * Proceed to the next step in the flow
   */
  async proceedToNextStep(flowData, contactId) {
    const flow = await Flow.findById(flowData.flow_id);
    if (!flow || !flow.metadata) return;

    const edgesArray = JSON.parse(flow.metadata);
    const edges = edgesArray.edges || [];

    const nextNodes = [];
    for (const edge of edges) {
      if (edge.source && String(edge.source) === String(flowData.current_step)) {
        if (edge.targetNode?.id) nextNodes.push(edge.targetNode.id);
      }
    }

    if (nextNodes.length > 0) {
      await FlowUserData.updateStep(contactId, nextNodes[0]);
    } else {
      await FlowUserData.deleteByContactId(contactId);
    }
  }

  /**
   * Find edges by source node and determine next target node
   */
  findEdgesBySource(edges, sourceId, message) {
    sourceId = String(sourceId);
    const matchingEdges = edges.filter(e => e.source && String(e.source) === sourceId);

    if (matchingEdges.length === 1) {
      return matchingEdges[0].targetNode || {};
    }

    if (matchingEdges.length > 1) {
      const firstEdge = matchingEdges[0];
      const nodeType = firstEdge.sourceNode?.type;
      const type = firstEdge.sourceNode?.data?.metadata?.fields?.type;

      if (nodeType === 'action') {
        return matchingEdges[0].targetNode || {};
      }

      if (type === 'interactive buttons') {
        const buttons = firstEdge.sourceNode?.data?.metadata?.fields?.buttons || {};
        const buttonMapping = { button1: 'a', button2: 'b', button3: 'c' };
        let handle = null;

        for (const [buttonKey, buttonValue] of Object.entries(buttons)) {
          if (String(buttonValue).toLowerCase().trim() === message) {
            handle = buttonMapping[buttonKey] || null;
          }
        }

        if (handle) {
          const matchedEdge = matchingEdges.find(e => e.sourceHandle === handle);
          if (matchedEdge) return matchedEdge.targetNode || {};
        }
      } else if (type === 'interactive list') {
        const sections = firstEdge.sourceNode?.data?.metadata?.fields?.sections || [];
        let handle = null;

        for (let si = 0; si < sections.length; si++) {
          const rows = sections[si].rows || [];
          for (let ri = 0; ri < rows.length; ri++) {
            if (rows[ri].title && rows[ri].title.toLowerCase().trim() === (message || '').toLowerCase().trim()) {
              handle = `a${si}${ri}`;
            }
          }
        }

        if (handle) {
          const matchedEdge = matchingEdges.find(e => e.sourceHandle === handle);
          if (matchedEdge) return matchedEdge.targetNode || {};
        }
      }

      return {};
    }

    return {};
  }

  /**
   * Prepare header data for interactive messages
   */
  prepareHeader(fieldsArray) {
    const header = {};

    if ((fieldsArray.headerType || '') === 'text') {
      header.type = 'text';
      header.text = fieldsArray.headerText || '';
    } else if ((fieldsArray.headerType || '') !== 'none' && fieldsArray.headerType) {
      header.type = fieldsArray.headerType;
      header[fieldsArray.headerType] = { link: fieldsArray.headerMedia?.path || '' };
    }

    return header;
  }

  /**
   * Prepare button array for interactive messages
   */
  prepareButtonArray(fieldsArray, type) {
    const buttonArray = [];

    if (type === 'interactive buttons') {
      const buttons = fieldsArray.buttons || {};
      for (const [id, title] of Object.entries(buttons)) {
        if (title) buttonArray.push({ id, title });
      }
    } else if (type === 'interactive call to action url') {
      return {
        display_text: fieldsArray.ctaUrlButton?.displayText || '',
        url: fieldsArray.ctaUrlButton?.url || ''
      };
    } else if (type === 'interactive list') {
      return (fieldsArray.sections || []).map(section => ({
        title: section.title || '',
        rows: (section.rows || []).map(row => ({
          id: row.id || '',
          title: row.title || '',
          description: row.description || ''
        }))
      }));
    }

    return buttonArray;
  }

  /**
   * Replace placeholders in message text
   */
  replacePlaceholders(contact, message) {
    const address = contact.address ? (typeof contact.address === 'string' ? JSON.parse(contact.address) : contact.address) : {};
    const metadata = contact.metadata ? (typeof contact.metadata === 'string' ? JSON.parse(contact.metadata) : contact.metadata) : {};

    const fullAddress = [address.street, address.city, address.state, address.zip, address.country]
      .filter(Boolean).join(', ');

    const data = {
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      full_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
      email: contact.email || '',
      phone: contact.phone || '',
      organization_name: contact.organization_name || '',
      full_address: fullAddress,
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zip_code: address.zip || '',
      country: address.country || ''
    };

    // Add metadata placeholders
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        data[key.toLowerCase().replace(/ /g, '_')] = value || '';
      }
    }

    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Get contact from contact-service
   */
  async getContact(contactId) {
    try {
      const response = await axios.get(
        `${CONTACT_SERVICE_URL}/api/contacts/${contactId}`,
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );
      return response.data?.data || response.data || null;
    } catch (error) {
      console.error(`Failed to get contact ${contactId}:`, error.message);
      return null;
    }
  }

  /**
   * Send WhatsApp text message via whatsapp-service
   */
  async sendWhatsAppMessage(contact, message, messageType = 'text') {
    try {
      const response = await axios.post(
        `${WHATSAPP_SERVICE_URL}/api/whatsapp/send-message`,
        { contactUuid: contact.uuid, message, messageType },
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error.message);
      return null;
    }
  }

  /**
   * Send WhatsApp media message
   */
  async sendWhatsAppMedia(contact, mediaData) {
    try {
      const response = await axios.post(
        `${WHATSAPP_SERVICE_URL}/api/whatsapp/send-media`,
        { contactUuid: contact.uuid, ...mediaData },
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to send WhatsApp media:', error.message);
      return null;
    }
  }

  /**
   * Send WhatsApp interactive message (buttons/list)
   */
  async sendWhatsAppInteractive(contact, interactiveData) {
    try {
      const response = await axios.post(
        `${WHATSAPP_SERVICE_URL}/api/whatsapp/send-interactive`,
        { contactUuid: contact.uuid, ...interactiveData },
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to send WhatsApp interactive message:', error.message);
      return null;
    }
  }
}

export default FlowExecutionService;
