import { randomUUID } from 'node:crypto';
import { pool } from '../config/database.js';
import { safeJsonParse } from '../utils/object.js';

const toDatabaseJson = (value) => {
  if (value === undefined) {
    return null;
  }

  return JSON.stringify(value);
};

const toDatabaseJsonOrNull = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
};

const formatTemplate = (row) => {
  if (!row) {
    return null;
  }

  const rawMetaResponse = safeJsonParse(row.raw_meta_response, null);
  const rejectionReason =
    rawMetaResponse?.rejected_reason ||
    rawMetaResponse?.rejection_reason ||
    null;
  const qualityScore = safeJsonParse(row.quality_score, row.quality_score);

  return {
    id: row.id,
    uuid: row.uuid,
    userId: row.user_id,
    metaBusinessAccountId: row.meta_business_account_id,
    metaTemplateId: row.meta_template_id,
    name: row.name,
    language: row.language,
    category: row.category,
    templateType: row.template_type,
    status: row.status,
    rejectionReason,
    qualityScore,
    components: safeJsonParse(row.components, []),
    parameterFormat: row.parameter_format,
    rawPayload: safeJsonParse(row.raw_payload, null),
    rawMetaResponse,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
};

const buildWhereClause = (filters = {}) => {
  const conditions = ['user_id = ?', 'deleted_at IS NULL'];
  const values = [filters.userId];

  if (filters.status) {
    conditions.push('status = ?');
    values.push(filters.status);
  }

  if (filters.category) {
    conditions.push('category = ?');
    values.push(filters.category);
  }

  if (filters.templateType) {
    conditions.push('template_type = ?');
    values.push(filters.templateType);
  }

  if (filters.language) {
    conditions.push('language = ?');
    values.push(filters.language);
  }

  if (filters.search) {
    conditions.push('name LIKE ?');
    values.push(`%${filters.search}%`);
  }

  return {
    clause: conditions.join(' AND '),
    values,
  };
};

class TemplateModel {
  static async createTemplate(input) {
    const uuid = randomUUID();

    const sql = `
      INSERT INTO whatsapp_templates (
        uuid,
        user_id,
        meta_business_account_id,
        meta_template_id,
        name,
        language,
        category,
        template_type,
        status,
        quality_score,
        components,
        parameter_format,
        raw_payload,
        raw_meta_response,
        last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      uuid,
      input.userId,
      input.metaBusinessAccountId,
      input.metaTemplateId || null,
      input.name,
      input.language,
      input.category,
      input.templateType,
      input.status,
      toDatabaseJsonOrNull(input.qualityScore),
      toDatabaseJson(input.components || []),
      input.parameterFormat || null,
      toDatabaseJson(input.rawPayload || null),
      toDatabaseJson(input.rawMetaResponse || null),
      input.lastSyncedAt || null,
    ];

    await pool.execute(sql, values);

    return this.getTemplateByUuid(uuid, input.userId);
  }

  static async getTemplateByUuid(uuid, userId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM whatsapp_templates
      WHERE uuid = ? AND user_id = ? AND deleted_at IS NULL
      LIMIT 1
      `,
      [uuid, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return formatTemplate(rows[0]);
  }

  static async getTemplateByMetaId(metaTemplateId, userId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM whatsapp_templates
      WHERE meta_template_id = ? AND user_id = ? AND deleted_at IS NULL
      LIMIT 1
      `,
      [metaTemplateId, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return formatTemplate(rows[0]);
  }

  static async getTemplateByNameAndLanguage({ userId, metaBusinessAccountId, name, language }) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM whatsapp_templates
      WHERE user_id = ?
        AND meta_business_account_id = ?
        AND name = ?
        AND language = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [userId, metaBusinessAccountId, name, language]
    );

    if (rows.length === 0) {
      return null;
    }

    return formatTemplate(rows[0]);
  }

  static async listTemplates(userId, filters = {}) {
    const parsedLimit = Number.parseInt(filters.limit, 10);
    const parsedOffset = Number.parseInt(filters.offset, 10);

    const limit = Math.min(
      Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 20, 1),
      100
    );
    const offset = Math.max(Number.isFinite(parsedOffset) ? parsedOffset : 0, 0);

    const { clause, values } = buildWhereClause({
      userId,
      status: filters.status,
      category: filters.category,
      templateType: filters.templateType,
      language: filters.language,
      search: filters.search,
    });

    const listSql = `
      SELECT *
      FROM whatsapp_templates
      WHERE ${clause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM whatsapp_templates
      WHERE ${clause}
    `;

    const [rows] = await pool.execute(listSql, values);
    const [countRows] = await pool.execute(countSql, values);

    return {
      data: rows.map((row) => formatTemplate(row)),
      pagination: {
        total: countRows[0]?.total || 0,
        limit,
        offset,
      },
    };
  }

  static async updateTemplate(uuid, userId, patch = {}) {
    const updates = [];
    const values = [];

    const assign = (column, value, mapper = (item) => item) => {
      if (value === undefined) {
        return;
      }

      updates.push(`${column} = ?`);
      values.push(mapper(value));
    };

    assign('meta_template_id', patch.metaTemplateId);
    assign('name', patch.name);
    assign('language', patch.language);
    assign('category', patch.category);
    assign('template_type', patch.templateType);
    assign('status', patch.status);
    assign('quality_score', patch.qualityScore, toDatabaseJsonOrNull);
    assign('components', patch.components, toDatabaseJson);
    assign('parameter_format', patch.parameterFormat);
    assign('raw_payload', patch.rawPayload, toDatabaseJson);
    assign('raw_meta_response', patch.rawMetaResponse, toDatabaseJson);
    assign('last_synced_at', patch.lastSyncedAt);

    if (updates.length === 0) {
      return this.getTemplateByUuid(uuid, userId);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `
      UPDATE whatsapp_templates
      SET ${updates.join(', ')}
      WHERE uuid = ? AND user_id = ? AND deleted_at IS NULL
    `;

    await pool.execute(sql, [...values, uuid, userId]);

    return this.getTemplateByUuid(uuid, userId);
  }

  static async upsertFromMeta(input) {
    let existing = null;

    if (input.metaTemplateId) {
      existing = await this.getTemplateByMetaId(input.metaTemplateId, input.userId);
    }

    if (!existing) {
      existing = await this.getTemplateByNameAndLanguage({
        userId: input.userId,
        metaBusinessAccountId: input.metaBusinessAccountId,
        name: input.name,
        language: input.language,
      });
    }

    if (existing) {
      const updated = await this.updateTemplate(existing.uuid, input.userId, {
        metaTemplateId: input.metaTemplateId || existing.metaTemplateId,
        name: input.name,
        language: input.language,
        category: input.category,
        templateType: input.templateType,
        status: input.status,
        qualityScore: input.qualityScore,
        components: input.components,
        parameterFormat: input.parameterFormat,
        rawMetaResponse: input.rawMetaResponse,
        lastSyncedAt: input.lastSyncedAt,
      });

      return {
        action: 'updated',
        template: updated,
      };
    }

    const created = await this.createTemplate(input);

    return {
      action: 'created',
      template: created,
    };
  }

  static async softDeleteTemplate(uuid, userId) {
    const [result] = await pool.execute(
      `
      UPDATE whatsapp_templates
      SET deleted_at = CURRENT_TIMESTAMP,
          status = 'DELETED',
          updated_at = CURRENT_TIMESTAMP
      WHERE uuid = ? AND user_id = ? AND deleted_at IS NULL
      `,
      [uuid, userId]
    );

    return result.affectedRows > 0;
  }
}

export default TemplateModel;
