import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTemplateType, hasCarouselComponent, hasFlowButton } from '../src/utils/templateType.js';

test('deriveTemplateType returns AUTHENTICATION for authentication category', () => {
  const type = deriveTemplateType({
    category: 'AUTHENTICATION',
    components: [],
  });

  assert.equal(type, 'AUTHENTICATION');
});

test('deriveTemplateType returns CAROUSEL when carousel component exists', () => {
  const components = [{ type: 'CAROUSEL', cards: [] }];

  assert.equal(hasCarouselComponent(components), true);
  assert.equal(deriveTemplateType({ category: 'MARKETING', components }), 'CAROUSEL');
});

test('deriveTemplateType returns FLOW when flow button exists', () => {
  const components = [
    {
      type: 'BUTTONS',
      buttons: [{ type: 'FLOW', flow_id: 'abc' }],
    },
  ];

  assert.equal(hasFlowButton(components), true);
  assert.equal(deriveTemplateType({ category: 'UTILITY', components }), 'FLOW');
});
