import { randomUUID } from 'node:crypto';
import { pool } from '../../config/database.js';
import { safeJsonParse } from '../../utils/object.js';

const toJson = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
};

const formatConfig = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    uuid: row.uuid,
    organizationId: row.organization_id,
    metaBusinessAccountId: row.meta_business_account_id,
    metaAppId: row.meta_app_id,
    targetUrl: row.target_url,
    authType: row.auth_type,
    authConfig: safeJsonParse(row.auth_config_json, null),
    signingSecret: row.signing_secret,
    timeoutMs: row.timeout_ms,
    maxRetries: row.max_retries,
    retryBackoffBaseSeconds: row.retry_backoff_base_seconds,
    eventTypes: safeJsonParse(row.event_types_json, []),
    isActive: Boolean(row.is_active),
    lastDeliveryStatus: row.last_delivery_status,
    lastDeliveryAt: row.last_delivery_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
};

class TenantWebhookConfigModel {
  static async listActiveTenantScopesByMetaBusinessAccountId(metaBusinessAccountId, limit = 5) {
    const normalizedMetaBusinessAccountId = String(metaBusinessAccountId || '').trim();

    if (!normalizedMetaBusinessAccountId) {
      return [];
    }

    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Math.min(
      Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 5, 1),
      20
    );

    const [rows] = await pool.query(
      `
      SELECT
        organization_id,
        meta_business_account_id,
        meta_app_id
      FROM tenant_webhook_configs
      WHERE meta_business_account_id = ?
        AND is_active = 1
        AND deleted_at IS NULL
      ORDER BY id DESC
      LIMIT ${safeLimit}
      `,
      [normalizedMetaBusinessAccountId]
    );

    return rows.map((row) => ({
      organizationId: row.organization_id,
      metaBusinessAccountId: row.meta_business_account_id,
      metaAppId: row.meta_app_id,
    }));
  }

  static async getByTenant(tenant) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM tenant_webhook_configs
      WHERE organization_id = ?
        AND meta_business_account_id = ?
        AND meta_app_id = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [
        tenant.organizationId,
        tenant.metaBusinessAccountId,
        tenant.metaAppId,
      ]
    );

    return formatConfig(rows[0]);
  }

  static async getActiveByTenant(tenant) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM tenant_webhook_configs
      WHERE organization_id = ?
        AND meta_business_account_id = ?
        AND meta_app_id = ?
        AND is_active = 1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [
        tenant.organizationId,
        tenant.metaBusinessAccountId,
        tenant.metaAppId,
      ]
    );

    return formatConfig(rows[0]);
  }

  static async upsertForTenant({
    tenant,
    userId,
    targetUrl,
    authType,
    authConfig,
    signingSecret,
    timeoutMs,
    maxRetries,
    retryBackoffBaseSeconds,
    eventTypes,
    isActive,
  }) {
    const existing = await this.getByTenant(tenant);

    if (!existing) {
      const uuid = randomUUID();

      await pool.execute(
        `
        INSERT INTO tenant_webhook_configs (
          uuid,
          organization_id,
          meta_business_account_id,
          meta_app_id,
          target_url,
          auth_type,
          auth_config_json,
          signing_secret,
          timeout_ms,
          max_retries,
          retry_backoff_base_seconds,
          event_types_json,
          is_active,
          created_by,
          updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          uuid,
          tenant.organizationId,
          tenant.metaBusinessAccountId,
          tenant.metaAppId,
          targetUrl,
          authType,
          toJson(authConfig),
          signingSecret,
          timeoutMs,
          maxRetries,
          retryBackoffBaseSeconds,
          toJson(eventTypes),
          isActive ? 1 : 0,
          userId || null,
          userId || null,
        ]
      );

      return this.getByTenant(tenant);
    }

    await pool.execute(
      `
      UPDATE tenant_webhook_configs
      SET target_url = ?,
          auth_type = ?,
          auth_config_json = ?,
          signing_secret = ?,
          timeout_ms = ?,
          max_retries = ?,
          retry_backoff_base_seconds = ?,
          event_types_json = ?,
          is_active = ?,
          updated_by = ?,
          deleted_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        targetUrl,
        authType,
        toJson(authConfig),
        signingSecret,
        timeoutMs,
        maxRetries,
        retryBackoffBaseSeconds,
        toJson(eventTypes),
        isActive ? 1 : 0,
        userId || null,
        existing.id,
      ]
    );

    return this.getByTenant(tenant);
  }

  static async disableForTenant({ tenant, userId }) {
    const [result] = await pool.execute(
      `
      UPDATE tenant_webhook_configs
      SET is_active = 0,
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = ?
        AND meta_business_account_id = ?
        AND meta_app_id = ?
        AND deleted_at IS NULL
      `,
      [
        userId || null,
        tenant.organizationId,
        tenant.metaBusinessAccountId,
        tenant.metaAppId,
      ]
    );

    return result.affectedRows > 0;
  }

  static async updateDeliverySummary(configId, summary = {}) {
    await pool.execute(
      `
      UPDATE tenant_webhook_configs
      SET last_delivery_status = ?,
          last_delivery_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [summary.status || null, summary.at || null, configId]
    );
  }
}

export default TenantWebhookConfigModel;
