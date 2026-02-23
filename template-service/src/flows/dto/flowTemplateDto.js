export const toFlowTemplateListItemDto = (template) => {
  return {
    id: template.uuid,
    flowId: template.metaFlowId,
    name: template.name,
    templateKey: template.templateKey,
    category: template.category,
    status: template.status,
    organizationId: template.organizationId,
    metaBusinessAccountId: template.metaBusinessAccountId,
    metaAppId: template.metaAppId,
    currentDraftVersion: template.currentDraftVersion,
    currentPublishedVersion: template.currentPublishedVersion,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
};

export const toFlowActionDto = (action) => {
  return {
    id: action.uuid,
    key: action.actionKey,
    type: action.actionType,
    label: action.label,
    triggerComponentKey: action.triggerComponentKey,
    targetScreenKey: action.targetScreenKey,
    apiConfig: action.apiConfig,
    payloadMapping: action.payloadMapping,
    condition: action.condition,
    order: action.orderIndex,
  };
};

export const toFlowComponentDto = (component) => {
  return {
    id: component.uuid,
    key: component.componentKey,
    type: component.componentType,
    label: component.label,
    variableKey: component.variableKey,
    required: component.required,
    placeholder: component.placeholder,
    options: component.options,
    validation: component.validationRules,
    defaultValue: component.defaultValue,
    config: component.config,
    order: component.orderIndex,
  };
};

export const toFlowScreenDto = (screen) => {
  return {
    id: screen.uuid,
    key: screen.screenKey,
    title: screen.title,
    description: screen.description,
    order: screen.orderIndex,
    isEntryPoint: screen.isEntryPoint,
    settings: screen.settings,
    components: Array.isArray(screen.components)
      ? screen.components.map(toFlowComponentDto)
      : [],
    actions: Array.isArray(screen.actions)
      ? screen.actions.map(toFlowActionDto)
      : [],
  };
};

export const toFlowVersionDto = (version) => {
  if (!version) {
    return null;
  }

  return {
    id: version.uuid,
    version: version.versionNumber,
    status: version.status,
    publishedAt: version.publishedAt,
    webhookMapping: version.webhookMapping,
    responseSchema: version.responseSchema,
    approvalNotes: version.approvalNotes,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
    screens: Array.isArray(version.screens)
      ? version.screens.map(toFlowScreenDto)
      : [],
  };
};

export const toFlowTemplateDetailDto = ({ template, version, versions = [] }) => {
  return {
    id: template.uuid,
    flowId: template.metaFlowId,
    name: template.name,
    templateKey: template.templateKey,
    description: template.description,
    category: template.category,
    status: template.status,
    organizationId: template.organizationId,
    metaBusinessAccountId: template.metaBusinessAccountId,
    metaAppId: template.metaAppId,
    currentDraftVersion: template.currentDraftVersion,
    currentPublishedVersion: template.currentPublishedVersion,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    activeVersion: toFlowVersionDto(version),
    versions: versions.map((item) => ({
      id: item.uuid,
      version: item.versionNumber,
      status: item.status,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
    })),
  };
};

export default {
  toFlowTemplateListItemDto,
  toFlowTemplateDetailDto,
  toFlowVersionDto,
};
