import { randomUUID } from 'node:crypto';
import { pool } from '../config/database.js';
import { safeJsonParse } from '../utils/object.js';

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
    organizationId: row.organization_id,
    metaBusinessAccountId: row.meta_business_account_id,
    metaAppId: row.meta_app_id,
    metaPhoneNumberId: row.meta_phone_number_id,
    metaMessageId: row.meta_message_id,
    eventType: row.event_type,
    eventKey: row.event_key,
    rawPayload: safeJsonParse(row.raw_payload_json, null),
    parsedPayload: safeJsonParse(row.parsed_payload_json, null),
    processingStatus: row.processing_status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

class TemplateCallbackEventModel {
  static async createIfNotExists({
    tenant,
    metaMessageId,
    metaPhoneNumberId,
    eventType,
    eventKey,
    rawPayload,
    parsedPayload,
  }) {
    const uuid = randomUUID();

    await pool.execute(
      `
      INSERT IGNORE INTO whatsapp_template_callback_events (
        uuid,
        organization_id,
        meta_business_account_id,
        meta_app_id,
        meta_phone_number_id,
        meta_message_id,
        event_type,
        event_key,
        raw_payload_json,
        parsed_payload_json,
        processing_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED')
      `,
      [
        uuid,
        tenant?.organizationId || null,
        tenant?.metaBusinessAccountId || null,
        tenant?.metaAppId || null,
        metaPhoneNumberId || null,
        metaMessageId || null,
        eventType,
        eventKey,
        toJson(rawPayload),
        toJson(parsedPayload),
      ]
    );

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM whatsapp_template_callback_events
      WHERE event_key = ?
      LIMIT 1
      `,
      [eventKey]
    );

    return formatEvent(rows[0]);
  }

  static async markProcessed(eventKey) {
    await pool.execute(
      `
      UPDATE whatsapp_template_callback_events
      SET processing_status = 'PROCESSED',
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE event_key = ?
      `,
      [eventKey]
    );
  }

  static async markFailed(eventKey, errorMessage) {
    await pool.execute(
      `
      UPDATE whatsapp_template_callback_events
      SET processing_status = 'FAILED',
          error_message = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE event_key = ?
      `,
      [String(errorMessage || '').slice(0, 1024), eventKey]
    );
  }
}

export default TemplateCallbackEventModel;
