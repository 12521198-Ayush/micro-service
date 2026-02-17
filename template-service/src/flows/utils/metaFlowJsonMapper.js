const normalizeScreenId = (value, fallback) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);

  if (normalized) {
    return normalized;
  }

  return fallback;
};

const toDataSource = (options = []) => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option, index) => {
      const value = option?.value ?? option?.id ?? `option_${index + 1}`;
      const label = option?.label ?? option?.title ?? String(value);

      return {
        id: String(value),
        title: String(label),
      };
    })
    .filter((option) => option.id && option.title);
};

const toMetaInputComponent = (component) => {
  const type = String(component.componentType || '').toLowerCase();
  const variableName =
    component.variableKey ||
    component.componentKey ||
    `field_${component.orderIndex || 0}`;

  if (type === 'textarea') {
    return {
      type: 'TextArea',
      name: variableName,
      label: component.label || variableName,
      required: Boolean(component.required),
    };
  }

  if (type === 'select') {
    return {
      type: 'Dropdown',
      name: variableName,
      label: component.label || variableName,
      required: Boolean(component.required),
      'data-source': toDataSource(component.options),
    };
  }

  if (type === 'radio') {
    return {
      type: 'RadioButtonsGroup',
      name: variableName,
      label: component.label || variableName,
      required: Boolean(component.required),
      'data-source': toDataSource(component.options),
    };
  }

  if (type === 'checkbox') {
    return {
      type: 'CheckboxGroup',
      name: variableName,
      label: component.label || variableName,
      required: Boolean(component.required),
      'data-source': toDataSource(component.options),
    };
  }

  const inputTypeByComponent = {
    email: 'email',
    phone: 'phone',
    number: 'number',
    date: 'text',
    time: 'text',
    datetime: 'text',
  };

  return {
    type: 'TextInput',
    name: variableName,
    label: component.label || variableName,
    required: Boolean(component.required),
    'input-type': inputTypeByComponent[type] || 'text',
  };
};

const toFooterAction = ({ action, isTerminalScreen, targetScreenId }) => {
  if (action?.actionType === 'next_screen' && targetScreenId) {
    return {
      name: 'navigate',
      next: {
        type: 'screen',
        name: targetScreenId,
      },
      payload: {},
    };
  }

  if (action?.actionType === 'submit' || isTerminalScreen) {
    return {
      name: 'complete',
      payload: {},
    };
  }

  return {
    name: 'complete',
    payload: {},
  };
};

export const mapInternalFlowToMetaFlowJson = ({ template, versionGraph }) => {
  const screens = Array.isArray(versionGraph?.screens) ? versionGraph.screens : [];

  if (screens.length === 0) {
    return {
      version: '7.3',
      screens: [],
    };
  }

  const sortedScreens = [...screens].sort((a, b) => a.orderIndex - b.orderIndex);
  const screenIdByKey = {};

  sortedScreens.forEach((screen, index) => {
    const fallbackId = `SCREEN_${index + 1}`;
    screenIdByKey[screen.screenKey] = normalizeScreenId(screen.screenKey, fallbackId);
  });

  const routingModel = {};

  const mappedScreens = sortedScreens.map((screen, index) => {
    const metaScreenId = screenIdByKey[screen.screenKey];
    const screenComponents = Array.isArray(screen.components)
      ? [...screen.components].sort((a, b) => a.orderIndex - b.orderIndex)
      : [];
    const screenActions = Array.isArray(screen.actions)
      ? [...screen.actions].sort((a, b) => a.orderIndex - b.orderIndex)
      : [];

    const nextAction = screenActions.find((item) => item.actionType === 'next_screen');
    const submitAction = screenActions.find((item) => item.actionType === 'submit');
    const targetScreenId = nextAction?.targetScreenKey
      ? screenIdByKey[nextAction.targetScreenKey] || null
      : null;
    const isTerminalScreen = Boolean(submitAction) || !targetScreenId;

    routingModel[metaScreenId] = targetScreenId ? [targetScreenId] : [];

    const children = [
      {
        type: 'TextHeading',
        text: screen.title || `${template?.name || 'Flow'} - ${index + 1}`,
      },
    ];

    if (screen.description) {
      children.push({
        type: 'TextBody',
        text: screen.description,
      });
    }

    const formChildren = screenComponents.map((component) => {
      if (String(component.componentType || '').toLowerCase() === 'summary') {
        return {
          type: 'TextBody',
          text: component.label || 'Review your details',
        };
      }

      return toMetaInputComponent(component);
    });

    formChildren.push({
      type: 'Footer',
      label:
        submitAction?.label ||
        nextAction?.label ||
        (isTerminalScreen ? 'Submit' : 'Continue'),
      'on-click-action': toFooterAction({
        action: submitAction || nextAction || null,
        isTerminalScreen,
        targetScreenId,
      }),
    });

    children.push({
      type: 'Form',
      name: `form_${String(screen.screenKey || index + 1)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')}`,
      children: formChildren,
    });

    return {
      id: metaScreenId,
      title: screen.title || metaScreenId,
      terminal: isTerminalScreen,
      ...(isTerminalScreen ? { success: true } : {}),
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children,
      },
    };
  });

  return {
    version: '7.3',
    routing_model: routingModel,
    screens: mappedScreens,
  };
};

export default {
  mapInternalFlowToMetaFlowJson,
};
