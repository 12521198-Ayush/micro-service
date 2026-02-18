import FlowTemplateService from '../services/flowTemplateService.js';

const getUserId = (req) => {
  return req.user?.id || req.user?.userId || null;
};

export const createFlow = async (req, res) => {
  const data = await FlowTemplateService.createFlow({
    tenant: req.tenant,
    userId: getUserId(req),
    payload: req.body,
  });

  res.status(201).json({
    success: true,
    data,
  });
};

export const listFlows = async (req, res) => {
  const result = await FlowTemplateService.listFlows({
    tenant: req.tenant,
    rawFilters: req.query,
  });

  res.status(200).json({
    success: true,
    count: result.data.length,
    pagination: result.pagination,
    data: result.data,
  });
};

export const getFlowById = async (req, res) => {
  const versionNumber = req.query.version
    ? Number.parseInt(req.query.version, 10)
    : null;

  const data = await FlowTemplateService.getFlowById({
    tenant: req.tenant,
    flowId: req.params.id,
    versionNumber: Number.isFinite(versionNumber) ? versionNumber : null,
  });

  res.status(200).json({
    success: true,
    data,
  });
};

export const updateFlow = async (req, res) => {
  const data = await FlowTemplateService.updateFlow({
    tenant: req.tenant,
    userId: getUserId(req),
    flowId: req.params.id,
    payload: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Flow updated successfully',
    data,
  });
};

export const deleteFlow = async (req, res) => {
  const data = await FlowTemplateService.deleteFlow({
    tenant: req.tenant,
    userId: getUserId(req),
    flowId: req.params.id,
  });

  res.status(200).json({
    success: true,
    message:
      data.action === 'DEPRECATED'
        ? 'Flow deprecated successfully'
        : 'Flow deleted successfully',
    data,
  });
};

export const publishFlow = async (req, res) => {
  const data = await FlowTemplateService.publishFlow({
    tenant: req.tenant,
    userId: getUserId(req),
    flowId: req.params.id,
    payload: req.body || {},
  });

  res.status(200).json({
    success: true,
    message: 'Flow published successfully',
    data,
  });
};

export const retireFlow = async (req, res) => {
  const data = await FlowTemplateService.retireFlow({
    tenant: req.tenant,
    userId: getUserId(req),
    flowId: req.params.id,
  });

  res.status(200).json({
    success: true,
    message:
      data.action === 'DEPRECATED'
        ? 'Flow deprecated successfully'
        : 'Flow deleted successfully',
    data,
  });
};

export const syncFlowStatus = async (req, res) => {
  const data = await FlowTemplateService.syncFlowStatus({
    tenant: req.tenant,
    userId: getUserId(req),
    flowId: req.params.id,
  });

  res.status(200).json({
    success: true,
    message: data.statusChanged
      ? 'Flow status synced successfully'
      : 'Flow status already up to date',
    data,
  });
};

export const syncTenantFlowStatuses = async (req, res) => {
  const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 100;
  const offset = req.query.offset ? Number.parseInt(req.query.offset, 10) : 0;
  const reconcileRaw = String(req.query.reconcile || '').trim().toLowerCase();
  const reconcile = ['1', 'true', 'yes', 'on'].includes(reconcileRaw);

  const data = await FlowTemplateService.syncTenantFlowStatuses({
    tenant: req.tenant,
    userId: getUserId(req),
    limit: Number.isFinite(limit) ? limit : 100,
    offset: Number.isFinite(offset) ? offset : 0,
    reconcile,
  });

  res.status(200).json({
    success: true,
    message: 'Flow statuses synced successfully',
    data,
  });
};

export const cloneFlow = async (req, res) => {
  const data = await FlowTemplateService.cloneFlow({
    tenant: req.tenant,
    userId: getUserId(req),
    flowId: req.params.id,
    payload: req.body || {},
  });

  res.status(201).json({
    success: true,
    message: 'Flow cloned successfully',
    data,
  });
};

export default {
  createFlow,
  listFlows,
  getFlowById,
  updateFlow,
  deleteFlow,
  publishFlow,
  retireFlow,
  syncFlowStatus,
  syncTenantFlowStatuses,
  cloneFlow,
};
