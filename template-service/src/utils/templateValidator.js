/**
 * WhatsApp Template Validation
 * Validates template structure according to Meta API requirements
 */

export class TemplateValidator {
  /**
   * Validate marketing template payload
   */
  static validateMarketingTemplate(payload) {
    const errors = [];

    // Validate required fields
    if (!payload.name) {
      errors.push('Template name is required');
    } else if (!/^[a-z0-9_]+$/.test(payload.name)) {
      errors.push('Template name must be lowercase alphanumeric with underscores only');
    } else if (payload.name.length > 512) {
      errors.push('Template name must not exceed 512 characters');
    }

    if (!payload.language) {
      errors.push('Language is required');
    }

    if (!payload.category) {
      errors.push('Category is required');
    } else if (!['marketing', 'utility', 'authentication'].includes(payload.category.toLowerCase())) {
      errors.push('Invalid category. Must be: marketing, utility, or authentication');
    }

    if (!payload.components || !Array.isArray(payload.components)) {
      errors.push('Components array is required');
    } else {
      const componentErrors = this.validateComponents(payload.components);
      errors.push(...componentErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate components array
   * Body component is REQUIRED, others are optional
   */
  static validateComponents(components) {
    const errors = [];
    const validTypes = ['header', 'body', 'footer', 'buttons'];

    if (!Array.isArray(components) || components.length === 0) {
      errors.push('At least body component is required');
      return errors;
    }

    // Check if body component exists (REQUIRED)
    const hasBodyComponent = components.some(comp => comp.type === 'body');
    if (!hasBodyComponent) {
      errors.push('Body component is required. Must include at least a body component with text.');
      return errors;
    }

    for (let i = 0; i < components.length; i++) {
      const component = components[i];

      if (!component.type) {
        errors.push(`Component ${i}: type is required`);
        continue;
      }

      if (!validTypes.includes(component.type)) {
        errors.push(`Component ${i}: invalid type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate specific component types
      switch (component.type) {
        case 'header':
          const headerErrors = this.validateHeaderComponent(component, i);
          errors.push(...headerErrors);
          break;
        case 'body':
          const bodyErrors = this.validateBodyComponent(component, i);
          errors.push(...bodyErrors);
          break;
        case 'footer':
          const footerErrors = this.validateFooterComponent(component, i);
          errors.push(...footerErrors);
          break;
        case 'buttons':
          const buttonErrors = this.validateButtonsComponent(component, i);
          errors.push(...buttonErrors);
          break;
      }
    }

    return errors;
  }

  /**
   * Validate header component
   */
  static validateHeaderComponent(component, index) {
    const errors = [];

    if (!component.format) {
      errors.push(`Component ${index}: header format is required`);
    } else if (!['text', 'image', 'video', 'document'].includes(component.format)) {
      errors.push(`Component ${index}: invalid header format`);
    }

    if (component.format === 'text' && !component.text) {
      errors.push(`Component ${index}: header text is required for text format`);
    } else if (component.format === 'text' && component.text.length > 60) {
      errors.push(`Component ${index}: header text must not exceed 60 characters`);
    }

    return errors;
  }

  /**
   * Validate body component
   */
  static validateBodyComponent(component, index) {
    const errors = [];

    if (!component.text) {
      errors.push(`Component ${index}: body text is required`);
    } else if (component.text.length > 1024) {
      errors.push(`Component ${index}: body text must not exceed 1024 characters`);
    }

    // Validate parameters if present
    if (component.example?.body_text_named_params) {
      if (!Array.isArray(component.example.body_text_named_params)) {
        errors.push(`Component ${index}: body_text_named_params must be an array`);
      } else {
        component.example.body_text_named_params.forEach((param, paramIndex) => {
          if (!param.param_name) {
            errors.push(`Component ${index}, Parameter ${paramIndex}: param_name is required`);
          }
          if (!param.example) {
            errors.push(`Component ${index}, Parameter ${paramIndex}: example is required`);
          }
        });
      }
    }

    return errors;
  }

  /**
   * Validate footer component
   */
  static validateFooterComponent(component, index) {
    const errors = [];

    if (!component.text) {
      errors.push(`Component ${index}: footer text is required`);
    } else if (component.text.length > 60) {
      errors.push(`Component ${index}: footer text must not exceed 60 characters`);
    }

    return errors;
  }

  /**
   * Validate buttons component
   */
  static validateButtonsComponent(component, index) {
    const errors = [];
    const validButtonTypes = ['url', 'phone_number', 'quick_reply', 'copy_code'];

    if (!component.buttons || !Array.isArray(component.buttons)) {
      errors.push(`Component ${index}: buttons array is required`);
      return errors;
    }

    if (component.buttons.length === 0 || component.buttons.length > 3) {
      errors.push(`Component ${index}: buttons must have 1-3 items`);
    }

    component.buttons.forEach((btn, btnIndex) => {
      if (!btn.type) {
        errors.push(`Component ${index}, Button ${btnIndex}: type is required`);
      } else if (!validButtonTypes.includes(btn.type)) {
        errors.push(`Component ${index}, Button ${btnIndex}: invalid button type`);
      }

      if (!btn.text) {
        errors.push(`Component ${index}, Button ${btnIndex}: text is required`);
      } else if (btn.text.length > 25) {
        errors.push(`Component ${index}, Button ${btnIndex}: text must not exceed 25 characters`);
      }

      // Type-specific validation
      if (btn.type === 'url' && !btn.url) {
        errors.push(`Component ${index}, Button ${btnIndex}: url is required for url button`);
      }

      if (btn.type === 'phone_number' && !btn.phone_number) {
        errors.push(`Component ${index}, Button ${btnIndex}: phone_number is required for phone_number button`);
      }
    });

    return errors;
  }

  /**
   * Sanitize template name
   */
  static sanitizeTemplateName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 512);
  }

  /**
   * Extract parameters from template text
   */
  static extractParameters(text) {
    const paramPattern = /\{\{(\w+)\}\}/g;
    const params = [];
    let match;

    while ((match = paramPattern.exec(text)) !== null) {
      if (!params.includes(match[1])) {
        params.push(match[1]);
      }
    }

    return params;
  }
}

export default TemplateValidator;
