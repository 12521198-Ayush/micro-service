export const defineFlowTemplateModel = (sequelize, DataTypes) => {
  return sequelize.define(
    'FlowTemplate',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      organization_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      meta_business_account_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      meta_app_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      meta_flow_id: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      template_key: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.ENUM(
          'LEAD_GENERATION',
          'LEAD_QUALIFICATION',
          'APPOINTMENT_BOOKING',
          'SLOT_BOOKING',
          'ORDER_PLACEMENT',
          'RE_ORDERING',
          'CUSTOMER_SUPPORT',
          'TICKET_CREATION',
          'PAYMENTS',
          'COLLECTIONS',
          'REGISTRATIONS',
          'APPLICATIONS',
          'DELIVERY_UPDATES',
          'ADDRESS_CAPTURE',
          'FEEDBACK',
          'SURVEYS'
        ),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      current_draft_version_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      current_published_version_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'flow_templates',
      underscored: true,
      timestamps: true,
      paranoid: false,
      indexes: [
        {
          name: 'uk_flow_template_tenant_key',
          unique: true,
          fields: [
            'organization_id',
            'meta_business_account_id',
            'meta_app_id',
            'template_key',
          ],
        },
      ],
    }
  );
};

export const defineFlowVersionModel = (sequelize, DataTypes) => {
  return sequelize.define(
    'FlowVersion',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      flow_template_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      version_number: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      webhook_mapping_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      response_schema_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      approval_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      approved_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
    },
    {
      tableName: 'flow_versions',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          name: 'uk_flow_version_number',
          unique: true,
          fields: ['flow_template_id', 'version_number'],
        },
      ],
    }
  );
};

export const defineFlowScreenModel = (sequelize, DataTypes) => {
  return sequelize.define(
    'FlowScreen',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      flow_version_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      screen_key: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_index: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      is_entry_point: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      settings_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: 'flow_screens',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          name: 'uk_flow_screen_key',
          unique: true,
          fields: ['flow_version_id', 'screen_key'],
        },
      ],
    }
  );
};

export const defineFlowComponentModel = (sequelize, DataTypes) => {
  return sequelize.define(
    'FlowComponent',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      flow_version_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      flow_screen_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      component_key: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      component_type: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      label: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      variable_key: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      placeholder: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      options_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      validation_rules_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      default_value_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      config_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      order_index: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
    },
    {
      tableName: 'flow_components',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          name: 'uk_flow_component_key',
          unique: true,
          fields: ['flow_screen_id', 'component_key'],
        },
        {
          name: 'uk_flow_component_variable',
          unique: true,
          fields: ['flow_version_id', 'variable_key'],
        },
      ],
    }
  );
};

export const defineFlowActionModel = (sequelize, DataTypes) => {
  return sequelize.define(
    'FlowAction',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      flow_version_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      flow_screen_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      action_key: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      action_type: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      label: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      trigger_component_key: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      target_screen_key: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      api_config_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      payload_mapping_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      condition_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      order_index: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
    },
    {
      tableName: 'flow_actions',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          name: 'uk_flow_action_key',
          unique: true,
          fields: ['flow_screen_id', 'action_key'],
        },
      ],
    }
  );
};

export const defineFlowSubmissionModel = (sequelize, DataTypes) => {
  return sequelize.define(
    'FlowSubmission',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      flow_template_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      flow_version_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      organization_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      meta_business_account_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      meta_app_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      user_phone: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      answers_json: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      mapped_response_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED'),
        allowNull: false,
        defaultValue: 'RECEIVED',
      },
      source: {
        type: DataTypes.ENUM('WHATSAPP', 'WEBHOOK', 'API'),
        allowNull: false,
        defaultValue: 'WEBHOOK',
      },
      external_reference: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      error_message: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: 'flow_submissions',
      underscored: true,
      timestamps: true,
    }
  );
};

export default {
  defineFlowTemplateModel,
  defineFlowVersionModel,
  defineFlowScreenModel,
  defineFlowComponentModel,
  defineFlowActionModel,
  defineFlowSubmissionModel,
};
