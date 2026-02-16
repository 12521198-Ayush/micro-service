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
    organizationId: row.organization_id,
    userId: row.user_id,
    metaBusinessAccountId: row.meta_business_account_id,
    metaAppId: row.meta_app_id,
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
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
};

const buildTenantWhereClause = (tenant) => {
  return {
    clause:
      'organization_id = ? AND meta_business_account_id = ? AND meta_app_id = ?',
    values: [
      tenant.organizationId,
      tenant.metaBusinessAccountId,
      tenant.metaAppId,
    ],
  };
};

const buildWhereClause = ({ tenant, filters = {} }) => {
  const tenantScope = buildTenantWhereClause(tenant);

  const conditions = [`${tenantScope.clause}`, 'deleted_at IS NULL'];
  const values = [...tenantScope.values];

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
        organization_id,
        user_id,
        meta_business_account_id,
        meta_app_id,
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
        last_synced_at,
        created_by,
        updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      uuid,
      input.tenant.organizationId,
      input.userId || null,
      input.tenant.metaBusinessAccountId,
      input.tenant.metaAppId,
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
      input.userId || null,
      input.userId || null,
    ];

    await pool.execute(sql, values);

    return this.getTemplateByUuid(uuid, input.tenant);
  }

  static async getTemplateByUuid(uuid, tenant) {
    const tenantScope = buildTenantWhereClause(tenant);

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM whatsapp_templates
      WHERE uuid = ?
        AND ${tenantScope.clause}
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [uuid, ...tenantScope.values]
    );

    if (rows.length === 0) {
      return null;
    }

    return formatTemplate(rows[0]);
  }

  static async getTemplateByMetaId(metaTemplateId, tenant) {
    const tenantScope = buildTenantWhereClause(tenant);

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM whatsapp_templates
      WHERE meta_template_id = ?
        AND ${tenantScope.clause}
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [metaTemplateId, ...tenantScope.values]
    );

    if (rows.length === 0) {
      return null;
    }

    return formatTemplate(rows[0]);
  }

  static async getTemplateByNameAndLanguage({ tenant, name, language }) {
    const tenantScope = buildTenantWhereClause(tenant);

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM whatsapp_templates
      WHERE ${tenantScope.clause}
        AND name = ?
        AND language = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [...tenantScope.values, name, language]
    );

    if (rows.length === 0) {
      return null;
    }

    return formatTemplate(rows[0]);
  }

  static async listTemplates(tenant, filters = {}) {
    const parsedLimit = Number.parseInt(filters.limit, 10);
    const parsedOffset = Number.parseInt(filters.offset, 10);

    const limit = Math.min(
      Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 20, 1),
      100
    );
    const offset = Math.max(Number.isFinite(parsedOffset) ? parsedOffset : 0, 0);

    const { clause, values } = buildWhereClause({
      tenant,
      filters: {
        status: filters.status,
        category: filters.category,
        templateType: filters.templateType,
        language: filters.language,
        search: filters.search,
      },
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

  static async updateTemplate(uuid, tenant, patch = {}) {
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
    assign('updated_by', patch.updatedBy || null);

    if (updates.length === 0) {
      return this.getTemplateByUuid(uuid, tenant);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const tenantScope = buildTenantWhereClause(tenant);

    const sql = `
      UPDATE whatsapp_templates
      SET ${updates.join(', ')}
      WHERE uuid = ?
        AND ${tenantScope.clause}
        AND deleted_at IS NULL
    `;

    await pool.execute(sql, [...values, uuid, ...tenantScope.values]);

    return this.getTemplateByUuid(uuid, tenant);
  }

  static async upsertFromMeta(input) {
    let existing = null;

    if (input.metaTemplateId) {
      existing = await this.getTemplateByMetaId(input.metaTemplateId, input.tenant);
    }

    if (!existing) {
      existing = await this.getTemplateByNameAndLanguage({
        tenant: input.tenant,
        name: input.name,
        language: input.language,
      });
    }

    if (existing) {
      const updated = await this.updateTemplate(existing.uuid, input.tenant, {
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
        updatedBy: input.userId || null,
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

  static async softDeleteTemplate(uuid, tenant, userId = null) {
    const tenantScope = buildTenantWhereClause(tenant);

    const [result] = await pool.execute(
      `
      UPDATE whatsapp_templates
      SET deleted_at = CURRENT_TIMESTAMP,
          status = 'DELETED',
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE uuid = ?
        AND ${tenantScope.clause}
        AND deleted_at IS NULL
      `,
      [userId, uuid, ...tenantScope.values]
    );

    return result.affectedRows > 0;
  }
}

export default TemplateModel;
