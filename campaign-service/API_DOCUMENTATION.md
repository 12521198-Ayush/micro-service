# Campaign Service — API Documentation

> **Base URL:** `http://localhost:3003/api/campaigns`
> **Production:** `https://backend.nyife.chat/campaign-service/api/campaigns`
> **Port:** `3003`
> **Authentication:** All endpoints require a valid JWT Bearer token in the `Authorization` header.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Campaign Lifecycle](#campaign-lifecycle)
3. [Endpoints](#endpoints)
   - [Create Campaign](#1-create-campaign)
   - [List Campaigns](#2-list-campaigns)
   - [Get Campaign](#3-get-campaign)
   - [Update Campaign](#4-update-campaign)
   - [Delete Campaign](#5-delete-campaign)
   - [Execute Campaign](#6-execute-campaign)
   - [Pause Campaign](#7-pause-campaign)
   - [Resume Campaign](#8-resume-campaign)
   - [Cancel Campaign](#9-cancel-campaign)
   - [Schedule Campaign](#10-schedule-campaign)
   - [Get Campaign Analytics](#11-get-campaign-analytics)
   - [Get Campaign Messages](#12-get-campaign-messages)
4. [Database Schema](#database-schema)
5. [Metadata JSON Structure](#metadata-json-structure)
6. [Error Responses](#error-responses)
7. [Caching Behaviour](#caching-behaviour)

---

## Authentication

All requests must include:

```
Authorization: Bearer <JWT_TOKEN>
```

The JWT is issued by the **user-service** and contains `id` (or `userId`) identifying the authenticated user. Campaigns are scoped per user — a user can only access their own campaigns.

---

## Campaign Lifecycle

```
 ┌───────┐   schedule    ┌───────────┐   scheduler/execute   ┌─────────┐
 │ draft │──────────────►│ scheduled │──────────────────────►│ running │
 └───────┘               └───────────┘                       └────┬────┘
     │                        │                                   │
     │       execute          │          cancel                   ├── pause ──► paused ── resume ──┐
     └────────────────────────┼───────────────────────────────────┤                                │
                              │                                   │◄───────────────────────────────┘
                              │          cancel                   │
                              └───────────────────────────────────┤
                                                                  │
                                            all messages done ──► completed
                                            error ──────────────► failed
                                            cancel ─────────────► cancelled
```

**Valid statuses:** `draft` | `scheduled` | `running` | `completed` | `failed` | `paused` | `cancelled`

---

## Endpoints

### 1. Create Campaign

Create a new campaign in **draft** status (or a custom initial status).

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/campaigns` |

#### Request Body

```json
{
  "name": "Diwali Offer 2024",
  "description": "Festival promotional campaign",
  "templateId": "uuid-of-whatsapp-template",
  "groupId": 5,
  "scheduledAt": "2024-11-01T10:00:00.000Z",
  "status": "draft",
  "metadata": {
    "wabaId": "123456789012345",
    "phoneNumberId": "109876543210987",
    "bodyParameters": {
      "discount": "25%"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "25%" }
        ]
      }
    ]
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Campaign name |
| `description` | string | ❌ | Optional description |
| `templateId` | string (UUID) | ✅ | WhatsApp message template UUID from template-service |
| `groupId` | integer | ✅ | Contact group ID from contact-service |
| `scheduledAt` | ISO 8601 string | ❌ | Schedule time (UTC). If provided and status is `scheduled`, the scheduler will auto-execute it. |
| `status` | string | ❌ | Initial status. Defaults to `draft`. |
| `metadata` | object | ❌ | JSON object with WABA, phone, template parameter details (see [Metadata](#metadata-json-structure)) |

> **Note:** The service auto-fetches `template_name` from template-service and `group_name` from contact-service using the provided IDs.

#### Response `201 Created`

```json
{
  "success": true,
  "message": "Campaign created successfully",
  "data": {
    "id": 21,
    "userId": 1,
    "name": "Diwali Offer 2024",
    "description": "Festival promotional campaign",
    "templateId": "uuid-of-whatsapp-template",
    "template_name": "diwali_offer_v2",
    "groupId": 5,
    "group_name": "Premium Customers",
    "scheduledAt": "2024-11-01T10:00:00.000Z",
    "status": "draft",
    "metadata": "{...}"
  }
}
```

---

### 2. List Campaigns

Get paginated list of campaigns for the authenticated user.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/campaigns` |

#### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | string | `""` (all) | Filter by status: `draft`, `scheduled`, `running`, `completed`, `failed`, `paused`, `cancelled` |
| `page` | integer | `1` | Page number |
| `limit` | integer | `10` | Items per page |

#### Response `200 OK`

```json
{
  "success": true,
  "count": 5,
  "total": 21,
  "totalPages": 3,
  "currentPage": 1,
  "data": [
    {
      "id": 21,
      "user_id": 1,
      "name": "Diwali Offer 2024",
      "description": "Festival promotional campaign",
      "template_id": "uuid-of-template",
      "template_name": "diwali_offer_v2",
      "group_id": 5,
      "group_name": "Premium Customers",
      "scheduled_at": "2024-11-01T10:00:00.000Z",
      "started_at": null,
      "completed_at": null,
      "status": "draft",
      "sent_count": 0,
      "failed_count": 0,
      "total_recipients": 0,
      "delivered_count": 0,
      "read_count": 0,
      "metadata": { "wabaId": "...", "phoneNumberId": "..." },
      "created_at": "2024-10-25T08:30:00.000Z",
      "updated_at": "2024-10-25T08:30:00.000Z"
    }
  ]
}
```

> **Caching:** 30-second TTL via Redis. Response includes `"cached": true` when served from cache.

---

### 3. Get Campaign

Get a single campaign by ID.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/campaigns/:id` |

#### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | integer | Campaign ID |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 21,
    "user_id": 1,
    "name": "Diwali Offer 2024",
    "description": "Festival promotional campaign",
    "template_id": "uuid-of-template",
    "template_name": "diwali_offer_v2",
    "group_id": 5,
    "group_name": "Premium Customers",
    "scheduled_at": "2024-11-01T10:00:00.000Z",
    "started_at": "2024-11-01T10:00:05.000Z",
    "completed_at": "2024-11-01T10:01:30.000Z",
    "status": "completed",
    "sent_count": 150,
    "failed_count": 2,
    "total_recipients": 152,
    "delivered_count": 148,
    "read_count": 95,
    "metadata": { "wabaId": "...", "phoneNumberId": "...", "components": [...] },
    "created_at": "2024-10-25T08:30:00.000Z",
    "updated_at": "2024-11-01T10:01:30.000Z"
  }
}
```

> **Caching:** 600-second TTL. Cache is **skipped** for campaigns with `status = 'running'` (they update frequently).

#### Error `404 Not Found`

```json
{ "success": false, "error": "Campaign not found" }
```

---

### 4. Update Campaign

Update any campaign fields.

| | |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/campaigns/:id` |

#### Request Body

Any subset of campaign fields:

```json
{
  "name": "Updated Campaign Name",
  "description": "Updated description",
  "status": "draft"
}
```

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Campaign updated successfully",
  "data": { /* full updated campaign object */ }
}
```

---

### 5. Delete Campaign

Delete a campaign and all associated logs (cascade).

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/campaigns/:id` |

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

---

### 6. Execute Campaign

Start sending messages for a campaign. This is the primary action endpoint.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/campaigns/:id/execute` |

#### What happens internally:

1. Validates campaign exists and is not already `running` or `completed`.
2. Fetches template details from **template-service** (internal endpoint).
3. Fetches contacts from **contact-service** via the campaign's `group_id`.
4. Resolves WABA account and phone number from **user-service** embedded-signup accounts (matches `metadata.wabaId` or falls back to template's WABA).
5. Sets campaign status to `running`, records `started_at` and `template_name`.
6. Creates a `campaign_log` entry (status `pending`) for each contact.
7. Publishes a **Kafka** `campaign-started` event with all recipients, template info, and WhatsApp credentials.
8. The **kafka-service** message processor then sends each message via the WhatsApp Cloud API.
9. On each success/failure, kafka-service updates `campaign_logs` and campaign counters.
10. When `sent_count + failed_count >= total_recipients`, the campaign is automatically marked `completed` with `completed_at`.

#### Request Body

None required (campaign metadata is read from the DB).

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Campaign execution started",
  "data": {
    "campaignId": 21,
    "totalRecipients": 152,
    "status": "running"
  }
}
```

#### Error Responses

| Status | Condition |
|---|---|
| `400` | Campaign is already running |
| `400` | Campaign has already been executed (completed) |
| `400` | No contacts found in the selected group |
| `400` | No WhatsApp Business Account connected |
| `400` | Selected WABA account is not connected |
| `400` | Selected phone number is not connected to the chosen WABA |
| `400` | No phone number connected to the WhatsApp Business Account |
| `404` | Campaign not found |

---

### 7. Pause Campaign

Pause a running campaign. Pending messages in the Kafka queue will be held.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/campaigns/:id/pause` |

#### Precondition

Campaign `status` must be `running`.

#### Response `200 OK`

```json
{ "success": true, "message": "Campaign paused successfully" }
```

#### Error `400`

```json
{ "success": false, "error": "Campaign is not running" }
```

---

### 8. Resume Campaign

Resume a paused campaign.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/campaigns/:id/resume` |

#### Precondition

Campaign `status` must be `paused`.

#### Response `200 OK`

```json
{ "success": true, "message": "Campaign resumed successfully" }
```

#### Error `400`

```json
{ "success": false, "error": "Campaign is not paused" }
```

---

### 9. Cancel Campaign

Cancel a campaign. Can cancel campaigns that are `running`, `paused`, or `scheduled`.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/campaigns/:id/cancel` |

#### Precondition

Campaign `status` must be one of: `running`, `paused`, `scheduled`.

#### Response `200 OK`

```json
{ "success": true, "message": "Campaign cancelled successfully" }
```

#### Error `400`

```json
{ "success": false, "error": "Campaign cannot be cancelled" }
```

---

### 10. Schedule Campaign

Schedule a campaign for future execution. The **kafka-service** scheduler (cron, every minute) picks up scheduled campaigns and auto-executes them.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/campaigns/:id/schedule` |

#### Precondition

Campaign `status` must be `draft` or `scheduled` (for rescheduling).

#### Request Body

```json
{
  "scheduledAt": "2024-11-01T10:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `scheduledAt` | ISO 8601 string | ✅ | Must be a **future** date/time (UTC) |

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Campaign scheduled successfully",
  "data": {
    "campaignId": 21,
    "scheduledAt": "2024-11-01T10:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Condition |
|---|---|
| `400` | `scheduledAt` is missing |
| `400` | Scheduled time is in the past |
| `400` | Campaign is not in `draft` or `scheduled` status |

---

### 11. Get Campaign Analytics

Get aggregate analytics for a campaign.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/campaigns/:id/analytics` |
| **Alias** | `/api/campaigns/:id/stats` |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "campaignId": 21,
    "campaignName": "Diwali Offer 2024",
    "status": "completed",
    "totalRecipients": 152,
    "total_recipients": 152,
    "sent_count": 150,
    "delivered_count": 148,
    "read_count": 95,
    "failed_count": 2,
    "pending_count": 0,
    "deliveryRate": "98.67",
    "readRate": "64.19",
    "failureRate": "1.33"
  }
}
```

| Metric | Formula |
|---|---|
| `deliveryRate` | `(delivered_count / sent_count) × 100` |
| `readRate` | `(read_count / delivered_count) × 100` |
| `failureRate` | `(failed_count / sent_count) × 100` |

> **Caching:** 60-second TTL.

---

### 12. Get Campaign Messages

Get paginated message log for a campaign (one row per recipient).

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/campaigns/:id/messages` |

#### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | string | all | Filter: `pending`, `sent`, `delivered`, `failed`, `read` |
| `page` | integer | `1` | Page number |
| `limit` | integer | `50` | Items per page |

#### Response `200 OK`

```json
{
  "success": true,
  "count": 2,
  "total": 152,
  "totalPages": 4,
  "currentPage": 1,
  "data": [
    {
      "id": 1001,
      "campaign_id": 21,
      "contact_id": 45,
      "contact_name": "John Doe",
      "phone_number": "919876543210",
      "status": "delivered",
      "message_id": "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQzJGN0MyMz...",
      "error_message": null,
      "whatsapp_response": {
        "messaging_product": "whatsapp",
        "contacts": [{ "input": "919876543210", "wa_id": "919876543210" }],
        "messages": [{ "id": "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQzJGN0MyMz..." }]
      },
      "template_name": "diwali_offer_v2",
      "phone_number_id": "109876543210987",
      "waba_id": "123456789012345",
      "retry_count": 0,
      "sent_at": "2024-11-01T10:00:10.000Z",
      "delivered_at": "2024-11-01T10:00:12.000Z",
      "read_at": "2024-11-01T10:05:30.000Z",
      "created_at": "2024-11-01T10:00:05.000Z",
      "updated_at": "2024-11-01T10:05:30.000Z"
    }
  ]
}
```

---

## Database Schema

### `campaigns` table

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | INT (PK, AI) | NO | — | Campaign ID |
| `user_id` | INT | NO | — | Owner user ID (indexed) |
| `name` | VARCHAR(255) | NO | — | Campaign name |
| `description` | TEXT | YES | NULL | Description |
| `template_id` | VARCHAR(255) | YES | NULL | WhatsApp template UUID |
| `template_name` | VARCHAR(255) | YES | NULL | Template name (auto-fetched) |
| `group_id` | INT | YES | NULL | Contact group ID |
| `group_name` | VARCHAR(255) | YES | NULL | Group name (auto-fetched) |
| `scheduled_at` | DATETIME | YES | NULL | Scheduled execution time (UTC) |
| `started_at` | TIMESTAMP | YES | NULL | Actual execution start time |
| `completed_at` | TIMESTAMP | YES | NULL | Time when all messages were processed |
| `status` | ENUM | YES | `draft` | `draft`, `scheduled`, `running`, `completed`, `failed`, `paused`, `cancelled` |
| `sent_count` | INT | YES | 0 | Successfully sent messages |
| `failed_count` | INT | YES | 0 | Failed messages |
| `total_recipients` | INT | YES | 0 | Total contacts in the campaign |
| `delivered_count` | INT | YES | 0 | Messages confirmed delivered |
| `read_count` | INT | YES | 0 | Messages confirmed read |
| `metadata` | JSON | YES | NULL | WABA ID, phone number ID, template components (see below) |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Row creation time |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP (on update) | Last modified time |

**Indexes:** `idx_user_id(user_id)`, `idx_status(status)`, `idx_scheduled_at(scheduled_at)`

### `campaign_logs` table

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | INT (PK, AI) | NO | — | Log entry ID |
| `campaign_id` | INT (FK) | NO | — | References `campaigns.id` (CASCADE delete) |
| `contact_id` | INT | YES | NULL | Contact ID from contact-service |
| `contact_name` | VARCHAR(255) | YES | NULL | Recipient name |
| `phone_number` | VARCHAR(20) | YES | NULL | Full phone number (with country code) |
| `status` | ENUM | YES | `pending` | `pending`, `sent`, `delivered`, `failed`, `read` |
| `message_id` | VARCHAR(255) | YES | NULL | WhatsApp message ID (`wamid.xxx`) |
| `error_message` | TEXT | YES | NULL | Error details on failure |
| `whatsapp_response` | JSON | YES | NULL | Full WhatsApp Cloud API response (see below) |
| `template_name` | VARCHAR(255) | YES | NULL | Template name used for this message |
| `phone_number_id` | VARCHAR(100) | YES | NULL | WhatsApp phone number ID used to send |
| `waba_id` | VARCHAR(100) | YES | NULL | WABA ID used to send |
| `retry_count` | INT | YES | 0 | Number of retry attempts |
| `sent_at` | TIMESTAMP | YES | NULL | When the message was sent |
| `delivered_at` | TIMESTAMP | YES | NULL | When delivery was confirmed |
| `read_at` | TIMESTAMP | YES | NULL | When the message was read |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Row creation time |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP (on update) | Last modified time |

**Indexes:** `idx_campaign_id(campaign_id)`, `idx_status(status)`
**Foreign Key:** `campaign_id → campaigns(id) ON DELETE CASCADE`

---

## Metadata JSON Structure

The `metadata` column on the `campaigns` table stores a JSON object with the following shape:

```json
{
  "wabaId": "123456789012345",
  "phoneNumberId": "109876543210987",
  "bodyParameters": {
    "discount": "25%",
    "product": "Premium Plan"
  },
  "components": [
    {
      "type": "header",
      "parameters": [
        { "type": "image", "image": { "link": "https://example.com/banner.jpg" } }
      ]
    },
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "25%" },
        { "type": "text", "text": "Premium Plan" }
      ]
    },
    {
      "type": "button",
      "sub_type": "url",
      "index": "0",
      "parameters": [
        { "type": "text", "text": "ORDER123" }
      ]
    }
  ]
}
```

| Field | Description |
|---|---|
| `wabaId` | WhatsApp Business Account ID to send from |
| `phoneNumberId` | Phone number ID to send from |
| `bodyParameters` | Key-value pairs for dynamic template variables |
| `components` | WhatsApp Cloud API template component parameters (header, body, buttons) |

---

## WhatsApp Response JSON

The `whatsapp_response` column in `campaign_logs` stores the full response from the WhatsApp Cloud API:

### Successful Send

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    { "input": "919876543210", "wa_id": "919876543210" }
  ],
  "messages": [
    { "id": "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQzJGN0MyMz..." }
  ]
}
```

### Failed Send

```json
{
  "error": "WhatsApp API error: (131047) Re-engagement message",
  "failedAt": "2024-11-01T10:00:15.000Z",
  "retryCount": 3,
  "templateName": "diwali_offer_v2",
  "phoneNumberId": "109876543210987",
  "wabaId": "123456789012345"
}
```

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "success": false,
  "error": "Description of the error"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|---|---|
| `400` | Bad Request — validation failure or invalid state transition |
| `401` | Unauthorized — missing or invalid JWT token |
| `404` | Not Found — campaign does not exist or belongs to another user |
| `500` | Internal Server Error — unexpected server failure |

---

## Caching Behaviour

| Endpoint | Cache Key Pattern | TTL | Notes |
|---|---|---|---|
| `GET /` (list) | `user_campaigns:{userId}:{status}:{page}:{limit}` | 30s | Short TTL; campaigns update in real-time |
| `GET /:id` | `campaign:{userId}:{id}` | 600s | **Skipped** when `status = 'running'` |
| `GET /:id/analytics` | `campaign_analytics:{userId}:{id}` | 60s | Analytics change frequently during execution |

Cache is invalidated on all write operations (create, update, delete, execute, pause, resume, cancel, schedule).

---

## Health Check

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/health` |

```json
{
  "success": true,
  "message": "Campaign Service is running",
  "timestamp": "2024-11-01T10:00:00.000Z"
}
```

---

## Auto-Completion (Kafka Integration)

When a campaign is executing, the **kafka-service** handles:

1. **Message Processing:** Sends each WhatsApp template message via the Cloud API (`v24.0`).
2. **Success Handling:** Updates `campaign_logs` with `message_id`, `whatsapp_response`, `template_name`, `phone_number_id`, `waba_id`, and `sent_at`. Increments `campaigns.sent_count`.
3. **Failure Handling:** Retries with exponential backoff (up to 3 attempts). On permanent failure, saves error metadata and increments `campaigns.failed_count`.
4. **Auto-Completion:** When `sent_count + failed_count >= total_recipients`, the campaign status is automatically set to `completed` and `completed_at` is recorded.
5. **Scheduled Execution:** A cron job (every minute) checks for `scheduled` campaigns where `scheduled_at <= NOW()` and triggers execution via `POST /api/campaigns/:id/execute`.

---

*Last updated: $(date)*
