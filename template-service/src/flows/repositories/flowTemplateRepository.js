import { randomUUID } from 'node:crypto';
import { pool } from '../../config/database.js';
import { safeJsonParse } from '../../utils/object.js';

const toJson = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
};

const formatTemplateRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    uuid: row.uuid,
    organizationId: row.organization_id,
    metaBusinessAccountId: row.meta_business_account_id,
    metaAppId: row.meta_app_id,
    metaFlowId: row.meta_flow_id,
    templateKey: row.template_key,
    name: row.name,
    description: row.description,
    category: row.category,
    status: row.status,
    currentDraftVersionId: row.current_draft_version_id,
    currentPublishedVersionId: row.current_published_version_id,
    currentDraftVersion: row.current_draft_version,
    currentPublishedVersion: row.current_published_version,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
};

const formatVersionRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    uuid: row.uuid,
    flowTemplateId: row.flow_template_id,
    versionNumber: row.version_number,
    status: row.status,
    webhookMapping: safeJsonParse(row.webhook_mapping_json, null),
    responseSchema: safeJsonParse(row.response_schema_json, null),
    approvalNotes: row.approval_notes,
    publishedAt: row.published_at,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const formatScreenRow = (row) => {
  return {
    id: row.id,
    uuid: row.uuid,
    flowVersionId: row.flow_version_id,
    screenKey: row.screen_key,
    title: row.title,
    description: row.description,
    orderIndex: row.order_index,
    isEntryPoint: Boolean(row.is_entry_point),
    settings: safeJsonParse(row.settings_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    components: [],
    actions: [],
  };
};

const formatComponentRow = (row) => {
  return {
    id: row.id,
    uuid: row.uuid,
    flowVersionId: row.flow_version_id,
    flowScreenId: row.flow_screen_id,
    componentKey: row.component_key,
    componentType: row.component_type,
    label: row.label,
    variableKey: row.variable_key,
    required: Boolean(row.required),
    placeholder: row.placeholder,
    options: safeJsonParse(row.options_json, null),
    validationRules: safeJsonParse(row.validation_rules_json, null),
    defaultValue: safeJsonParse(row.default_value_json, null),
    config: safeJsonParse(row.config_json, null),
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const formatActionRow = (row) => {
  return {
    id: row.id,
    uuid: row.uuid,
    flowVersionId: row.flow_version_id,
    flowScreenId: row.flow_screen_id,
    actionKey: row.action_key,
    actionType: row.action_type,
    label: row.label,
    triggerComponentKey: row.trigger_component_key,
    targetScreenKey: row.target_screen_key,
    apiConfig: safeJsonParse(row.api_config_json, null),
    payloadMapping: safeJsonParse(row.payload_mapping_json, null),
    condition: safeJsonParse(row.condition_json, null),
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const normalizeMysqlErrorCode = (error) => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  return error.code || error.errno || null;
};

class FlowTemplateRepository {
  static async runInTransaction(handler) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await handler(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getActiveComponentTypes() {
    const [rows] = await pool.execute(
      `
      SELECT type_key
      FROM flow_component_definitions
      WHERE is_active = 1
      ORDER BY type_key ASC
      `
    );

    return rows.map((row) => row.type_key);
  }

  static async getActiveActionTypes() {
    const [rows] = await pool.execute(
      `
      SELECT type_key
      FROM flow_action_definitions
      WHERE is_active = 1
      ORDER BY type_key ASC
      `
    );

    return rows.map((row) => row.type_key);
  }

  static async createTemplateWithVersion({ tenant, userId, payload }) {
    return this.runInTransaction(async (connection) => {
      const templateUuid = randomUUID();

      const [templateInsertResult] = await connection.execute(
        `
        INSERT INTO flow_templates (
          uuid,
          organization_id,
          meta_business_account_id,
          meta_app_id,
          meta_flow_id,
          template_key,
          name,
          description,
          category,
          status,
          created_by,
          updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)
        `,
        [
          templateUuid,
          tenant.organizationId,
          tenant.metaBusinessAccountId,
          tenant.metaAppId,
          payload.flowId,
          payload.templateKey,
          payload.name,
          payload.description,
          payload.category,
          userId || null,
          userId || null,
        ]
      );

      const templateId = templateInsertResult.insertId;

      const version = await this.insertVersionGraph(connection, {
        templateId,
        versionNumber: 1,
        versionStatus: 'DRAFT',
        webhookMapping: payload.webhookMapping,
        responseSchema: payload.responseSchema,
        approvalNotes: null,
        publishedAt: null,
        createdBy: userId || null,
        approvedBy: null,
        screens: payload.screens,
      });

      await connection.execute(
        `
        UPDATE flow_templates
        SET current_draft_version_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [version.id, templateId]
      );

      return {
        templateUuid,
        versionId: version.id,
        versionNumber: version.versionNumber,
      };
    });
  }

  static async createDraftVersion({ templateId, userId, payload }) {
    return this.runInTransaction(async (connection) => {
      const [templateRows] = await connection.execute(
        `
        SELECT id
        FROM flow_templates
        WHERE id = ?
        FOR UPDATE
        `,
        [templateId]
      );

      if (templateRows.length === 0) {
        return null;
      }

      const [versionRows] = await connection.execute(
        `
        SELECT COALESCE(MAX(version_number), 0) AS max_version
        FROM flow_versions
        WHERE flow_template_id = ?
        FOR UPDATE
        `,
        [templateId]
      );

      const nextVersion = Number(versionRows[0]?.max_version || 0) + 1;

      const version = await this.insertVersionGraph(connection, {
        templateId,
        versionNumber: nextVersion,
        versionStatus: 'DRAFT',
        webhookMapping: payload.webhookMapping,
        responseSchema: payload.responseSchema,
        approvalNotes: null,
        publishedAt: null,
        createdBy: userId || null,
        approvedBy: null,
        screens: payload.screens,
      });

      await connection.execute(
        `
        UPDATE flow_templates
        SET name = ?,
            template_key = ?,
            description = ?,
            category = ?,
            meta_flow_id = COALESCE(?, meta_flow_id),
            current_draft_version_id = ?,
            status = 'DRAFT',
            updated_by = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          payload.name,
          payload.templateKey,
          payload.description,
          payload.category,
          payload.flowId,
          version.id,
          userId || null,
          templateId,
        ]
      );

      return version;
    });
  }

  static async insertVersionGraph(
    connection,
    {
      templateId,
      versionNumber,
      versionStatus,
      webhookMapping,
      responseSchema,
      approvalNotes,
      publishedAt,
      createdBy,
      approvedBy,
      screens,
    }
  ) {
    const versionUuid = randomUUID();

    const [versionInsertResult] = await connection.execute(
      `
      INSERT INTO flow_versions (
        uuid,
        flow_template_id,
        version_number,
        status,
        webhook_mapping_json,
        response_schema_json,
        approval_notes,
        published_at,
        created_by,
        approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        versionUuid,
        templateId,
        versionNumber,
        versionStatus,
        toJson(webhookMapping),
        toJson(responseSchema),
        approvalNotes,
        publishedAt,
        createdBy,
        approvedBy,
      ]
    );

    const versionId = versionInsertResult.insertId;

    const screenIdByKey = {};

    const sortedScreens = [...screens].sort((a, b) => a.order - b.order);

    for (const screen of sortedScreens) {
      const [screenResult] = await connection.execute(
        `
        INSERT INTO flow_screens (
          uuid,
          flow_version_id,
          screen_key,
          title,
          description,
          order_index,
          is_entry_point,
          settings_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          versionId,
          screen.key,
          screen.title,
          screen.description,
          screen.order,
          screen.isEntryPoint ? 1 : 0,
          toJson(screen.settings),
        ]
      );

      screenIdByKey[screen.key] = screenResult.insertId;
    }

    for (const screen of sortedScreens) {
      const flowScreenId = screenIdByKey[screen.key];

      const sortedComponents = [...screen.components].sort((a, b) => a.order - b.order);

      for (const component of sortedComponents) {
        await connection.execute(
          `
          INSERT INTO flow_components (
            uuid,
            flow_version_id,
            flow_screen_id,
            component_key,
            component_type,
            label,
            variable_key,
            required,
            placeholder,
            options_json,
            validation_rules_json,
            default_value_json,
            config_json,
            order_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            randomUUID(),
            versionId,
            flowScreenId,
            component.key,
            component.type,
            component.label,
            component.variableKey || null,
            component.required ? 1 : 0,
            component.placeholder,
            toJson(component.options),
            toJson(component.validationRules),
            toJson(component.defaultValue),
            toJson(component.config),
            component.order,
          ]
        );
      }

      const sortedActions = [...screen.actions].sort((a, b) => a.order - b.order);

      for (const action of sortedActions) {
        await connection.execute(
          `
          INSERT INTO flow_actions (
            uuid,
            flow_version_id,
            flow_screen_id,
            action_key,
            action_type,
            label,
            trigger_component_key,
            target_screen_key,
            api_config_json,
            payload_mapping_json,
            condition_json,
            order_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            randomUUID(),
            versionId,
            flowScreenId,
            action.key,
            action.type,
            action.label,
            action.triggerComponentKey,
            action.targetScreenKey,
            toJson(action.apiConfig),
            toJson(action.payloadMapping),
            toJson(action.condition),
            action.order,
          ]
        );
      }
    }

    return {
      id: versionId,
      uuid: versionUuid,
      versionNumber,
      status: versionStatus,
    };
  }

  static async listTemplatesByTenant(tenant, filters = {}) {
    const conditions = [
      'ft.organization_id = ?',
      'ft.meta_business_account_id = ?',
      'ft.meta_app_id = ?',
      'ft.deleted_at IS NULL',
    ];
    const values = [
      tenant.organizationId,
      tenant.metaBusinessAccountId,
      tenant.metaAppId,
    ];

    if (filters.status) {
      conditions.push('ft.status = ?');
      values.push(filters.status);
    }

    if (filters.category) {
      conditions.push('ft.category = ?');
      values.push(filters.category);
    }

    if (filters.search) {
      conditions.push('(ft.name LIKE ? OR ft.template_key LIKE ?)');
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.join(' AND ');

    const [rows] = await pool.execute(
      `
      SELECT
        ft.*,
        draft.version_number AS current_draft_version,
        published.version_number AS current_published_version
      FROM flow_templates ft
      LEFT JOIN flow_versions draft
        ON draft.id = ft.current_draft_version_id
      LEFT JOIN flow_versions published
        ON published.id = ft.current_published_version_id
      WHERE ${whereClause}
      ORDER BY ft.created_at DESC
      LIMIT ${Number(filters.limit)} OFFSET ${Number(filters.offset)}
      `,
      values
    );

    const [countRows] = await pool.execute(
      `
      SELECT COUNT(*) AS total
      FROM flow_templates ft
      WHERE ${whereClause}
      `,
      values
    );

    return {
      data: rows.map(formatTemplateRow),
      pagination: {
        total: Number(countRows[0]?.total || 0),
        limit: Number(filters.limit),
        offset: Number(filters.offset),
      },
    };
  }

  static async getTemplateByUuid(tenant, templateUuid) {
    const [rows] = await pool.execute(
      `
      SELECT
        ft.*,
        draft.version_number AS current_draft_version,
        published.version_number AS current_published_version
      FROM flow_templates ft
      LEFT JOIN flow_versions draft
        ON draft.id = ft.current_draft_version_id
      LEFT JOIN flow_versions published
        ON published.id = ft.current_published_version_id
      WHERE ft.uuid = ?
        AND ft.organization_id = ?
        AND ft.meta_business_account_id = ?
        AND ft.meta_app_id = ?
        AND ft.deleted_at IS NULL
      LIMIT 1
      `,
      [
        templateUuid,
        tenant.organizationId,
        tenant.metaBusinessAccountId,
        tenant.metaAppId,
      ]
    );

    return formatTemplateRow(rows[0]);
  }

  static async getTemplateById(templateId) {
    const [rows] = await pool.execute(
      `
      SELECT
        ft.*,
        draft.version_number AS current_draft_version,
        published.version_number AS current_published_version
      FROM flow_templates ft
      LEFT JOIN flow_versions draft
        ON draft.id = ft.current_draft_version_id
      LEFT JOIN flow_versions published
        ON published.id = ft.current_published_version_id
      WHERE ft.id = ?
        AND ft.deleted_at IS NULL
      LIMIT 1
      `,
      [templateId]
    );

    return formatTemplateRow(rows[0]);
  }

  static async listTemplatesForStatusSync({ tenant = null, limit = 100, offset = 0 } = {}) {
    const conditions = [
      'ft.deleted_at IS NULL',
      'ft.meta_flow_id IS NOT NULL',
      "TRIM(ft.meta_flow_id) <> ''",
    ];
    const values = [];

    if (tenant) {
      conditions.push('ft.organization_id = ?');
      conditions.push('ft.meta_business_account_id = ?');
      conditions.push('ft.meta_app_id = ?');
      values.push(tenant.organizationId, tenant.metaBusinessAccountId, tenant.metaAppId);
    }

    const whereClause = conditions.join(' AND ');
    const safeLimit = Math.max(Number.parseInt(limit, 10) || 100, 1);
    const safeOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);

    const [rows] = await pool.execute(
      `
      SELECT
        ft.uuid,
        ft.organization_id,
        ft.meta_business_account_id,
        ft.meta_app_id,
        ft.meta_flow_id,
        ft.status
      FROM flow_templates ft
      WHERE ${whereClause}
      ORDER BY ft.id ASC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
      `,
      values
    );

    return rows.map((row) => ({
      uuid: row.uuid,
      organizationId: row.organization_id,
      metaBusinessAccountId: row.meta_business_account_id,
      metaAppId: row.meta_app_id,
      metaFlowId: row.meta_flow_id,
      status: row.status,
    }));
  }

  static async getVersionsByTemplateId(templateId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM flow_versions
      WHERE flow_template_id = ?
      ORDER BY version_number DESC
      `,
      [templateId]
    );

    return rows.map(formatVersionRow);
  }

  static async getVersionByNumber(templateId, versionNumber) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM flow_versions
      WHERE flow_template_id = ? AND version_number = ?
      LIMIT 1
      `,
      [templateId, versionNumber]
    );

    return formatVersionRow(rows[0]);
  }

  static async getVersionById(templateId, versionId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM flow_versions
      WHERE flow_template_id = ? AND id = ?
      LIMIT 1
      `,
      [templateId, versionId]
    );

    return formatVersionRow(rows[0]);
  }

  static async getLatestVersion(templateId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM flow_versions
      WHERE flow_template_id = ?
      ORDER BY version_number DESC
      LIMIT 1
      `,
      [templateId]
    );

    return formatVersionRow(rows[0]);
  }

  static async getVersionGraph(versionId) {
    const [versionRows] = await pool.execute(
      `
      SELECT *
      FROM flow_versions
      WHERE id = ?
      LIMIT 1
      `,
      [versionId]
    );

    if (versionRows.length === 0) {
      return null;
    }

    const version = formatVersionRow(versionRows[0]);

    const [screenRows] = await pool.execute(
      `
      SELECT *
      FROM flow_screens
      WHERE flow_version_id = ?
      ORDER BY order_index ASC
      `,
      [versionId]
    );

    const [componentRows] = await pool.execute(
      `
      SELECT *
      FROM flow_components
      WHERE flow_version_id = ?
      ORDER BY flow_screen_id ASC, order_index ASC
      `,
      [versionId]
    );

    const [actionRows] = await pool.execute(
      `
      SELECT *
      FROM flow_actions
      WHERE flow_version_id = ?
      ORDER BY flow_screen_id ASC, order_index ASC
      `,
      [versionId]
    );

    const screenById = {};
    const screens = screenRows.map((row) => {
      const formatted = formatScreenRow(row);
      screenById[formatted.id] = formatted;
      return formatted;
    });

    componentRows.forEach((row) => {
      const component = formatComponentRow(row);
      const screen = screenById[component.flowScreenId];

      if (screen) {
        screen.components.push(component);
      }
    });

    actionRows.forEach((row) => {
      const action = formatActionRow(row);
      const screen = screenById[action.flowScreenId];

      if (screen) {
        screen.actions.push(action);
      }
    });

    return {
      ...version,
      screens,
    };
  }

  static async publishVersion({ templateId, versionId, approvedBy, approvalNotes }) {
    return this.runInTransaction(async (connection) => {
      const [versionRows] = await connection.execute(
        `
        SELECT id
        FROM flow_versions
        WHERE id = ? AND flow_template_id = ?
        LIMIT 1
        FOR UPDATE
        `,
        [versionId, templateId]
      );

      if (versionRows.length === 0) {
        return null;
      }

      await connection.execute(
        `
        UPDATE flow_versions
        SET status = 'ARCHIVED',
            updated_at = CURRENT_TIMESTAMP
        WHERE flow_template_id = ?
          AND status = 'PUBLISHED'
          AND id <> ?
        `,
        [templateId, versionId]
      );

      await connection.execute(
        `
        UPDATE flow_versions
        SET status = 'PUBLISHED',
            approval_notes = ?,
            approved_by = ?,
            published_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [approvalNotes || null, approvedBy || null, versionId]
      );

      await connection.execute(
        `
        UPDATE flow_templates
        SET current_published_version_id = ?,
            status = 'PUBLISHED',
            updated_by = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [versionId, approvedBy || null, templateId]
      );

      return true;
    });
  }

  static async softDeleteTemplate(tenant, templateUuid, deletedBy = null) {
    const [result] = await pool.execute(
      `
      UPDATE flow_templates
      SET deleted_at = CURRENT_TIMESTAMP,
          status = 'ARCHIVED',
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE uuid = ?
        AND organization_id = ?
        AND meta_business_account_id = ?
        AND meta_app_id = ?
        AND deleted_at IS NULL
      `,
      [
        deletedBy,
        templateUuid,
        tenant.organizationId,
        tenant.metaBusinessAccountId,
        tenant.metaAppId,
      ]
    );

    return result.affectedRows > 0;
  }

  static async deprecateTemplate(tenant, templateUuid, updatedBy = null) {
    return this.runInTransaction(async (connection) => {
      const [templateRows] = await connection.execute(
        `
        SELECT id
        FROM flow_templates
        WHERE uuid = ?
          AND organization_id = ?
          AND meta_business_account_id = ?
          AND meta_app_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
        `,
        [
          templateUuid,
          tenant.organizationId,
          tenant.metaBusinessAccountId,
          tenant.metaAppId,
        ]
      );

      if (templateRows.length === 0) {
        return false;
      }

      const templateId = Number(templateRows[0].id);

      await connection.execute(
        `
        UPDATE flow_versions
        SET status = 'ARCHIVED',
            updated_at = CURRENT_TIMESTAMP
        WHERE flow_template_id = ?
          AND status = 'PUBLISHED'
        `,
        [templateId]
      );

      const [updateResult] = await connection.execute(
        `
        UPDATE flow_templates
        SET status = 'DEPRECATED',
            current_published_version_id = NULL,
            updated_by = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
        `,
        [updatedBy, templateId]
      );

      return updateResult.affectedRows > 0;
    });
  }

  static async updateTemplateStatus(tenant, templateUuid, status, updatedBy = null) {
    const [result] = await pool.execute(
      `
      UPDATE flow_templates
      SET status = ?,
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE uuid = ?
        AND organization_id = ?
        AND meta_business_account_id = ?
        AND meta_app_id = ?
        AND deleted_at IS NULL
      `,
      [
        status,
        updatedBy,
        templateUuid,
        tenant.organizationId,
        tenant.metaBusinessAccountId,
        tenant.metaAppId,
      ]
    );

    return result.affectedRows > 0;
  }

  static async cloneTemplateFromVersion({
    tenant,
    userId,
    sourceTemplate,
    sourceVersionGraph,
    cloneName,
    cloneTemplateKey,
  }) {
    const payload = {
      templateKey: cloneTemplateKey,
      name: cloneName,
      flowId: sourceTemplate.metaFlowId,
      description: sourceTemplate.description,
      category: sourceTemplate.category,
      webhookMapping: sourceVersionGraph.webhookMapping,
      responseSchema: sourceVersionGraph.responseSchema,
      screens: sourceVersionGraph.screens.map((screen) => ({
        key: screen.screenKey,
        title: screen.title,
        description: screen.description,
        order: screen.orderIndex,
        isEntryPoint: screen.isEntryPoint,
        settings: screen.settings,
        components: screen.components.map((component) => ({
          key: component.componentKey,
          type: component.componentType,
          label: component.label,
          variableKey: component.variableKey,
          required: component.required,
          placeholder: component.placeholder,
          options: component.options,
          validationRules: component.validationRules,
          defaultValue: component.defaultValue,
          config: component.config,
          order: component.orderIndex,
        })),
        actions: screen.actions.map((action) => ({
          key: action.actionKey,
          type: action.actionType,
          label: action.label,
          triggerComponentKey: action.triggerComponentKey,
          targetScreenKey: action.targetScreenKey,
          apiConfig: action.apiConfig,
          payloadMapping: action.payloadMapping,
          condition: action.condition,
          order: action.orderIndex,
        })),
      })),
    };

    return this.createTemplateWithVersion({
      tenant,
      userId,
      payload,
    });
  }

  static isConflictError(error) {
    return normalizeMysqlErrorCode(error) === 'ER_DUP_ENTRY';
  }
}

export default FlowTemplateRepository;
