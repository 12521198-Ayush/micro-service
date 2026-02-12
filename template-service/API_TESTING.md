# Template Service API Testing Guide

## Base URL
`http://localhost:3003/api/templates`

## Authentication
All template endpoints require a bearer token.

`Authorization: Bearer <JWT_TOKEN>`

Token payload should include:
- `id` or `userId`
- `metaBusinessAccountId` (recommended; fallback uses `META_BUSINESS_ACCOUNT_ID` from env)
- `metaAppId` (recommended; fallback uses `META_APP_ID` from env)

## Health Check
### GET `/health`
Checks service and dependencies.

```bash
curl http://localhost:3003/health
```

---

## 1. Capabilities
### GET `/api/templates/capabilities`
Returns supported categories, template types, components, and button types.

```bash
curl -X GET http://localhost:3003/api/templates/capabilities \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 2. Validate Payload (No Meta Write)
### POST `/api/templates/validate`
Validates and normalizes a template payload.

```bash
curl -X POST http://localhost:3003/api/templates/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "promo_template",
    "category": "MARKETING",
    "language": "en_US",
    "components": [
      {"type":"BODY","text":"Hello {{1}}"}
    ]
  }'
```

---

## 3. Upload Media (Multipart, Get header_handle)
### POST `/api/templates/media/upload`
Uploads a local file via `multipart/form-data` and returns `header_handle` ready for template payloads.

Supported `file` MIME types:
- `image/jpeg`
- `image/jpg`
- `image/png`
- `video/mp4`
- `application/pdf`

Form fields:
- `file` (required, file field)
- `fileName` (optional, overrides original filename)
- `fileType` (optional, overrides MIME type)

```bash
curl -X POST http://localhost:3003/api/templates/media/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@C:/path/to/banner.jpg" \
  -F "fileName=banner.jpg"
```

Example response shape:
```json
{
  "success": true,
  "data": {
    "headerHandle": "<UPLOADED_FILE_HANDLE>",
    "header_handle": "<UPLOADED_FILE_HANDLE>",
    "example": {
      "header_handle": ["<UPLOADED_FILE_HANDLE>"]
    }
  }
}
```

---

## 4. Create Template
### POST `/api/templates`
### Legacy Alias: POST `/api/templates/create`
Creates a template in Meta and stores it locally.

### Example: Standard Template
```bash
curl -X POST http://localhost:3003/api/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "welcome_offer_standard",
    "category": "MARKETING",
    "language": "en_US",
    "components": [
      {
        "type":"BODY",
        "text":"Hello {{1}}, welcome!",
        "example":{"body_text":[["Rahul"]]}
      },
      {
        "type":"BUTTONS",
        "buttons":[{"type":"URL","text":"View","url":"https://example.com/promo"}]
      }
    ]
  }'
```

### Example: Carousel Template
```bash
curl -X POST http://localhost:3003/api/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "new_arrivals_carousel",
    "category": "MARKETING",
    "language": "en_US",
    "components": [
      {
        "type":"BODY",
        "text":"Check our latest arrivals"
      },
      {
        "type": "CAROUSEL",
        "cards": [
          {
            "components": [
              {
                "type":"HEADER",
                "format":"IMAGE",
                "example":{"header_handle":["4::aW1hZ2UvanBlZw==:ARa..."]}
              },
              {"type":"BODY","text":"Great product"},
              {
                "type":"BUTTONS",
                "buttons":[{"type":"URL","text":"View","url":"https://example.com/item-1"}]
              }
            ]
          },
          {
            "components": [
              {
                "type":"HEADER",
                "format":"IMAGE",
                "example":{"header_handle":["4::aW1hZ2UvanBlZw==:ARb..."]}
              },
              {"type":"BODY","text":"Another great product"},
              {
                "type":"BUTTONS",
                "buttons":[{"type":"URL","text":"View","url":"https://example.com/item-2"}]
              }
            ]
          }
        ]
      }
    ]
  }'
```
Note: Replace `example.header_handle` values with real media handles from Meta upload APIs.

### Example: Flow Template
```bash
curl -X POST http://localhost:3003/api/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "lead_capture_flow",
    "category": "UTILITY",
    "language": "en_US",
    "components": [
      {"type":"BODY","text":"Continue in flow"},
      {
        "type":"BUTTONS",
        "buttons":[{"type":"FLOW","text":"Start","flow_id":"123456"}]
      }
    ]
  }'
```

### Example: Authentication Template
```bash
curl -X POST http://localhost:3003/api/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "otp_login_template",
    "category": "AUTHENTICATION",
    "language": "en_US",
    "components": [
      {"type":"BODY","add_security_recommendation":true},
      {
        "type":"BUTTONS",
        "buttons":[{"type":"OTP","otp_type":"COPY_CODE","text":"Copy code"}]
      }
    ]
  }'
```

---

## 5. List Templates
### GET `/api/templates`
### Legacy Alias: POST `/api/templates/list`

Filters:
- `status`
- `category`
- `templateType`
- `language`
- `search`
- `limit`
- `offset`

```bash
curl -X GET "http://localhost:3003/api/templates?status=APPROVED&templateType=FLOW&limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 6. Get Template by UUID
### GET `/api/templates/:uuid`

```bash
curl -X GET http://localhost:3003/api/templates/TEMPLATE_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 7. Update Template
### PATCH `/api/templates/:uuid`
### Legacy Alias: POST `/api/templates/update/:uuid`

```bash
curl -X PATCH http://localhost:3003/api/templates/TEMPLATE_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "components": [
      {"type":"BODY","text":"Updated body text"}
    ]
  }'
```

---

## 8. Delete Template
### DELETE `/api/templates/:uuid`

```bash
curl -X DELETE http://localhost:3003/api/templates/TEMPLATE_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 9. Sync Templates from Meta
### POST `/api/templates/sync`

```bash
curl -X POST http://localhost:3003/api/templates/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Status Codes
- `200` Success
- `201` Created
- `400` Invalid request
- `401` Unauthorized
- `404` Not found
- `409` Conflict
- `422` Validation error
- `500` Internal error

---

## Backward Compatibility
The service still supports previous aliases:
- `POST /api/templates/create`
- `POST /api/templates/list`
- `POST /api/templates/update/:uuid`
- `POST /api/templates/sync`

Use new REST endpoints for all new integrations.
