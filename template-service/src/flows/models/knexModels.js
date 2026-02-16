export const createFlowTemplateModel = (knex) => {
  return knex.schema.createTable('flow_templates', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.string('organization_id', 64).notNullable();
    table.string('meta_business_account_id', 64).notNullable();
    table.string('meta_app_id', 64).notNullable();
    table.string('template_key', 128).notNullable();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table
      .enu('category', [
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
        'SURVEYS',
      ])
      .notNullable();
    table.enu('status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']).notNullable().defaultTo('DRAFT');
    table.bigInteger('current_draft_version_id').unsigned().nullable();
    table.bigInteger('current_published_version_id').unsigned().nullable();
    table.bigInteger('created_by').unsigned().nullable();
    table.bigInteger('updated_by').unsigned().nullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('deleted_at').nullable();

    table.unique(
      ['organization_id', 'meta_business_account_id', 'meta_app_id', 'template_key'],
      'uk_flow_template_tenant_key'
    );
  });
};

export const createFlowVersionModel = (knex) => {
  return knex.schema.createTable('flow_versions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('flow_template_id').unsigned().notNullable();
    table.integer('version_number').unsigned().notNullable();
    table
      .enu('status', ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'REJECTED'])
      .notNullable()
      .defaultTo('DRAFT');
    table.json('webhook_mapping_json').nullable();
    table.json('response_schema_json').nullable();
    table.text('approval_notes').nullable();
    table.dateTime('published_at').nullable();
    table.bigInteger('created_by').unsigned().nullable();
    table.bigInteger('approved_by').unsigned().nullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('flow_template_id')
      .references('id')
      .inTable('flow_templates')
      .onDelete('CASCADE');
    table.unique(['flow_template_id', 'version_number'], 'uk_flow_version_number');
  });
};

export const createFlowScreenModel = (knex) => {
  return knex.schema.createTable('flow_screens', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('flow_version_id').unsigned().notNullable();
    table.string('screen_key', 128).notNullable();
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.integer('order_index').unsigned().notNullable();
    table.boolean('is_entry_point').notNullable().defaultTo(false);
    table.json('settings_json').nullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('flow_version_id')
      .references('id')
      .inTable('flow_versions')
      .onDelete('CASCADE');
    table.unique(['flow_version_id', 'screen_key'], 'uk_flow_screen_key');
  });
};

export const createFlowComponentModel = (knex) => {
  return knex.schema.createTable('flow_components', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('flow_version_id').unsigned().notNullable();
    table.bigInteger('flow_screen_id').unsigned().notNullable();
    table.string('component_key', 128).notNullable();
    table.string('component_type', 64).notNullable();
    table.string('label', 255).notNullable();
    table.string('variable_key', 128).nullable();
    table.boolean('required').notNullable().defaultTo(false);
    table.string('placeholder', 255).nullable();
    table.json('options_json').nullable();
    table.json('validation_rules_json').nullable();
    table.json('default_value_json').nullable();
    table.json('config_json').nullable();
    table.integer('order_index').unsigned().notNullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('flow_version_id')
      .references('id')
      .inTable('flow_versions')
      .onDelete('CASCADE');
    table
      .foreign('flow_screen_id')
      .references('id')
      .inTable('flow_screens')
      .onDelete('CASCADE');
    table.unique(['flow_screen_id', 'component_key'], 'uk_flow_component_key');
  });
};

export const createFlowActionModel = (knex) => {
  return knex.schema.createTable('flow_actions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('flow_version_id').unsigned().notNullable();
    table.bigInteger('flow_screen_id').unsigned().notNullable();
    table.string('action_key', 128).notNullable();
    table.string('action_type', 64).notNullable();
    table.string('label', 255).nullable();
    table.string('trigger_component_key', 128).nullable();
    table.string('target_screen_key', 128).nullable();
    table.json('api_config_json').nullable();
    table.json('payload_mapping_json').nullable();
    table.json('condition_json').nullable();
    table.integer('order_index').unsigned().notNullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('flow_version_id')
      .references('id')
      .inTable('flow_versions')
      .onDelete('CASCADE');
    table
      .foreign('flow_screen_id')
      .references('id')
      .inTable('flow_screens')
      .onDelete('CASCADE');
    table.unique(['flow_screen_id', 'action_key'], 'uk_flow_action_key');
  });
};

export const createFlowSubmissionModel = (knex) => {
  return knex.schema.createTable('flow_submissions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('flow_template_id').unsigned().notNullable();
    table.bigInteger('flow_version_id').unsigned().notNullable();
    table.string('organization_id', 64).notNullable();
    table.string('meta_business_account_id', 64).notNullable();
    table.string('meta_app_id', 64).notNullable();
    table.string('user_phone', 32).notNullable();
    table.json('answers_json').notNullable();
    table.json('mapped_response_json').nullable();
    table
      .enu('status', ['RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED'])
      .notNullable()
      .defaultTo('RECEIVED');
    table.enu('source', ['WHATSAPP', 'WEBHOOK', 'API']).notNullable().defaultTo('WEBHOOK');
    table.string('external_reference', 128).nullable();
    table.string('error_message', 512).nullable();
    table.dateTime('submitted_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('flow_template_id')
      .references('id')
      .inTable('flow_templates')
      .onDelete('CASCADE');
    table
      .foreign('flow_version_id')
      .references('id')
      .inTable('flow_versions')
      .onDelete('CASCADE');
  });
};

export default {
  createFlowTemplateModel,
  createFlowVersionModel,
  createFlowScreenModel,
  createFlowComponentModel,
  createFlowActionModel,
  createFlowSubmissionModel,
};
