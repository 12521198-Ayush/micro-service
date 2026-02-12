import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAndNormalizeTemplatePayload,
  normalizeTemplatePayload,
} from '../src/utils/templateValidator.js';

test('valid standard template payload passes validation', () => {
  const payload = {
    name: 'welcome_offer',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, welcome to our store!',
        example: {
          body_text: [['Rahul']],
        },
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: 'View',
          },
        ],
      },
    ],
  };

  const result = validateAndNormalizeTemplatePayload(payload);

  assert.equal(result.isValid, true);
  assert.equal(result.templateType, 'STANDARD');
  assert.equal(result.normalizedPayload.name, 'welcome_offer');
});

test('carousel template is detected and validated', () => {
  const payload = {
    name: 'new_arrivals_carousel',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Check our new arrivals',
      },
      {
        type: 'CAROUSEL',
        cards: [
          {
            components: [
              {
                type: 'HEADER',
                format: 'IMAGE',
                example: {
                  header_handle: ['4::aW1hZ2UvanBlZw==:ARa...'],
                },
              },
              {
                type: 'BODY',
                text: 'Great product',
              },
            ],
          },
        ],
      },
    ],
  };

  const result = validateAndNormalizeTemplatePayload(payload);

  assert.equal(result.isValid, true);
  assert.equal(result.templateType, 'CAROUSEL');
});

test('carousel card text header format is rejected', () => {
  const payload = {
    name: 'carousel_with_text_header',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Top body',
      },
      {
        type: 'CAROUSEL',
        cards: [
          {
            components: [
              {
                type: 'HEADER',
                format: 'TEXT',
                text: 'Item 1',
              },
              {
                type: 'BODY',
                text: 'Card body',
              },
            ],
          },
        ],
      },
    ],
  };

  const result = validateAndNormalizeTemplatePayload(payload);

  assert.equal(result.isValid, false);
  assert.equal(
    result.errors.some((error) => error.includes('carousel card HEADER.format must be IMAGE or VIDEO')),
    true
  );
});

test('carousel media header without handle example is rejected', () => {
  const payload = {
    name: 'carousel_missing_header_handle',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Top body',
      },
      {
        type: 'CAROUSEL',
        cards: [
          {
            components: [
              {
                type: 'HEADER',
                format: 'IMAGE',
              },
              {
                type: 'BODY',
                text: 'Card body',
              },
            ],
          },
        ],
      },
    ],
  };

  const result = validateAndNormalizeTemplatePayload(payload);

  assert.equal(result.isValid, false);
  assert.equal(
    result.errors.some((error) => error.includes('requires example.header_handle')),
    true
  );
});

test('flow template is detected by flow button type', () => {
  const payload = {
    name: 'lead_capture_flow',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Please continue in flow',
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'FLOW',
            text: 'Start',
            flow_id: '123456',
          },
        ],
      },
    ],
  };

  const result = validateAndNormalizeTemplatePayload(payload);

  assert.equal(result.isValid, true);
  assert.equal(result.templateType, 'FLOW');
});

test('invalid url button is rejected', () => {
  const payload = {
    name: 'broken_url_template',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Missing url',
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Open',
          },
        ],
      },
    ],
  };

  const result = validateAndNormalizeTemplatePayload(payload);

  assert.equal(result.isValid, false);
  assert.equal(
    result.errors.some((error) => error.includes('URL button requires url')),
    true
  );
});

test('mixing quick reply and url buttons is rejected', () => {
  const payload = {
    name: 'mixed_buttons_template',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Mixed button types',
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Reply' },
          { type: 'URL', text: 'Open', url: 'https://example.com' },
        ],
      },
    ],
  };

  const result = validateAndNormalizeTemplatePayload(payload);

  assert.equal(result.isValid, false);
  assert.equal(
    result.errors.some((error) => error.includes('cannot be mixed')),
    true
  );
});

test('body variables without example are rejected', () => {
  const payload = {
    name: 'body_variable_no_example',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}',
      },
    ],
  };

  const result = validateAndNormalizeTemplatePayload(payload);

  assert.equal(result.isValid, false);
  assert.equal(
    result.errors.some((error) => error.includes('BODY.text contains template variables')),
    true
  );
});

test('carousel without top-level body is rejected', () => {
  const payload = {
    name: 'carousel_without_root_body',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'CAROUSEL',
        cards: [
          {
            components: [
              {
                type: 'BODY',
                text: 'Card body',
              },
            ],
          },
        ],
      },
    ],
  };

  const result = validateAndNormalizeTemplatePayload(payload);

  assert.equal(result.isValid, false);
  assert.equal(
    result.errors.some((error) => error.includes('Top-level BODY component is required')),
    true
  );
});

test('carousel card without body is rejected', () => {
  const payload = {
    name: 'carousel_card_without_body',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Main body',
      },
      {
        type: 'CAROUSEL',
        cards: [
          {
            components: [
              {
                type: 'HEADER',
                format: 'IMAGE',
                example: {
                  header_handle: ['4::aW1hZ2UvanBlZw==:ARa...'],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  const result = validateAndNormalizeTemplatePayload(payload);

  assert.equal(result.isValid, false);
  assert.equal(
    result.errors.some((error) => error.includes('CAROUSEL card 0: BODY component is required')),
    true
  );
});

test('legacy payload shape is normalized into components', () => {
  const legacyPayload = {
    name: 'legacy_template',
    category: 'MARKETING',
    language: 'en_US',
    header: {
      format: 'TEXT',
      text: 'Header',
    },
    body: {
      text: 'Body text',
    },
    buttons: [
      {
        type: 'QUICK_REPLY',
        text: 'Reply',
      },
    ],
  };

  const normalized = normalizeTemplatePayload(legacyPayload);

  assert.equal(Array.isArray(normalized.components), true);
  assert.equal(normalized.components.length, 3);
});
