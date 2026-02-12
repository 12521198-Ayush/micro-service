import { removeUndefinedDeep } from './object.js';
import { deriveTemplateType } from './templateType.js';

const ALLOWED_CATEGORIES = new Set(['MARKETING', 'UTILITY', 'AUTHENTICATION']);
const ALLOWED_HEADER_FORMATS = new Set(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION']);
const CAROUSEL_CARD_HEADER_FORMATS = new Set(['IMAGE', 'VIDEO']);
const MEDIA_HEADER_FORMATS_REQUIRING_HANDLE_EXAMPLE = new Set(['IMAGE', 'VIDEO', 'DOCUMENT']);
const KNOWN_COMPONENT_TYPES = new Set([
  'HEADER',
  'BODY',
  'FOOTER',
  'BUTTONS',
  'CAROUSEL',
  'LIMITED_TIME_OFFER',
]);

const KNOWN_BUTTON_TYPES = new Set([
  'QUICK_REPLY',
  'URL',
  'PHONE_NUMBER',
  'COPY_CODE',
  'OTP',
  'FLOW',
  'FLOW_ACTION',
  'CATALOG',
  'SPM',
]);

const VARIABLE_TOKEN_PATTERN = /\{\{[^{}]+\}\}/;

const hasTemplateVariables = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  return VARIABLE_TOKEN_PATTERN.test(value);
};

const toUpper = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toUpperCase();
};

export const sanitizeTemplateName = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 512);
};

const normalizeButton = (button = {}) => {
  const normalizedType = toUpper(button.type);

  return removeUndefinedDeep({
    ...button,
    type: normalizedType === 'PHONE' ? 'PHONE_NUMBER' : normalizedType,
  });
};

const normalizeComponent = (component = {}) => {
  const type = toUpper(component.type);

  if (type === 'BUTTONS') {
    return removeUndefinedDeep({
      ...component,
      type,
      buttons: Array.isArray(component.buttons)
        ? component.buttons.map((button) => normalizeButton(button))
        : component.buttons,
    });
  }

  if (type === 'CAROUSEL') {
    return removeUndefinedDeep({
      ...component,
      type,
      cards: Array.isArray(component.cards)
        ? component.cards.map((card) => ({
            ...card,
            components: normalizeComponents(card.components),
          }))
        : component.cards,
    });
  }

  if (type === 'HEADER') {
    return removeUndefinedDeep({
      ...component,
      type,
      format: toUpper(component.format),
    });
  }

  return removeUndefinedDeep({
    ...component,
    type,
  });
};

const normalizeComponents = (components) => {
  if (!Array.isArray(components)) {
    return components;
  }

  return components.map((component) => normalizeComponent(component));
};

const buildLegacyComponents = (payload) => {
  const components = [];

  if (payload.header) {
    components.push(
      removeUndefinedDeep({
        type: 'HEADER',
        format: toUpper(payload.header.format),
        text: payload.header.text,
        example: payload.header.example,
      })
    );
  }

  if (payload.body) {
    components.push(
      removeUndefinedDeep({
        type: 'BODY',
        text: payload.body.text,
        example: payload.body.example,
        add_security_recommendation: payload.body.add_security_recommendation,
      })
    );
  }

  if (payload.footer) {
    components.push(
      removeUndefinedDeep({
        type: 'FOOTER',
        text: payload.footer.text,
        code_expiration_minutes: payload.footer.code_expiration_minutes,
      })
    );
  }

  if (Array.isArray(payload.buttons) && payload.buttons.length > 0) {
    components.push({
      type: 'BUTTONS',
      buttons: payload.buttons,
    });
  }

  if (payload.authentication_button) {
    components.push({
      type: 'BUTTONS',
      buttons: [payload.authentication_button],
    });
  }

  if (Array.isArray(payload.carousel_cards) && payload.carousel_cards.length > 0) {
    components.push({
      type: 'CAROUSEL',
      cards: payload.carousel_cards,
    });
  }

  return components;
};

const maybeLiftLegacyPayload = (rawPayload) => {
  if (!rawPayload || Array.isArray(rawPayload.components)) {
    return rawPayload;
  }

  const hasLegacyShape =
    rawPayload.header ||
    rawPayload.body ||
    rawPayload.footer ||
    rawPayload.buttons ||
    rawPayload.authentication_button ||
    rawPayload.carousel_cards;

  if (!hasLegacyShape) {
    return rawPayload;
  }

  return {
    ...rawPayload,
    components: buildLegacyComponents(rawPayload),
  };
};

export const normalizeTemplatePayload = (rawPayload, options = {}) => {
  const payload = maybeLiftLegacyPayload(rawPayload || {});
  const normalized = removeUndefinedDeep({
    name: typeof payload.name === 'string' ? sanitizeTemplateName(payload.name) : payload.name,
    language: payload.language,
    category: toUpper(payload.category),
    components: normalizeComponents(payload.components),
    parameter_format: payload.parameter_format || payload.parameterFormat,
    message_send_ttl_seconds: payload.message_send_ttl_seconds,
  });

  if (options.forUpdate) {
    return normalized;
  }

  return normalized;
};

const validateName = (name, errors, forUpdate) => {
  if (!name) {
    if (!forUpdate) {
      errors.push('Template name is required.');
    }
    return;
  }

  if (!/^[a-z0-9_]+$/.test(name)) {
    errors.push('Template name must contain only lowercase letters, numbers, and underscores.');
  }

  if (name.length < 1 || name.length > 512) {
    errors.push('Template name must be between 1 and 512 characters.');
  }
};

const validateLanguage = (language, errors, forUpdate) => {
  if (!language) {
    if (!forUpdate) {
      errors.push('Template language is required.');
    }
    return;
  }

  if (typeof language !== 'string' || language.length > 32) {
    errors.push('Template language must be a valid locale string up to 32 characters.');
  }
};

const validateCategory = (category, errors, forUpdate) => {
  if (!category) {
    if (!forUpdate) {
      errors.push('Template category is required.');
    }
    return;
  }

  if (!ALLOWED_CATEGORIES.has(category)) {
    errors.push(
      `Invalid template category: ${category}. Allowed values: ${Array.from(ALLOWED_CATEGORIES).join(', ')}.`
    );
  }
};

const validateHeaderComponent = (component, label, errors, options = {}) => {
  const inCarouselCard = options.inCarouselCard === true;

  if (!component.format) {
    errors.push(`${label}: HEADER.format is required.`);
    return;
  }

  if (!ALLOWED_HEADER_FORMATS.has(component.format)) {
    errors.push(`${label}: unsupported HEADER.format '${component.format}'.`);
  }

  if (inCarouselCard && !CAROUSEL_CARD_HEADER_FORMATS.has(component.format)) {
    errors.push(`${label}: carousel card HEADER.format must be IMAGE or VIDEO.`);
  }

  if (component.format === 'TEXT') {
    if (!component.text) {
      errors.push(`${label}: HEADER.text is required for TEXT format.`);
      return;
    }

    if (component.text.length > 60) {
      errors.push(`${label}: HEADER.text cannot exceed 60 characters.`);
    }

    if (hasTemplateVariables(component.text)) {
      const hasHeaderExample =
        Array.isArray(component.example?.header_text) &&
        component.example.header_text.length > 0;

      if (!hasHeaderExample) {
        errors.push(
          `${label}: HEADER.text contains template variables but HEADER example.header_text is missing.`
        );
      }
    }

    return;
  }

  if (component.text) {
    errors.push(`${label}: HEADER.text is only supported when HEADER.format is TEXT.`);
  }

  if (MEDIA_HEADER_FORMATS_REQUIRING_HANDLE_EXAMPLE.has(component.format)) {
    const headerHandleExample = component.example?.header_handle;
    const hasHeaderHandleExample =
      Array.isArray(headerHandleExample) && headerHandleExample.length > 0;

    if (!hasHeaderHandleExample) {
      errors.push(
        `${label}: HEADER.format ${component.format} requires example.header_handle with at least one media handle.`
      );
      return;
    }

    const hasOnlyStrings = headerHandleExample.every(
      (value) => typeof value === 'string' && value.trim().length > 0
    );

    if (!hasOnlyStrings) {
      errors.push(`${label}: example.header_handle must contain non-empty string values.`);
    }
  }
};

const validateBodyComponent = (component, label, errors, category) => {
  const hasText = typeof component.text === 'string' && component.text.trim().length > 0;

  if (!hasText && category !== 'AUTHENTICATION' && !component.add_security_recommendation) {
    errors.push(`${label}: BODY.text is required.`);
    return;
  }

  if (hasText && component.text.length > 1024) {
    errors.push(`${label}: BODY.text cannot exceed 1024 characters.`);
  }

  if (hasText && hasTemplateVariables(component.text)) {
    const hasPositionalExample =
      Array.isArray(component.example?.body_text) &&
      component.example.body_text.length > 0;
    const hasNamedExample =
      Array.isArray(component.example?.body_text_named_params) &&
      component.example.body_text_named_params.length > 0;

    if (!hasPositionalExample && !hasNamedExample) {
      errors.push(
        `${label}: BODY.text contains template variables but BODY example is missing.`
      );
    }
  }
};

const validateFooterComponent = (component, label, errors, category) => {
  if (category === 'AUTHENTICATION') {
    return;
  }

  if (!component.text) {
    errors.push(`${label}: FOOTER.text is required.`);
    return;
  }

  if (component.text.length > 60) {
    errors.push(`${label}: FOOTER.text cannot exceed 60 characters.`);
  }
};

const validateButtonsComponent = (component, label, errors) => {
  if (!Array.isArray(component.buttons) || component.buttons.length === 0) {
    errors.push(`${label}: BUTTONS.buttons must be a non-empty array.`);
    return;
  }

  const quickReplyCount = component.buttons.filter((button) => button?.type === 'QUICK_REPLY').length;
  const nonQuickReplyCount = component.buttons.length - quickReplyCount;

  if (quickReplyCount > 0 && nonQuickReplyCount > 0) {
    errors.push(
      `${label}: QUICK_REPLY buttons cannot be mixed with URL/PHONE_NUMBER/FLOW/other button types.`
    );
  }

  if (quickReplyCount > 10) {
    errors.push(`${label}: QUICK_REPLY buttons cannot exceed 10.`);
  }

  if (nonQuickReplyCount > 2) {
    errors.push(`${label}: Non-QUICK_REPLY buttons cannot exceed 2.`);
  }

  component.buttons.forEach((button, buttonIndex) => {
    if (!button?.type) {
      errors.push(`${label}, button ${buttonIndex}: type is required.`);
      return;
    }

    if (!KNOWN_BUTTON_TYPES.has(button.type)) {
      errors.push(`${label}, button ${buttonIndex}: unknown type '${button.type}'.`);
    }

    if (button.type === 'URL' && !button.url) {
      errors.push(`${label}, button ${buttonIndex}: URL button requires url.`);
    }

    if (button.type === 'URL' && hasTemplateVariables(button.url || '')) {
      const hasUrlExample =
        Array.isArray(button.example) && button.example.length > 0;

      if (!hasUrlExample) {
        errors.push(
          `${label}, button ${buttonIndex}: URL contains template variables but button example is missing.`
        );
      }
    }

    if (button.type === 'PHONE_NUMBER' && !button.phone_number) {
      errors.push(
        `${label}, button ${buttonIndex}: PHONE_NUMBER button requires phone_number.`
      );
    }

    if (button.type === 'FLOW' && !button.flow_id && !button.flow_name) {
      errors.push(
        `${label}, button ${buttonIndex}: FLOW button requires flow_id or flow_name.`
      );
    }
  });
};

const validateCarouselComponent = (component, label, errors, category) => {
  if (!Array.isArray(component.cards) || component.cards.length === 0) {
    errors.push(`${label}: CAROUSEL.cards must be a non-empty array.`);
    return;
  }

  if (component.cards.length > 10) {
    errors.push(`${label}: CAROUSEL.cards cannot exceed 10 cards.`);
  }

  component.cards.forEach((card, cardIndex) => {
    if (!Array.isArray(card.components) || card.components.length === 0) {
      errors.push(`${label}, card ${cardIndex}: card.components must be a non-empty array.`);
      return;
    }

    validateComponents(
      card.components,
      errors,
      category,
      `${label}, card ${cardIndex} component`,
      { inCarouselCard: true }
    );
  });
};

const validateSingleComponent = (
  component,
  errors,
  category,
  prefix = 'Component',
  index = 0,
  options = {}
) => {
  const label = `${prefix} ${index}`;

  if (!component || typeof component !== 'object') {
    errors.push(`${label}: component must be an object.`);
    return;
  }

  if (!component.type) {
    errors.push(`${label}: type is required.`);
    return;
  }

  if (!KNOWN_COMPONENT_TYPES.has(component.type)) {
    return;
  }

  if (component.type === 'HEADER') {
    validateHeaderComponent(component, label, errors, options);
    return;
  }

  if (component.type === 'BODY') {
    validateBodyComponent(component, label, errors, category);
    return;
  }

  if (component.type === 'FOOTER') {
    validateFooterComponent(component, label, errors, category);
    return;
  }

  if (component.type === 'BUTTONS') {
    validateButtonsComponent(component, label, errors);
    return;
  }

  if (component.type === 'CAROUSEL') {
    validateCarouselComponent(component, label, errors, category);
  }
};

const validateComponents = (components, errors, category, prefix = 'Component', options = {}) => {
  if (!Array.isArray(components) || components.length === 0) {
    errors.push('Template components must be a non-empty array.');
    return;
  }

  components.forEach((component, index) => {
    validateSingleComponent(component, errors, category, prefix, index, options);
  });
};

const countComponentsByType = (components = [], type) => {
  if (!Array.isArray(components)) {
    return 0;
  }

  return components.filter((component) => component?.type === type).length;
};

const validateRootComponentRequirements = (payload, errors, forUpdate) => {
  if (forUpdate) {
    return;
  }

  const rootComponents = Array.isArray(payload.components) ? payload.components : [];
  const rootBodyCount = countComponentsByType(rootComponents, 'BODY');
  const rootCarouselCount = countComponentsByType(rootComponents, 'CAROUSEL');

  if (rootBodyCount === 0) {
    errors.push('Top-level BODY component is required.');
  }

  if (rootBodyCount > 1) {
    errors.push('Only one top-level BODY component is allowed.');
  }

  if (rootCarouselCount > 1) {
    errors.push('Only one top-level CAROUSEL component is allowed.');
  }

  if (rootCarouselCount === 1) {
    const carouselComponent = rootComponents.find(
      (component) => component?.type === 'CAROUSEL'
    );
    const cards = Array.isArray(carouselComponent?.cards) ? carouselComponent.cards : [];

    cards.forEach((card, cardIndex) => {
      const cardComponents = Array.isArray(card?.components) ? card.components : [];
      const cardHeaderCount = countComponentsByType(cardComponents, 'HEADER');
      const cardBodyCount = countComponentsByType(cardComponents, 'BODY');
      const cardButtonsCount = countComponentsByType(cardComponents, 'BUTTONS');

      if (cardHeaderCount === 0) {
        errors.push(
          `CAROUSEL card ${cardIndex}: HEADER component is required and must use IMAGE or VIDEO format.`
        );
      }

      if (cardHeaderCount > 1) {
        errors.push(`CAROUSEL card ${cardIndex}: only one HEADER component is allowed.`);
      }

      if (cardBodyCount === 0) {
        errors.push(
          `CAROUSEL card ${cardIndex}: BODY component is required.`
        );
      }

      if (cardBodyCount > 1) {
        errors.push(`CAROUSEL card ${cardIndex}: only one BODY component is allowed.`);
      }

      if (cardButtonsCount > 1) {
        errors.push(`CAROUSEL card ${cardIndex}: only one BUTTONS component is allowed.`);
      }
    });
  }
};

export const validateTemplatePayload = (payload, options = {}) => {
  const errors = [];
  const forUpdate = options.forUpdate === true;

  validateName(payload.name, errors, forUpdate);
  validateLanguage(payload.language, errors, forUpdate);
  validateCategory(payload.category, errors, forUpdate);

  if (!forUpdate || payload.components) {
    validateComponents(payload.components, errors, payload.category);
  }

  validateRootComponentRequirements(payload, errors, forUpdate);

  return errors;
};

export const validateAndNormalizeTemplatePayload = (rawPayload, options = {}) => {
  const normalizedPayload = normalizeTemplatePayload(rawPayload, options);
  const errors = validateTemplatePayload(normalizedPayload, options);
  const templateType = deriveTemplateType({
    category: normalizedPayload.category,
    components: normalizedPayload.components || [],
  });

  return {
    isValid: errors.length === 0,
    errors,
    normalizedPayload,
    templateType,
  };
};

export class TemplateValidator {
  static sanitizeTemplateName(name) {
    return sanitizeTemplateName(name);
  }

  static normalizeTemplatePayload(payload, options = {}) {
    return normalizeTemplatePayload(payload, options);
  }

  static validateTemplatePayload(payload, options = {}) {
    const errors = validateTemplatePayload(payload, options);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateAndNormalizeTemplatePayload(payload, options = {}) {
    return validateAndNormalizeTemplatePayload(payload, options);
  }
}

export default TemplateValidator;
