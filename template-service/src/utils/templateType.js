export const TEMPLATE_TYPES = Object.freeze([
  'STANDARD',
  'CAROUSEL',
  'FLOW',
  'AUTHENTICATION',
  'UNKNOWN',
]);

const FLOW_BUTTON_TYPES = new Set(['FLOW', 'FLOW_ACTION']);

export const hasFlowButton = (components = []) => {
  return components.some((component) => {
    if (component?.type !== 'BUTTONS' || !Array.isArray(component.buttons)) {
      return false;
    }

    return component.buttons.some((button) => FLOW_BUTTON_TYPES.has(button?.type));
  });
};

export const hasCarouselComponent = (components = []) => {
  return components.some((component) => component?.type === 'CAROUSEL');
};

export const deriveTemplateType = ({ category, components = [] }) => {
  if (category === 'AUTHENTICATION') {
    return 'AUTHENTICATION';
  }

  if (hasCarouselComponent(components)) {
    return 'CAROUSEL';
  }

  if (hasFlowButton(components)) {
    return 'FLOW';
  }

  return 'STANDARD';
};
