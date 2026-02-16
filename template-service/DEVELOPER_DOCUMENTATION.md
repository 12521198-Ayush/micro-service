# Template Service - Complete Developer Documentation

## 1. Service purpose

`template-service` is the WhatsApp Template + Flow orchestration service for a multi-tenant SaaS platform.

It is responsible for:
- managing WhatsApp template metadata and lifecycle
- synchronizing template approval state with Meta Cloud API
- receiving Meta delivery/user-interaction callbacks
- managing DB-driven flow templates and flow submissions
- forwarding normalized events to customer webhook endpoints with retries/signatures

This service assumes `organization-service` and `team-service` exist and provide tenant/user identity to tokens or trusted service headers.

## 2. Runtime architecture

### 2.1 Layers
- `routes` -> HTTP routing
- `controllers` -> request/response mapping
- `services` -> business orchestration
- `models/repositories` -> persistence and tenant-safe queries
- `middleware` -> auth, tenant context, upload, errors
- `validators` -> payload integrity
- `dto/utils/constants` -> mapping and helper logic

### 2.2 Core subsystems
- **Template subsystem**
  - CRUD + sync/publish
  - files: `src/controllers/templateController.js`, `src/services/templateDeliveryService.js`
- **Flow engine subsystem**
  - DB-driven flow graph + versions + submissions
  - files: `src/flows/*`
- **Inbound webhook subsystem**
  - Meta callbacks: `GET/POST /webhooks/meta`
  - Flow submissions: `POST /webhooks/flows`
- **Outbound customer webhook subsystem**
  - Tenant config: `src/webhooks/services/webhookConfigService.js`
  - Event queue/dispatcher: `src/webhooks/services/webhookEventService.js`

### 2.3 Dispatcher lifecycle
Webhook dispatcher starts with server boot and stops during graceful shutdown.

## 3. Tenant model and authentication

## 3.1 Authentication
Management APIs require JWT (`Authorization: Bearer <token>`).

## 3.2 Tenant context (dynamic only)
Tenant context is resolved from JWT claims and/or trusted internal headers:
- `organizationId` / `organization_id`
- `metaBusinessAccountId` / `meta_business_account_id`
- `metaAppId` / `meta_app_id`

Supported headers:
- `x-organization-id`
- `x-meta-business-account-id`
- `x-meta-app-id`

No tenant fallback is read from env variables.
If required fields are missing, API returns `TENANT_CONTEXT_MISSING`.

## 3.3 Isolation contract
All business-critical reads/writes are scoped by:
- `organization_id`
- `meta_business_account_id`
- `meta_app_id`

## 4. API surface (implemented)

## 4.1 Health
- `GET /health`

## 4.2 Template APIs
Base: `/api/templates`
- `GET /capabilities`
- `POST /validate`
- `POST /media/upload`
- `POST /sync`
- `GET /`
- `POST /`
- `GET /:uuid`
- `PUT /:uuid`
- `PATCH /:uuid`
- `POST /:uuid/publish`
- `DELETE /:uuid`

## 4.3 Flow APIs
Base: `/flows`
- `POST /`
- `GET /`
- `GET /:id`
- `PUT /:id`
- `DELETE /:id`
- `POST /:id/publish`
- `POST /:id/clone`

## 4.4 Inbound webhooks
- `GET /webhooks/meta` (Meta verification)
- `POST /webhooks/meta` (Meta callbacks)
- `POST /webhooks/flows` (Flow submission ingestion)

## 4.5 Customer webhook config APIs
Base: `/api/webhooks`
- `GET /config`
- `PUT /config`
- `DELETE /config`
- `GET /events`
- `POST /events/:eventId/retry`

## 5. Database overview

### 5.1 Template tables
- `whatsapp_templates`
- `whatsapp_template_callback_events`

### 5.2 Flow tables
- `flow_templates`
- `flow_versions`
- `flow_screens`
- `flow_components`
- `flow_actions`
- `flow_submissions`

### 5.3 Webhook delivery tables
- `tenant_webhook_configs`
- `tenant_webhook_events`
- `tenant_webhook_delivery_attempts`

## 6. Template lifecycle behavior (all template types)

All template types share a common lifecycle and are fully operational in this service:
- create (`POST /api/templates`)
- list (`GET /api/templates`)
- get (`GET /api/templates/:uuid`)
- edit (`PUT/PATCH /api/templates/:uuid`)
- publish/sync (`POST /api/templates/:uuid/publish`)
- delete (`DELETE /api/templates/:uuid`)
- webhook receive + response parsing (`POST /webhooks/meta`)
- DB persistence + tenant-safe query scope

## 6.1 Standard template behavior
1. Create template with `category=MARKETING|UTILITY` and `BODY` (+ optional header/footer/buttons).
2. List/get/edit template while status is non-deleted.
3. Publish endpoint syncs status from Meta to local DB.
4. Delivery callbacks are normalized and forwarded as tenant webhook events.
5. User replies are parsed and forwarded as `template.response.received`.
6. Delete performs soft delete locally and delete by id/name in Meta.

## 6.2 Authentication template behavior
1. Create template with `category=AUTHENTICATION` and OTP/copy-code style buttons.
2. Edit/publish/delete lifecycle is identical to standard templates.
3. Callback processing uses the same inbound normalization pipeline.

## 6.3 Carousel template behavior
1. Upload media handle (`POST /api/templates/media/upload`).
2. Create template with top-level `CAROUSEL` and valid per-card components.
3. Edit/publish/delete lifecycle is identical to standard templates.
4. Inbound interactive replies (`button_reply`, `list_reply`) are normalized and forwarded.

## 6.4 Flow template behavior (WhatsApp template type `FLOW`)
1. Create template containing `BUTTONS` with `FLOW`/`FLOW_ACTION`.
2. Edit/publish/delete lifecycle is identical to standard templates.
3. User submits flow data from WhatsApp.
4. Submission is ingested either from Meta `nfm_reply` callback path or dedicated `POST /webhooks/flows`.
5. Submission persistence + mapping generates `flow.submission.received` webhook events.

## 7. Sync path (create -> publish -> callback)

## 7.1 Sync request example
```json
POST /api/templates/:uuid/publish
{}
```

Required tenant headers/claims:
- `organizationId`
- `metaBusinessAccountId`
- `metaAppId`

## 7.2 Callback processing model
- callback events are stored in `whatsapp_template_callback_events`
- delivery updates are forwarded as `template.delivery.updated`
- user replies are forwarded as `template.response.received`

## 8. Inbound webhook behavior

## 8.1 Meta callback ingestion (`POST /webhooks/meta`)
The service parses two callback groups:
- `statuses[]` -> delivery state updates
- `messages[]` -> user inbound responses (button/list/nfm/text)

For each callback:
- idempotency key (`event_key`) is generated
- raw + parsed payload is persisted to `whatsapp_template_callback_events`
- normalized outbound customer event is queued

## 8.2 Flow submission webhook (`POST /webhooks/flows`)
Validates:
- tenant keys
- flow ownership
- required variables

Then:
- stores `flow_submissions`
- applies `webhook_mapping` to build structured payload
- enqueues `flow.submission.received`

## 9. Customer webhook engine

## 9.1 Tenant webhook configuration
Business configures endpoint using:
```json
PUT /api/webhooks/config
{
  "targetUrl": "https://customer.example.com/hooks/whatsapp",
  "authType": "BEARER",
  "auth": { "token": "customer_token" },
  "signingSecret": "customer_hmac_secret",
  "timeoutMs": 8000,
  "maxRetries": 6,
  "retryBackoffBaseSeconds": 15,
  "eventTypes": [
    "template.created",
    "template.updated",
    "template.deleted",
    "template.synced",
    "template.delivery.updated",
    "template.response.received",
    "flow.submission.received"
  ],
  "isActive": true
}
```

## 9.2 Event enqueueing
Event is enqueued only if:
- config exists and is active
- event type is subscribed

## 9.3 Delivery headers and auth
Outbound request headers:
- `Content-Type: application/json`
- `User-Agent: template-service-webhook-dispatcher/1.0`
- `X-Webhook-Event`
- `X-Webhook-Event-Id`
- `X-Webhook-Event-Key`
- `X-Webhook-Timestamp`
- `Idempotency-Key`
- `X-Webhook-Signature` (when signing enabled)

Optional authorization:
- `NONE`
- `BEARER`
- `BASIC`

## 9.4 Signature format
`X-Webhook-Signature = sha256=<HMAC_SHA256(secret, "timestamp.payloadJson")>`

## 9.5 Retry and terminal states
Dispatcher retries on:
- network failures/timeouts
- `408`, `425`, `429`, `500`, `502`, `503`, `504`

Event status progression:
- `PENDING` -> `PROCESSING` -> `DELIVERED`
- or `RETRY_PENDING` -> `PROCESSING`...
- terminal failure: `DEAD`
- skipped by config condition: `SKIPPED`

Each attempt is logged in `tenant_webhook_delivery_attempts`.

## 10. Complete end-user behavior flow (sequence style)

## 10.1 Standard template (create -> CRM update)
1. Business calls `POST /api/templates` with standard payload.
2. Service validates payload and creates Meta template.
3. Service stores template row scoped to tenant triple.
4. Business calls `POST /api/templates/:uuid/publish` (or batch `POST /api/templates/sync`) until `APPROVED`.
5. Meta sends delivery callbacks to `POST /webhooks/meta`.
6. Service stores callback event row and normalizes payload.
7. Service enqueues tenant webhook event.
8. Dispatcher posts signed payload to customer webhook.
9. Customer webhook receiver dedupes by `Idempotency-Key` and updates CRM.

## 10.2 Authentication template (OTP-style)
1. Business creates template with `category=AUTHENTICATION`.
2. Business can list/get/edit exactly like standard templates.
3. Business publishes/syncs status to `APPROVED`.
4. Meta callbacks are ingested at `/webhooks/meta`.
5. Statuses are normalized and forwarded to customer webhook.

## 10.3 Carousel template (media + interactive)
1. Business uploads media and receives `header_handle`.
2. Business creates carousel template referencing the media handle.
3. Business publishes/syncs template approval.
4. User interacts with quick replies/list/buttons.
5. Meta callback arrives at `/webhooks/meta` with interactive payload.
6. Service parses interaction (`button_reply`, `list_reply`) and emits `template.response.received`.
7. Customer webhook payload updates campaign/order state in CRM.

## 10.4 Flow usage (template type FLOW + flow engine)
1. Business creates flow graph using `POST /flows` (screens/components/actions).
2. Business publishes flow using `POST /flows/:id/publish`.
3. Business creates WhatsApp template with `FLOW` button for interaction entry.
4. User opens flow in WhatsApp and submits values.
5. Submission enters `POST /webhooks/flows` (or `nfm_reply` route via `/webhooks/meta`).
6. Service validates tenant + required variables + version ownership.
7. Service stores `flow_submissions`.
8. Service applies `webhook_mapping` to produce CRM-ready structure.
9. Service enqueues `flow.submission.received` tenant webhook event.
10. Dispatcher forwards signed payload with retry/idempotency headers.
11. Customer receiver writes submission to CRM/ticket/order system.

## 10.5 Customer webhook receiver behavior (recommended)
1. Verify source by IP allowlist (if enabled) + `X-Webhook-Signature`.
2. Reject if timestamp drift exceeds accepted window.
3. Deduplicate by `Idempotency-Key` or `X-Webhook-Event-Key`.
4. Process payload and return `2xx` quickly.
5. Offload heavy business processing to internal queue/worker.

## 11. Payload examples

## 11.1 Outbound customer webhook payload
```json
{
  "eventId": "e3c69070-7bb2-4adc-a58d-55ac8c1e4e1a",
  "eventType": "template.response.received",
  "eventKey": "meta.message:wamid.HBgM...",
  "occurredAt": "2026-02-12T11:14:20.000Z",
  "tenant": {
    "organizationId": "org_abc",
    "metaBusinessAccountId": "1846008296268872",
    "metaAppId": "123456789012345"
  },
  "data": {
    "relatedMessageId": "9ab2e9fe-2ff7-4efd-a4bf-f6758ce97bff",
    "relatedMetaMessageId": "wamid.HBgM...",
    "inboundMessageId": "wamid.inbound...",
    "responseType": "interactive",
    "from": "14155550123",
    "timestamp": "1739346000",
    "parsedResponse": {
      "kind": "button_reply",
      "id": "confirm",
      "title": "Confirm"
    }
  }
}
```

## 11.2 Flow submission ingest example
```json
POST /webhooks/flows
{
  "flow_id": "f6b6a9d0-b2be-44bc-9a3f-c2ee18dcf809",
  "version": 2,
  "organization_id": "org_demo_001",
  "meta_business_account_id": "1846008296268872",
  "meta_app_id": "123456789012345",
  "user_phone": "+14155550123",
  "answers": {
    "full_name": "Alex Carter",
    "email": "alex@example.com",
    "budget": "1k_5k"
  },
  "status": "RECEIVED",
  "source": "WHATSAPP",
  "external_reference": "wa_msg_12345"
}
```

## 11.3 Outbound webhook payload for flow submission
```json
{
  "eventId": "8c2652a5-530f-4728-bf2f-c1b88f6f3f11",
  "eventType": "flow.submission.received",
  "eventKey": "flow.submission:7ad8f1a1-7f76-4a1b-9a9a-a9bc80f8dca4",
  "occurredAt": "2026-02-12T11:20:11.000Z",
  "tenant": {
    "organizationId": "org_demo_001",
    "metaBusinessAccountId": "1846008296268872",
    "metaAppId": "123456789012345"
  },
  "data": {
    "submissionId": "7ad8f1a1-7f76-4a1b-9a9a-a9bc80f8dca4",
    "flowId": "f6b6a9d0-b2be-44bc-9a3f-c2ee18dcf809",
    "version": 2,
    "userPhone": "+14155550123",
    "status": "RECEIVED",
    "answers": {
      "full_name": "Alex Carter",
      "email": "alex@example.com"
    },
    "mappedResponse": {
      "lead": {
        "name": "Alex Carter",
        "email": "alex@example.com"
      }
    }
  }
}
```

## 11.4 Example outbound webhook headers
```text
Content-Type: application/json
Authorization: Bearer <token-if-configured>
X-Webhook-Event: flow.submission.received
X-Webhook-Event-Id: 8c2652a5-530f-4728-bf2f-c1b88f6f3f11
X-Webhook-Event-Key: flow.submission:7ad8f1a1-7f76-4a1b-9a9a-a9bc80f8dca4
X-Webhook-Timestamp: 1739350211
Idempotency-Key: flow.submission:7ad8f1a1-7f76-4a1b-9a9a-a9bc80f8dca4
X-Webhook-Signature: sha256=<hmac-sha256>
```

## 12. Idempotency strategy

Producer side:
- unique key on tenant + event type + event key (`tenant_webhook_events`)
- unique callback event key (`whatsapp_template_callback_events`)

Consumer side (recommended):
- dedupe by `Idempotency-Key` / `X-Webhook-Event-Key`
- persist processed keys with TTL or permanent table

## 13. Error model and common codes

Response shape:
```json
{
  "success": false,
  "error": {
    "code": "TENANT_CONTEXT_MISSING",
    "message": "Tenant context is incomplete",
    "details": {
      "missing": ["organizationId"]
    },
    "requestId": "67ea8ea7-3b8a-4d73-a186-575257d83fbe"
  }
}
```

High-frequency codes:
- `TENANT_CONTEXT_MISSING`
- `AUTH_TOKEN_MISSING`
- `AUTH_INVALID_TOKEN`
- `INVALID_TEMPLATE_PAYLOAD`
- `TEMPLATE_NOT_FOUND`
- `META_API_ERROR`
- `META_API_UNREACHABLE`
- `FLOW_VALIDATION_FAILED`
- `FLOW_SUBMISSION_VALIDATION_FAILED`
- `INVALID_WEBHOOK_URL`
- `INVALID_WEBHOOK_AUTH_TYPE`
- `WEBHOOK_CONFIG_NOT_FOUND`
- `WEBHOOK_EVENT_NOT_FOUND`

## 14. Versioning logic

### WhatsApp templates
Approval state is externalized to Meta and synchronized by:
- `POST /api/templates/:uuid/publish`
- `POST /api/templates/sync`

### Flow templates
- each update creates a new draft version
- publish sets current published version
- previous published version is archived

## 15. Extensibility

### Flow components/actions (data-driven)
Add component/action types by DB entries:
- `flow_component_definitions`
- `flow_action_definitions`

### New outbound event types
- add event type constant
- enqueue from service where needed
- tenant subscribes via `eventTypes`

## 16. Troubleshooting checklist

### Publish/sync failing
- check template exists for tenant and `meta_template_id` is set
- verify Meta access token and Graph version configuration
- inspect `META_API_ERROR.details.metaError`

### Callback events missing tenant
- verify active webhook config exists for callback `entry.id` (WABA id)
- avoid duplicate active configs using same `meta_business_account_id`
- inspect callback event row in `whatsapp_template_callback_events`

### Customer webhook not receiving
- verify active config via `GET /api/webhooks/config`
- verify event type subscribed
- inspect `GET /api/webhooks/events`
- inspect `tenant_webhook_delivery_attempts`
- requeue using `POST /api/webhooks/events/:eventId/retry`

### Multi-tenant isolation concern
- verify auth claims/headers tenant values
- verify queries include tenant triple scope

## 17. Integration quick start

1. Configure webhook endpoint (`PUT /api/webhooks/config`)
2. Create template / flow templates
3. Publish/sync approvals
4. Register Meta webhook to `/webhooks/meta`
5. Register flow submission source to `/webhooks/flows`
6. Consume customer webhook events with signature + idempotency validation

## 18. Postman collection

Single complete collection file:
- `Template-Service-Complete.postman_collection.json`

Collection includes:
- health
- tenant webhook config + event retry
- all template APIs with sample payloads for standard/authentication/carousel/flow template types
- flow template engine APIs (create/list/get/update/publish/clone/delete clone)
- inbound webhook simulations (`/webhooks/meta`, `/webhooks/flows`)

Recommended run order:
1. Configure collection variables (`base_url`, `jwt_token`, tenant ids).
2. Run `Webhook Config (Tenant)` -> `Upsert Webhook Config`.
3. Run template creation requests for each type.
4. Run publish/sync requests.
5. Run flow create -> publish -> webhook simulation.
6. Run inbound webhook simulation folder.
7. Run optional template delete requests for cleanup.
