import { randomUUID } from 'node:crypto';
import { pool } from '../../config/database.js';
import { safeJsonParse } from '../../utils/object.js';

const toJson = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
};

const formatSubmissionRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    uuid: row.uuid,
    flowTemplateId: row.flow_template_id,
    flowVersionId: row.flow_version_id,
    flowUuid: row.flow_uuid,
    versionNumber: row.version_number,
    organizationId: row.organization_id,
    metaBusinessAccountId: row.meta_business_account_id,
    metaAppId: row.meta_app_id,
    userPhone: row.user_phone,
    answers: safeJsonParse(row.answers_json, {}),
    mappedResponse: safeJsonParse(row.mapped_response_json, null),
    status: row.status,
    source: row.source,
    externalReference: row.external_reference,
    errorMessage: row.error_message,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

class FlowSubmissionRepository {
  static async getRequiredVariablesByVersionId(versionId) {
    const [rows] = await pool.execute(
      `
      SELECT variable_key
      FROM flow_components
      WHERE flow_version_id = ?
        AND variable_key IS NOT NULL
        AND variable_key <> ''
        AND required = 1
      `,
      [versionId]
    );

    return rows.map((row) => row.variable_key);
  }

  static async createSubmission({
    flowTemplateId,
    flowVersionId,
    flowUuid,
    versionNumber,
    tenant,
    userPhone,
    answers,
    mappedResponse,
    status,
    source,
    externalReference,
    errorMessage,
  }) {
    const submissionUuid = randomUUID();

    await pool.execute(
      `
      INSERT INTO flow_submissions (
        uuid,
        flow_template_id,
        flow_version_id,
        organization_id,
        meta_business_account_id,
        meta_app_id,
        user_phone,
        answers_json,
        mapped_response_json,
        status,
        source,
        external_reference,
        error_message,
        submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        submissionUuid,
        flowTemplateId,
        flowVersionId,
        tenant.organizationId,
        tenant.metaBusinessAccountId,
        tenant.metaAppId,
        userPhone,
        toJson(answers),
        toJson(mappedResponse),
        status,
        source,
        externalReference || null,
        errorMessage || null,
      ]
    );

    const [rows] = await pool.execute(
      `
      SELECT
        fs.*,
        ft.uuid AS flow_uuid,
        fv.version_number
      FROM flow_submissions fs
      INNER JOIN flow_templates ft
        ON ft.id = fs.flow_template_id
      INNER JOIN flow_versions fv
        ON fv.id = fs.flow_version_id
      WHERE fs.uuid = ?
      LIMIT 1
      `,
      [submissionUuid]
    );

    return formatSubmissionRow(rows[0]);
  }
}

export default FlowSubmissionRepository;
