import { randomUUID } from 'node:crypto';
import { pool } from '../../config/database.js';
import { safeJsonParse } from '../../utils/object.js';

const toJson = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
};

const formatEvent = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    uuid: row.uuid,
    tenantWebhookConfigId: row.tenant_webhook_config_id,
    organizationId: row.organization_id,
    metaBusinessAccountId: row.meta_business_account_id,
    metaAppId: row.meta_app_id,
    eventType: row.event_type,
    eventKey: row.event_key,
    payload: safeJsonParse(row.payload_json, null),
    status: row.status,
    attemptCount: row.attempt_count,
    nextAttemptAt: row.next_attempt_at,
    lastAttemptAt: row.last_attempt_at,
    lastHttpStatus: row.last_http_status,
    lastError: row.last_error,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const formatDispatchRow = (row) => {
  return {
    event: formatEvent(row),
    config: {
      id: row.config_id,
      uuid: row.config_uuid,
      targetUrl: row.target_url,
      authType: row.auth_type,
      authConfig: safeJsonParse(row.auth_config_json, null),
      signingSecret: row.signing_secret,
      timeoutMs: row.timeout_ms,
      maxRetries: row.max_retries,
      retryBackoffBaseSeconds: row.retry_backoff_base_seconds,
      eventTypes: safeJsonParse(row.event_types_json, []),
      isActive: Boolean(row.config_is_active),
    },
  };
};

class TenantWebhookEventModel {
  static async enqueueIfConfigured({ config, tenant, eventType, eventKey, payload }) {
    const uuid = randomUUID();

    await pool.execute(
      `
      INSERT IGNORE INTO tenant_webhook_events (
        uuid,
        tenant_webhook_config_id,
        organization_id,
        meta_business_account_id,
        meta_app_id,
        event_type,
        event_key,
        payload_json,
        status,
        next_attempt_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)
      `,
      [
        uuid,
        config.id,
        tenant.organizationId,
        tenant.metaBusinessAccountId,
        tenant.metaAppId,
        eventType,
        eventKey,
        toJson(payload),
      ]
    );

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM tenant_webhook_events
      WHERE organization_id = ?
        AND meta_business_account_id = ?
        AND meta_app_id = ?
        AND event_type = ?
        AND event_key = ?
      LIMIT 1
      `,
      [
        tenant.organizationId,
        tenant.metaBusinessAccountId,
        tenant.metaAppId,
        eventType,
        eventKey,
      ]
    );

    return formatEvent(rows[0]);
  }

  static async claimDueEvents(limit = 50) {
    const connection = await pool.getConnection();
    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Math.min(
      Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 50, 1),
      200
    );

    try {
      await connection.beginTransaction();

      let rows = [];

      try {
        const [lockedRows] = await connection.query(
          `
          SELECT *
          FROM tenant_webhook_events
          WHERE status IN ('PENDING', 'RETRY_PENDING')
            AND next_attempt_at <= CURRENT_TIMESTAMP
          ORDER BY next_attempt_at ASC, id ASC
          LIMIT ${safeLimit}
          FOR UPDATE SKIP LOCKED
          `
        );
        rows = lockedRows;
      } catch (error) {
        // Fallback for MySQL engines/drivers with partial SKIP LOCKED support.
        const [fallbackRows] = await connection.query(
          `
          SELECT *
          FROM tenant_webhook_events
          WHERE status IN ('PENDING', 'RETRY_PENDING')
            AND next_attempt_at <= CURRENT_TIMESTAMP
          ORDER BY next_attempt_at ASC, id ASC
          LIMIT ${safeLimit}
          FOR UPDATE
          `
        );
        rows = fallbackRows;
      }

      if (rows.length === 0) {
        await connection.commit();
        return [];
      }

      const ids = rows.map((row) => row.id);
      const placeholders = ids.map(() => '?').join(', ');

      await connection.query(
        `
        UPDATE tenant_webhook_events
        SET status = 'PROCESSING',
            attempt_count = attempt_count + 1,
            last_attempt_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders})
        `,
        ids
      );

      const [dispatchRows] = await connection.query(
        `
        SELECT
          e.*,
          c.id AS config_id,
          c.uuid AS config_uuid,
          c.target_url,
          c.auth_type,
          c.auth_config_json,
          c.signing_secret,
          c.timeout_ms,
          c.max_retries,
          c.retry_backoff_base_seconds,
          c.event_types_json,
          c.is_active AS config_is_active
        FROM tenant_webhook_events e
        INNER JOIN tenant_webhook_configs c
          ON c.id = e.tenant_webhook_config_id
        WHERE e.id IN (${placeholders})
        ORDER BY e.next_attempt_at ASC, e.id ASC
        `,
        ids
      );

      await connection.commit();

      return dispatchRows.map((row) => formatDispatchRow(row));
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async markDelivered(eventId, responseStatus) {
    await pool.execute(
      `
      UPDATE tenant_webhook_events
      SET status = 'DELIVERED',
          last_http_status = ?,
          delivered_at = CURRENT_TIMESTAMP,
          last_error = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [responseStatus || null, eventId]
    );
  }

  static async markRetryPending({ eventId, nextAttemptAt, errorMessage, responseStatus }) {
    await pool.execute(
      `
      UPDATE tenant_webhook_events
      SET status = 'RETRY_PENDING',
          next_attempt_at = ?,
          last_http_status = ?,
          last_error = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        nextAttemptAt,
        responseStatus || null,
        String(errorMessage || '').slice(0, 1024),
        eventId,
      ]
    );
  }

  static async markDead({ eventId, errorMessage, responseStatus }) {
    await pool.execute(
      `
      UPDATE tenant_webhook_events
      SET status = 'DEAD',
          last_http_status = ?,
          last_error = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        responseStatus || null,
        String(errorMessage || '').slice(0, 1024),
        eventId,
      ]
    );
  }

  static async markSkipped({ eventId, errorMessage }) {
    await pool.execute(
      `
      UPDATE tenant_webhook_events
      SET status = 'SKIPPED',
          last_error = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [String(errorMessage || '').slice(0, 1024), eventId]
    );
  }

  static async recordAttempt({
    eventId,
    attemptNumber,
    requestHeaders,
    requestPayload,
    responseStatus,
    responseBody,
    durationMs,
    errorMessage,
  }) {
    await pool.execute(
      `
      INSERT INTO tenant_webhook_delivery_attempts (
        uuid,
        tenant_webhook_event_id,
        attempt_number,
        request_headers_json,
        request_payload_json,
        response_status,
        response_body,
        duration_ms,
        error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        eventId,
        attemptNumber,
        toJson(requestHeaders || {}),
        toJson(requestPayload || {}),
        responseStatus || null,
        responseBody || null,
        durationMs || null,
        errorMessage ? String(errorMessage).slice(0, 1024) : null,
      ]
    );
  }

  static async requeueByUuidForTenant(eventUuid, tenant) {
    const [result] = await pool.execute(
      `
      UPDATE tenant_webhook_events
      SET status = 'PENDING',
          next_attempt_at = CURRENT_TIMESTAMP,
          last_error = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE uuid = ?
        AND organization_id = ?
        AND meta_business_account_id = ?
        AND meta_app_id = ?
      `,
      [
        eventUuid,
        tenant.organizationId,
        tenant.metaBusinessAccountId,
        tenant.metaAppId,
      ]
    );

    return result.affectedRows > 0;
  }

  static async listRecentEventsForTenant(tenant, limit = 50) {
    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Math.min(
      Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 50, 1),
      100
    );

    const [rows] = await pool.query(
      `
      SELECT *
      FROM tenant_webhook_events
      WHERE organization_id = ?
        AND meta_business_account_id = ?
        AND meta_app_id = ?
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
      `,
      [
        tenant.organizationId,
        tenant.metaBusinessAccountId,
        tenant.metaAppId,
      ]
    );

    return rows.map((row) => formatEvent(row));
  }
}

export default TenantWebhookEventModel;
