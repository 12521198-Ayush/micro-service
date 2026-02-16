# WhatsApp Business Platform - Complete API Reference

## Overview

This document provides a complete API reference for all microservices in the WhatsApp Business Platform.

## Base URLs

| Service | Port | Base URL |
|---------|------|----------|
| User Service | 3000 | `/user-service/api` |
| Contact Service | 3002 | `/contact-service/api` |
| Campaign Service | 3003 | `/campaign-service/api` |
| Template Service | 3004 | `/template-service/api` |
| Team Service | 3005 | `/team-service/api` |
| WhatsApp Service | 3006 | `/whatsapp-service/api` |
| Kafka Service | 3007 | `/api` |

---

## 1. User Service APIs

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | User logout |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |
| GET | `/auth/me` | Get current user profile |
| PUT | `/auth/profile` | Update user profile |
| PUT | `/auth/change-password` | Change password |

### Organization

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/organization` | Get organization details |
| PUT | `/organization` | Update organization |
| POST | `/organization/invite` | Invite team member |

### Wallet

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wallet/balance` | Get wallet balance |
| POST | `/wallet/add-funds` | Add funds to wallet |
| GET | `/wallet/transactions` | Get transaction history |

### Embedded Signup (WhatsApp Business Account)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/embedded-signup/initialize` | Initialize signup session |
| POST | `/embedded-signup/callback` | Handle OAuth callback |
| POST | `/embedded-signup/complete` | Complete signup with WABA details |
| GET | `/embedded-signup/accounts` | Get connected WABA accounts |
| DELETE | `/embedded-signup/accounts/:wabaId` | Disconnect WABA account |
| POST | `/embedded-signup/accounts/:wabaId/refresh-token` | Refresh access token |
| GET | `/embedded-signup/phone/:phoneNumberId/status` | Get phone number status |
| GET | `/embedded-signup/accounts/:wabaId/verification` | Get verification status |

---

## 2. Contact Service APIs

### Contacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/contacts` | Create contact |
| GET | `/contacts` | List contacts |
| GET | `/contacts/:id` | Get contact by ID |
| PUT | `/contacts/:id` | Update contact |
| DELETE | `/contacts/:id` | Delete contact |
| POST | `/contacts/import` | Bulk import contacts |
| POST | `/contacts/export` | Export contacts |

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/groups` | Create group |
| GET | `/groups` | List groups |
| GET | `/groups/:id` | Get group by ID |
| PUT | `/groups/:id` | Update group |
| DELETE | `/groups/:id` | Delete group |
| POST | `/groups/:id/contacts` | Add contacts to group |
| DELETE | `/groups/:id/contacts` | Remove contacts from group |
| GET | `/groups/:id/contacts` | Get group contacts |

---

## 3. Campaign Service APIs

### Campaigns CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/campaigns` | Create campaign |
| GET | `/campaigns` | List campaigns |
| GET | `/campaigns/:id` | Get campaign by ID |
| PUT | `/campaigns/:id` | Update campaign |
| DELETE | `/campaigns/:id` | Delete campaign |

### Campaign Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/campaigns/:id/execute` | Start campaign |
| POST | `/campaigns/:id/pause` | Pause campaign |
| POST | `/campaigns/:id/resume` | Resume campaign |
| POST | `/campaigns/:id/cancel` | Cancel campaign |
| POST | `/campaigns/:id/schedule` | Schedule campaign |

### Campaign Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/campaigns/:id/analytics` | Get campaign analytics |
| GET | `/campaigns/:id/messages` | Get campaign message log |

---

## 4. Template Service APIs

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/templates` | Create template |
| GET | `/templates` | List templates |
| GET | `/templates/:id` | Get template by ID |
| PUT | `/templates/:id` | Update template |
| DELETE | `/templates/:id` | Delete template |
| POST | `/templates/:id/submit` | Submit template for approval |
| GET | `/templates/sync` | Sync templates from Meta |

---

## 5. Team Service APIs

### Team Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/team` | List team members |
| POST | `/team/invite` | Invite team member |
| PUT | `/team/:id` | Update team member |
| DELETE | `/team/:id` | Remove team member |
| PUT | `/team/:id/role` | Update member role |

### Roles & Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/roles` | List roles |
| POST | `/roles` | Create role |
| PUT | `/roles/:id` | Update role |
| DELETE | `/roles/:id` | Delete role |

---

## 6. WhatsApp Service APIs

### Text Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/whatsapp/messages/text` | Send text message |

**Request Body:**
```json
{
  "to": "1234567890",
  "text": "Hello, World!",
  "previewUrl": false
}
```

### Template Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/whatsapp/messages/template` | Send template message |

**Request Body:**
```json
{
  "to": "1234567890",
  "templateName": "hello_world",
  "language": "en",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "John" }
      ]
    }
  ]
}
```

### Media Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/whatsapp/messages/image` | Send image |
| POST | `/whatsapp/messages/video` | Send video |
| POST | `/whatsapp/messages/audio` | Send audio |
| POST | `/whatsapp/messages/document` | Send document |
| POST | `/whatsapp/messages/sticker` | Send sticker |

**Image Request Body:**
```json
{
  "to": "1234567890",
  "imageUrl": "https://example.com/image.jpg",
  "caption": "Check this out!"
}
```

### Location Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/whatsapp/messages/location` | Send location |

**Request Body:**
```json
{
  "to": "1234567890",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "name": "San Francisco",
  "address": "California, USA"
}
```

### Contact Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/whatsapp/messages/contact` | Send contact card |

### Interactive Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/whatsapp/messages/interactive/buttons` | Send button message |
| POST | `/whatsapp/messages/interactive/list` | Send list message |
| POST | `/whatsapp/messages/interactive/cta-url` | Send CTA URL button |
| POST | `/whatsapp/messages/interactive/location-request` | Request location |
| POST | `/whatsapp/messages/interactive/flow` | Send WhatsApp Flow |

**Button Message Request:**
```json
{
  "to": "1234567890",
  "body": "Please choose an option:",
  "buttons": [
    { "id": "btn1", "title": "Option 1" },
    { "id": "btn2", "title": "Option 2" },
    { "id": "btn3", "title": "Option 3" }
  ],
  "header": { "type": "text", "text": "Welcome" },
  "footer": "Powered by WhatsApp"
}
```

**List Message Request:**
```json
{
  "to": "1234567890",
  "body": "Browse our menu:",
  "buttonText": "View Menu",
  "sections": [
    {
      "title": "Food",
      "rows": [
        { "id": "pizza", "title": "Pizza", "description": "$10" },
        { "id": "burger", "title": "Burger", "description": "$8" }
      ]
    }
  ]
}
```

### Reactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/whatsapp/messages/reaction` | Send reaction |

**Request Body:**
```json
{
  "to": "1234567890",
  "messageId": "wamid.xxx",
  "emoji": "👍"
}
```

### Message Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/whatsapp/messages/mark-read` | Mark as read |
| GET | `/whatsapp/messages` | Get message history |
| GET | `/whatsapp/messages/:id` | Get message by ID |

### Media Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/whatsapp/media/upload` | Upload media |
| GET | `/whatsapp/media/:mediaId` | Get media URL |
| GET | `/whatsapp/media/:mediaId/download` | Download media |
| DELETE | `/whatsapp/media/:mediaId` | Delete media |

### Phone Number Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/whatsapp/phone-numbers` | List phone numbers |
| GET | `/whatsapp/phone-numbers/:id` | Get phone number info |
| POST | `/whatsapp/phone-numbers/:id/request-code` | Request verification code |
| POST | `/whatsapp/phone-numbers/:id/verify-code` | Verify code |
| POST | `/whatsapp/phone-numbers/:id/register` | Register phone number |
| POST | `/whatsapp/phone-numbers/:id/deregister` | Deregister phone number |
| POST | `/whatsapp/phone-numbers/:id/set-pin` | Set 2FA PIN |
| GET | `/whatsapp/phone-numbers/:id/profile` | Get business profile |
| PUT | `/whatsapp/phone-numbers/:id/profile` | Update business profile |
| GET | `/whatsapp/phone-numbers/:id/commerce` | Get commerce settings |
| PUT | `/whatsapp/phone-numbers/:id/commerce` | Update commerce settings |

### Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/whatsapp/webhook` | Verify webhook (Meta) |
| POST | `/whatsapp/webhook` | Receive webhook events |
| GET | `/whatsapp/webhook/status` | Get webhook status |

---

## 7. Kafka Service APIs

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Get service metrics |

### Testing Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trigger-campaign` | Trigger campaign (testing) |
| POST | `/api/queue-message` | Queue message (testing) |
| POST | `/api/webhook-event` | Process webhook event |

---

## Kafka Topics

| Topic | Description |
|-------|-------------|
| `campaign.events` | Campaign lifecycle events (start, pause, resume, cancel) |
| `message.queue` | Messages to be sent via WhatsApp API |
| `message.status` | Message delivery status updates |
| `webhook.events` | Incoming webhook events from Meta |
| `campaign.analytics` | Campaign analytics events |
| `dead-letter.queue` | Failed messages for retry/investigation |

---

## Rate Limits

### WhatsApp API Limits

| Limit Type | Value | Description |
|------------|-------|-------------|
| Per Phone Number | 80 msg/sec | Maximum messages per second |
| Per Recipient Pair | 1 msg/6 sec | Same phone to same recipient |
| Burst Limit | 45 messages | Maximum burst without wait |
| Template Limit | Varies | Based on quality rating |

### API Rate Limits (per user)

| Endpoint Type | Limit |
|---------------|-------|
| Read operations | 1000/min |
| Write operations | 100/min |
| Message sending | 1000/min |

---

## Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### WhatsApp Error Codes

| Code | Description |
|------|-------------|
| 130429 | Rate limit hit |
| 131048 | Spam rate limit hit |
| 131047 | Re-engagement message time limit exceeded |
| 132000 | Template not found |
| 132001 | Template paused |
| 132007 | Template parameter mismatch |

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Obtain a token via the `/user-service/api/auth/login` endpoint.

---

## Webhook Events

### Message Status Updates

```json
{
  "event": "status_update",
  "whatsappMessageId": "wamid.xxx",
  "status": "delivered",
  "recipientId": "1234567890",
  "timestamp": 1704067200000
}
```

### Incoming Messages

```json
{
  "event": "incoming_message",
  "whatsappMessageId": "wamid.xxx",
  "from": "1234567890",
  "type": "text",
  "content": { "text": "Hello" },
  "timestamp": 1704067200000
}
```

---

## Quick Start

1. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Meta credentials
   ```

2. **Start Services**
   ```bash
   docker-compose up -d
   ```

3. **Connect WhatsApp Account**
   - Navigate to Settings > WhatsApp Setup
   - Click "Connect WhatsApp Account"
   - Complete the Facebook Embedded Signup flow

4. **Send First Message**
   ```bash
   curl -X POST http://localhost/whatsapp-service/api/whatsapp/messages/text \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"to": "1234567890", "text": "Hello!"}'
   ```
