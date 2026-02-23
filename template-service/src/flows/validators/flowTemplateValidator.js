import {
  DEFAULT_FLOW_LIST_LIMIT,
  FLOW_ACTION_TYPES,
  FLOW_CATEGORIES,
  FLOW_TEMPLATE_STATUSES,
  MAX_FLOW_LIST_LIMIT,
} from '../constants/flowEnums.js';
import { isPlainObject, normalizeKey, slugify, toNullableString, unique } from '../utils/flowHelpers.js';

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};

const normalizeSortOrder = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const normalizeOptions = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  return value.map((option) => {
    if (typeof option === 'string' || typeof option === 'number') {
      const asString = String(option);
      return {
        label: asString,
        value: asString,
      };
    }

    if (isPlainObject(option)) {
      const normalizedLabel = toNullableString(option.label, 255);
      const normalizedValue = option.value ?? normalizedLabel;

      return {
        label: normalizedLabel || String(normalizedValue),
        value: normalizedValue,
      };
    }

    return null;
  }).filter(Boolean);
};

const normalizeValidationRules = (value) => {
  if (!isPlainObject(value)) {
    return null;
  }

  return value;
};

const normalizeApiConfig = (value) => {
  if (!isPlainObject(value)) {
    return null;
  }

  const method = toNullableString(value.method, 16) || 'POST';

  return {
    method: method.toUpperCase(),
    url: toNullableString(value.url, 1000),
    timeoutMs:
      Number.isFinite(Number.parseInt(value.timeoutMs, 10))
        ? Number.parseInt(value.timeoutMs, 10)
        : 10000,
    headers: isPlainObject(value.headers) ? value.headers : {},
    bodyTemplate: value.bodyTemplate && isPlainObject(value.bodyTemplate)
      ? value.bodyTemplate
      : null,
  };
};

const normalizeFlowScreen = (screen, index) => {
  const normalizedComponents = Array.isArray(screen.components)
    ? screen.components.map((component, componentIndex) => ({
        key:
          normalizeKey(component.key || component.component_key || `component_${componentIndex + 1}`) ||
          `component_${componentIndex + 1}`,
        type: toNullableString(component.type || component.component_type, 64)?.toLowerCase(),
        label: toNullableString(component.label, 255),
        variableKey: normalizeKey(component.variableKey || component.variable_key || ''),
        required: normalizeBoolean(component.required, false),
        placeholder: toNullableString(component.placeholder, 255),
        options: normalizeOptions(component.options),
        validationRules: normalizeValidationRules(component.validation || component.validation_rules),
        defaultValue: component.defaultValue ?? component.default_value ?? null,
        config: isPlainObject(component.config) ? component.config : null,
        order: normalizeSortOrder(component.order, componentIndex),
      }))
    : [];

  const normalizedActions = Array.isArray(screen.actions)
    ? screen.actions.map((action, actionIndex) => ({
        key:
          normalizeKey(action.key || action.action_key || `action_${actionIndex + 1}`) ||
          `action_${actionIndex + 1}`,
        type: toNullableString(action.type || action.action_type, 64)?.toLowerCase(),
        label: toNullableString(action.label, 255),
        triggerComponentKey: normalizeKey(
          action.triggerComponentKey || action.trigger_component_key || ''
        ) || null,
        targetScreenKey: normalizeKey(action.targetScreenKey || action.target_screen_key || '') || null,
        apiConfig: normalizeApiConfig(action.apiConfig || action.api_config),
        payloadMapping: isPlainObject(action.payloadMapping || action.payload_mapping)
          ? action.payloadMapping || action.payload_mapping
          : null,
        condition: isPlainObject(action.condition) ? action.condition : null,
        order: normalizeSortOrder(action.order, actionIndex),
      }))
    : [];

  return {
    key: normalizeKey(screen.key || screen.screen_key || `screen_${index + 1}`) || `screen_${index + 1}`,
    title: toNullableString(screen.title, 255),
    description: toNullableString(screen.description, 1000),
    order: normalizeSortOrder(screen.order, index),
    isEntryPoint: normalizeBoolean(screen.isEntryPoint || screen.is_entry_point, index === 0),
    settings: isPlainObject(screen.settings) ? screen.settings : null,
    components: normalizedComponents,
    actions: normalizedActions,
  };
};

const validateComponent = ({
  component,
  componentIndex,
  screen,
  allowedComponentTypes,
  errors,
  variableKeys,
  componentKeys,
}) => {
  if (!component.key) {
    errors.push(`screens[${screen.order}].components[${componentIndex}].key is required`);
  }

  if (componentKeys.has(component.key)) {
    errors.push(`Duplicate component key '${component.key}' in screen '${screen.key}'`);
  }

  componentKeys.add(component.key);

  if (!component.type) {
    errors.push(`screens[${screen.order}].components[${componentIndex}].type is required`);
  } else if (!allowedComponentTypes.has(component.type)) {
    errors.push(`Unsupported component type '${component.type}' in screen '${screen.key}'`);
  }

  if (!component.label) {
    errors.push(`screens[${screen.order}].components[${componentIndex}].label is required`);
  }

  if (component.variableKey) {
    if (variableKeys.has(component.variableKey)) {
      errors.push(`Duplicate variable_key '${component.variableKey}' across flow template`);
    }

    variableKeys.add(component.variableKey);
  }

  if (
    ['select', 'radio', 'checkbox'].includes(component.type) &&
    (!Array.isArray(component.options) || component.options.length === 0)
  ) {
    errors.push(
      `Component '${component.key}' of type '${component.type}' must include non-empty options`
    );
  }
};

const validateAction = ({
  action,
  actionIndex,
  screen,
  allowedActionTypes,
  errors,
  actionKeys,
  submitActions,
  navigationTargets,
}) => {
  if (!action.key) {
    errors.push(`screens[${screen.order}].actions[${actionIndex}].key is required`);
  }

  if (actionKeys.has(action.key)) {
    errors.push(`Duplicate action key '${action.key}' in screen '${screen.key}'`);
  }

  actionKeys.add(action.key);

  if (!action.type) {
    errors.push(`screens[${screen.order}].actions[${actionIndex}].type is required`);
    return;
  }

  if (!allowedActionTypes.has(action.type)) {
    errors.push(`Unsupported action type '${action.type}' in screen '${screen.key}'`);
    return;
  }

  if (action.type === 'submit') {
    submitActions.push(action);
  }

  if (action.type === 'next_screen' || action.type === 'previous_screen') {
    if (!action.targetScreenKey) {
      errors.push(`Action '${action.key}' must include target_screen_key`);
    } else {
      navigationTargets.push({
        sourceScreenKey: screen.key,
        actionKey: action.key,
        targetScreenKey: action.targetScreenKey,
      });
    }
  }

  if (action.type === 'external_api') {
    const method = action.apiConfig?.method;
    const url = action.apiConfig?.url;

    if (!url) {
      errors.push(`Action '${action.key}' with type 'external_api' requires api_config.url`);
    }

    if (method && !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      errors.push(`Action '${action.key}' has invalid external_api method '${method}'`);
    }
  }
};

export const validateAndNormalizeFlowPayload = (
  payload,
  {
    allowedComponentTypes = [],
    allowedActionTypes = FLOW_ACTION_TYPES,
    forUpdate = false,
  } = {}
) => {
  const errors = [];

  if (!isPlainObject(payload)) {
    return {
      isValid: false,
      errors: ['Request body must be a valid JSON object'],
      normalizedPayload: null,
    };
  }

  const normalized = {
    name: toNullableString(payload.name, 255),
    templateKey: normalizeKey(payload.templateKey || payload.template_key || slugify(payload.name || '')),
    flowId: toNullableString(
      payload.flowId || payload.flow_id || payload.metaFlowId || payload.meta_flow_id,
      64
    ),
    description: toNullableString(payload.description, 1000),
    category: toNullableString(payload.category, 64)?.toUpperCase(),
    screens: Array.isArray(payload.screens)
      ? payload.screens.map((screen, index) => normalizeFlowScreen(screen, index))
      : [],
    webhookMapping: isPlainObject(payload.webhookMapping || payload.webhook_mapping)
      ? payload.webhookMapping || payload.webhook_mapping
      : null,
    responseSchema: isPlainObject(payload.responseSchema || payload.response_schema)
      ? payload.responseSchema || payload.response_schema
      : null,
    metadata: isPlainObject(payload.metadata) ? payload.metadata : null,
  };

  if (!normalized.name) {
    errors.push('name is required');
  }

  if (!normalized.templateKey) {
    errors.push('template_key is required');
  }

  if (!normalized.category || !FLOW_CATEGORIES.includes(normalized.category)) {
    errors.push(`category must be one of: ${FLOW_CATEGORIES.join(', ')}`);
  }

  if (!Array.isArray(normalized.screens) || normalized.screens.length === 0) {
    errors.push('screens must be a non-empty array');
  }

  const allowedComponentTypeSet = new Set(
    unique(allowedComponentTypes.map((type) => String(type).toLowerCase()))
  );
  const allowedActionTypeSet = new Set(
    unique(allowedActionTypes.map((type) => String(type).toLowerCase()))
  );

  const screenKeys = new Set();
  const variableKeys = new Set();
  const submitActions = [];
  const navigationTargets = [];
  let entryPointCount = 0;

  normalized.screens.forEach((screen, screenIndex) => {
    if (!screen.key) {
      errors.push(`screens[${screenIndex}].key is required`);
    }

    if (screenKeys.has(screen.key)) {
      errors.push(`Duplicate screen key '${screen.key}'`);
    }

    screenKeys.add(screen.key);

    if (!screen.title) {
      errors.push(`screens[${screenIndex}].title is required`);
    }

    if (screen.isEntryPoint) {
      entryPointCount += 1;
    }

    const componentKeys = new Set();
    screen.components.forEach((component, componentIndex) => {
      validateComponent({
        component,
        componentIndex,
        screen,
        allowedComponentTypes: allowedComponentTypeSet,
        errors,
        variableKeys,
        componentKeys,
      });
    });

    const actionKeys = new Set();
    screen.actions.forEach((action, actionIndex) => {
      validateAction({
        action,
        actionIndex,
        screen,
        allowedActionTypes: allowedActionTypeSet,
        errors,
        actionKeys,
        submitActions,
        navigationTargets,
      });
    });
  });

  if (entryPointCount === 0 && normalized.screens.length > 0) {
    normalized.screens[0].isEntryPoint = true;
    entryPointCount = 1;
  }

  if (entryPointCount > 1) {
    errors.push('Exactly one screen must be marked as is_entry_point');
  }

  navigationTargets.forEach((target) => {
    if (!screenKeys.has(target.targetScreenKey)) {
      errors.push(
        `Action '${target.actionKey}' references missing target_screen_key '${target.targetScreenKey}'`
      );
    }
  });

  if (submitActions.length === 0) {
    errors.push('At least one submit action is required in the flow');
  }

  if (!forUpdate && normalized.screens.length === 0) {
    errors.push('At least one screen is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedPayload: normalized,
  };
};

export const validatePublishPayload = (payload = {}) => {
  const version = payload.version !== undefined ? Number.parseInt(payload.version, 10) : null;
  const notes = toNullableString(payload.notes, 1000);

  if (version !== null && (!Number.isFinite(version) || version < 1)) {
    return {
      isValid: false,
      errors: ['version must be a positive integer'],
      normalizedPayload: null,
    };
  }

  return {
    isValid: true,
    errors: [],
    normalizedPayload: {
      version,
      notes,
    },
  };
};

export const validateClonePayload = (payload = {}) => {
  const name = toNullableString(payload.name, 255);
  const templateKey = normalizeKey(payload.templateKey || payload.template_key || slugify(name || '')) || null;

  return {
    isValid: true,
    errors: [],
    normalizedPayload: {
      name,
      templateKey,
    },
  };
};

export const normalizeFlowListFilters = (raw = {}) => {
  const parsedLimit = Number.parseInt(raw.limit, 10);
  const parsedOffset = Number.parseInt(raw.offset, 10);

  const status = raw.status ? String(raw.status).trim().toUpperCase() : null;
  if (status && !FLOW_TEMPLATE_STATUSES.includes(status)) {
    throw new Error(`Invalid status filter '${status}'`);
  }

  const category = raw.category ? String(raw.category).trim().toUpperCase() : null;
  if (category && !FLOW_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category filter '${category}'`);
  }

  return {
    status,
    category,
    search: raw.search ? String(raw.search).trim() : null,
    limit: Math.min(
      Math.max(Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_FLOW_LIST_LIMIT, 1),
      MAX_FLOW_LIST_LIMIT
    ),
    offset: Math.max(Number.isFinite(parsedOffset) ? parsedOffset : 0, 0),
  };
};

export default {
  validateAndNormalizeFlowPayload,
  validatePublishPayload,
  validateClonePayload,
  normalizeFlowListFilters,
};
