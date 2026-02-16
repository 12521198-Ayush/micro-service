/**
 * Flow Validator Service
 * Validates all node types in a flow before publishing
 * Replicates the FlowValidator from nyife-dev
 */

class FlowValidator {
  /**
   * Validate all nodes in a flow metadata
   * @param {object} metadata - Parsed flow metadata {nodes, edges}
   * @returns {true|object} - true if valid, or object of errors
   */
  validateMessageNodes(metadata) {
    const errors = {};

    if (!metadata || !metadata.nodes) {
      return { general: 'Flow metadata is missing or invalid.' };
    }

    for (const node of metadata.nodes) {
      const data = node.data?.metadata?.fields || {};

      switch (node.type) {
        case 'start':
          if (data.type === 'keywords') {
            if (!data.keywords || data.keywords.length === 0) {
              errors.keywords = 'Keywords field is required and cannot be empty.';
            }
          }
          break;

        case 'text': {
          const textValidation = this.validateText(data);
          if (textValidation !== true) {
            errors.text = textValidation;
          }
          break;
        }

        case 'media': {
          const mediaValidation = this.validateMedia(data);
          if (mediaValidation !== true) {
            errors.media = mediaValidation;
          }
          break;
        }

        case 'buttons': {
          const buttonsValidation = this.validateButtons(data);
          if (buttonsValidation !== true) {
            errors.buttons = buttonsValidation;
          }
          break;
        }

        case 'list': {
          const listValidation = this.validateList(data);
          if (listValidation !== true) {
            errors.list = listValidation;
          }
          break;
        }

        case 'action': {
          const actionValidation = this.validateAction(node.data);
          if (actionValidation !== true) {
            errors.action = actionValidation;
          }
          break;
        }

        default:
          break;
      }
    }

    return Object.keys(errors).length === 0 ? true : errors;
  }

  validateText(data) {
    const errors = [];
    if (!data.body) {
      errors.push('Text body is required.');
    }
    return errors.length > 0 ? errors : true;
  }

  validateMedia(data) {
    const errors = [];
    if (!data.media || !data.media.path) {
      errors.push('Media path is required.');
    }
    if (!data.mediaType) {
      errors.push('Media type (image, audio, etc.) is required.');
    }
    if (data.mediaType && data.media?.metadata) {
      let mimeType = '';
      try {
        mimeType = JSON.parse(data.media.metadata).extension || '';
      } catch (e) {
        mimeType = '';
      }
      const validTypes = this.validateMediaTypeFormat(mimeType, data.mediaType);
      if (validTypes !== true) {
        errors.push(validTypes);
      }
    }
    return errors.length > 0 ? errors : true;
  }

  validateButtons(data) {
    const errors = [];

    if (data.headerType) {
      switch (data.headerType) {
        case 'text':
          if (!data.headerText) errors.push('Header text is required when headerType is "text".');
          break;
        case 'image':
        case 'video':
        case 'document':
          if (!data.headerMedia) {
            errors.push(`Media is required when headerType is "${data.headerType}".`);
          } else if (data.headerMedia?.metadata) {
            let mimeType = '';
            try {
              mimeType = JSON.parse(data.headerMedia.metadata).extension || '';
            } catch (e) { mimeType = ''; }
            const validTypes = this.validateMediaTypeFormat(mimeType, data.headerType);
            if (validTypes !== true) errors.push(validTypes);
          }
          break;
      }
    }

    if (!data.body) errors.push('Body text is required.');

    if ((data.buttonType || '') === 'buttons' && data.buttons) {
      const validButtons = {};
      if (data.buttons.button1) validButtons.button1 = data.buttons.button1;
      if (data.buttons.button2) validButtons.button2 = data.buttons.button2;
      if (data.buttons.button3) validButtons.button3 = data.buttons.button3;

      if (Object.keys(validButtons).length === 0) {
        errors.push('At least one button (button1, button2, button3) must have a value.');
      }

      for (const [key, value] of Object.entries(validButtons)) {
        if (!this.validateButtonValueLength(value)) {
          errors.push(`${key.charAt(0).toUpperCase() + key.slice(1)} must be between 1 to 20 characters.`);
        }
      }
    }

    if (data.buttonType === 'cta_url') {
      if (!data.ctaUrlButton || !data.ctaUrlButton.displayText || !data.ctaUrlButton.url) {
        errors.push('Both displayText and url are required for ctaUrlButton.');
      }
      if (data.ctaUrlButton && (!data.ctaUrlButton.displayText || !data.ctaUrlButton.url)) {
        errors.push('Both displayText and url must not be empty.');
      }
      const urlPattern = /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/\S*)?$/;
      if (data.ctaUrlButton?.url && !urlPattern.test(data.ctaUrlButton.url)) {
        errors.push('The URL format is invalid. Please provide a valid URL.');
      }
    }

    return errors.length > 0 ? errors : true;
  }

  validateList(data) {
    const errors = [];

    if (data.headerType) {
      switch (data.headerType) {
        case 'text':
          if (!data.headerText) errors.push('Header text is required when headerType is "text".');
          break;
        case 'image':
        case 'video':
        case 'document':
          if (!data.headerMedia) {
            errors.push(`Media is required when headerType is "${data.headerType}".`);
          } else if (data.headerMedia?.metadata) {
            let mimeType = '';
            try {
              mimeType = JSON.parse(data.headerMedia.metadata).extension || '';
            } catch (e) { mimeType = ''; }
            const validTypes = this.validateMediaTypeFormat(mimeType, data.headerType);
            if (validTypes !== true) errors.push(validTypes);
          }
          break;
      }
    }

    if (!data.body) errors.push('Body text is required.');
    if (!data.buttonLabel) errors.push('Button label is required.');
    if (!data.sections || !Array.isArray(data.sections)) {
      errors.push('List sections are required.');
    }

    let hasEmptySections = false;
    if (data.sections) {
      for (const section of data.sections) {
        if (!section.title) errors.push('Each list section must have a title.');
        if (!section.rows || !Array.isArray(section.rows)) {
          errors.push('Each list section must have rows.');
          continue;
        }
        const allRowsEmpty = section.rows.every(row => !row.title || !row.id);
        if (allRowsEmpty) hasEmptySections = true;
      }
    }

    if (hasEmptySections) {
      errors.push('Each section must contain at least one row with both a title and an id.');
    }

    return errors.length > 0 ? errors : true;
  }

  validateAction(data) {
    const errors = [];
    let actionType = data?.actionType || '';
    const config = data?.config || {};
    const isActive = data?.is_active !== undefined ? data.is_active : true;

    if (!isActive) return true;

    actionType = actionType.replace(/-/g, '_');

    switch (actionType) {
      case 'add_to_group':
      case 'remove_from_group':
        if (!config.group_id) errors.push(`Group ID is required for ${actionType} action.`);
        break;
      case 'update_contact':
        if (!config.target_field) errors.push('Target field is required for update_contact action.');
        break;
      case 'send_email':
        if (!config.subject) errors.push('Subject is required for send_email action.');
        if (!config.body) errors.push('Body is required for send_email action.');
        if (!config.smtp_host) errors.push('SMTP host is required for send_email action.');
        if (!config.smtp_username) errors.push('SMTP username is required for send_email action.');
        if (!config.smtp_password) errors.push('SMTP password is required for send_email action.');
        break;
      case 'delay':
        if (!config.duration || config.duration <= 0) errors.push('Duration must be greater than 0 for delay action.');
        break;
      case 'webhook':
        if (!config.url) errors.push('URL is required for webhook action.');
        break;
      case 'ai_response':
        if (!config.prompt) errors.push('Prompt is required for ai_response action.');
        break;
      case 'conditional':
        if (!config.condition_type) errors.push('Condition type is required for conditional action.');
        if (!config.conditions || !Array.isArray(config.conditions)) errors.push('Conditions array is required for conditional action.');
        if (config.condition_type === 'contact_field' && !config.field_name) errors.push('Field name is required for contact_field condition type.');
        break;
      default:
        if (!actionType) errors.push('Action type is required.');
        break;
    }

    return errors.length > 0 ? errors : true;
  }

  validateMediaTypeFormat(mimeType, mediaType) {
    const validFormats = {
      image: ['image/jpeg', 'image/png'],
      audio: ['audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/amr', 'audio/mp4', 'audio/ogg'],
      document: [
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ],
      video: ['video/mp4', 'video/3gpp']
    };

    if (validFormats[mediaType] && !validFormats[mediaType].includes(mimeType)) {
      const typeNames = {
        image: 'JPEG, PNG', audio: 'MP3, AAC, AMR, MP4, OGG',
        document: 'PDF, TXT, DOC, DOCX, XLS, XLSX, PPT, PPTX', video: 'MP4, 3GPP'
      };
      return `Invalid ${mediaType} format. Allowed types: ${typeNames[mediaType]}.`;
    }

    return true;
  }

  validateButtonValueLength(value) {
    const length = value.trim().length;
    return length >= 1 && length <= 20;
  }
}

export default FlowValidator;
