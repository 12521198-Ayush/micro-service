export const FLOW_CATEGORIES = Object.freeze([
  'LEAD_GENERATION',
  'LEAD_QUALIFICATION',
  'APPOINTMENT_BOOKING',
  'SLOT_BOOKING',
  'ORDER_PLACEMENT',
  'RE_ORDERING',
  'CUSTOMER_SUPPORT',
  'TICKET_CREATION',
  'PAYMENTS',
  'COLLECTIONS',
  'REGISTRATIONS',
  'APPLICATIONS',
  'DELIVERY_UPDATES',
  'ADDRESS_CAPTURE',
  'FEEDBACK',
  'SURVEYS',
]);

export const FLOW_TEMPLATE_STATUSES = Object.freeze([
  'DRAFT',
  'PUBLISHED',
  'DEPRECATED',
  'THROTTLED',
  'BLOCKED',
  'ARCHIVED',
]);

export const FLOW_VERSION_STATUSES = Object.freeze([
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
  'REJECTED',
]);

export const FLOW_ACTION_TYPES = Object.freeze([
  'next_screen',
  'previous_screen',
  'submit',
  'external_api',
]);

export const FLOW_COMPONENT_TYPES = Object.freeze([
  'text',
  'input',
  'textarea',
  'number',
  'phone',
  'email',
  'select',
  'radio',
  'checkbox',
  'date',
  'time',
  'datetime',
  'file',
  'summary',
]);

export const FLOW_SUBMISSION_STATUSES = Object.freeze([
  'RECEIVED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

export const DEFAULT_FLOW_LIST_LIMIT = 20;
export const MAX_FLOW_LIST_LIMIT = 100;
