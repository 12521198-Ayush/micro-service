import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAndNormalizeFlowPayload,
} from '../src/flows/validators/flowTemplateValidator.js';

const basePayload = {
  name: 'Lead capture',
  template_key: 'lead_capture',
  flow_id: '123456789012345',
  category: 'LEAD_GENERATION',
  screens: [
    {
      key: 'start',
      title: 'Start',
      is_entry_point: true,
      components: [
        {
          key: 'name',
          type: 'input',
          label: 'Name',
          variable_key: 'name',
          required: true,
        },
      ],
      actions: [
        {
          key: 'to_confirm',
          type: 'next_screen',
          target_screen_key: 'confirm',
        },
      ],
    },
    {
      key: 'confirm',
      title: 'Confirm',
      components: [
        {
          key: 'summary',
          type: 'summary',
          label: 'Review',
        },
      ],
      actions: [
        {
          key: 'submit',
          type: 'submit',
        },
      ],
    },
  ],
};

test('flow payload passes with valid screens/components/actions', () => {
  const result = validateAndNormalizeFlowPayload(basePayload, {
    allowedComponentTypes: ['input', 'summary'],
    allowedActionTypes: ['next_screen', 'submit'],
  });

  assert.equal(result.isValid, true);
  assert.equal(result.normalizedPayload.screens.length, 2);
});

test('flow payload fails when navigation target does not exist', () => {
  const payload = {
    ...basePayload,
    screens: [
      {
        ...basePayload.screens[0],
        actions: [
          {
            key: 'broken',
            type: 'next_screen',
            target_screen_key: 'missing_screen',
          },
        ],
      },
      basePayload.screens[1],
    ],
  };

  const result = validateAndNormalizeFlowPayload(payload, {
    allowedComponentTypes: ['input', 'summary'],
    allowedActionTypes: ['next_screen', 'submit'],
  });

  assert.equal(result.isValid, false);
  assert.equal(
    result.errors.some((error) => error.includes('missing target_screen_key')),
    true
  );
});

test('flow payload fails when submit action is missing', () => {
  const payload = {
    ...basePayload,
    screens: basePayload.screens.map((screen) => ({
      ...screen,
      actions: screen.actions.filter((action) => action.type !== 'submit'),
    })),
  };

  const result = validateAndNormalizeFlowPayload(payload, {
    allowedComponentTypes: ['input', 'summary'],
    allowedActionTypes: ['next_screen', 'submit'],
  });

  assert.equal(result.isValid, false);
  assert.equal(
    result.errors.some((error) => error.includes('At least one submit action')),
    true
  );
});

test('flow payload supports newly added component type via DB-driven definitions', () => {
  const payload = {
    ...basePayload,
    screens: [
      {
        ...basePayload.screens[0],
        components: [
          {
            key: 'budget',
            type: 'currency',
            label: 'Budget',
            variable_key: 'budget',
          },
        ],
      },
      basePayload.screens[1],
    ],
  };

  const result = validateAndNormalizeFlowPayload(payload, {
    allowedComponentTypes: ['currency', 'summary'],
    allowedActionTypes: ['next_screen', 'submit'],
  });

  assert.equal(result.isValid, true);
});
