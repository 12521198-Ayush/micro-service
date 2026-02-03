# Embedded Signup API Documentation

This document describes the Meta Embedded Signup feature implementation for the WhatsApp Business API integration.

## Overview

The Embedded Signup feature allows users to connect their WhatsApp Business Account (WABA) to your platform through a seamless Facebook login flow. This implementation mirrors the functionality from the nyife-dev Laravel project.

## Prerequisites

### Meta Developer Console Setup

1. Create a Facebook App at [developers.facebook.com](https://developers.facebook.com)
2. Add the "WhatsApp Business" product to your app
3. Configure Embedded Signup:
   - Go to WhatsApp > Embedded Signup > Configuration
   - Create a new configuration
   - Note the **Config ID** for your environment variables
4. Get your App credentials:
   - **App ID**: Found in App Dashboard > Settings > Basic
   - **App Secret**: Found in App Dashboard > Settings > Basic (click "Show")

### Environment Variables

#### Backend (user-service/.env)
```env
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_EMBEDDED_SIGNUP_CONFIG_ID=your_config_id
META_REDIRECT_URI=https://your-domain.com/auth/facebook/callback
WEBHOOK_BASE_URL=https://your-backend-domain.com
GRAPH_API_VERSION=v24.0
```

#### Frontend (.env)
```env
NEXT_PUBLIC_META_APP_ID=your_meta_app_id
NEXT_PUBLIC_META_CONFIG_ID=your_config_id
NEXT_PUBLIC_GRAPH_API_VERSION=v24.0
```

## Database Migrations

Run the following migrations before using the embedded signup feature:

```bash
# From user-service directory
mysql -u root -p user_service < database/migration_embedded_signup.sql
mysql -u root -p user_service < database/migration_synced_templates.sql
```

## API Endpoints

### Initialize Signup Session

```
POST /user-service/api/embedded-signup/initialize
```

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "es_123_1234567890",
    "appId": "your_app_id",
    "configId": "your_config_id",
    "sdkConfig": {
      "scope": "whatsapp_business_management,whatsapp_business_messaging",
      "extras": {
        "feature": "whatsapp_embedded_signup",
        "version": 2,
        "sessionInfoVersion": 2
      }
    }
  }
}
```

### Exchange Code (Main Flow)

```
POST /user-service/api/embedded-signup/exchange-code
```

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "code": "authorization_code_from_facebook"
}
```

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp Business Account connected successfully!",
  "data": {
    "wabaId": "123456789",
    "businessName": "Your Business",
    "phoneNumberId": "987654321",
    "displayPhoneNumber": "+1234567890",
    "verifiedName": "Your Business",
    "qualityRating": "GREEN",
    "nameStatus": "APPROVED",
    "messagingLimitTier": "TIER_1K",
    "codeVerificationStatus": "VERIFIED",
    "accountReviewStatus": "APPROVED",
    "businessVerificationStatus": "verified",
    "businessProfile": {
      "about": "Your business description",
      "address": "123 Main St",
      "description": "Full description",
      "email": "contact@yourbusiness.com",
      "profilePictureUrl": null,
      "industry": "RETAIL"
    },
    "webhookUrl": "https://backend.nyife.chat/webhook/whatsapp/org_123",
    "webhookToken": "org_123"
  }
}
```

### Get Connected Accounts

```
GET /user-service/api/embedded-signup/accounts
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "wabaId": "123456789",
      "businessName": "Your Business",
      "currency": "USD",
      "timezoneId": "America/New_York",
      "templateNamespace": "namespace_id",
      "reviewStatus": "APPROVED",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "phoneNumbers": [
        {
          "phoneNumberId": "987654321",
          "displayPhoneNumber": "+1234567890",
          "verifiedName": "Your Business",
          "qualityRating": "GREEN",
          "platformType": "CLOUD_API",
          "status": "CONNECTED"
        }
      ]
    }
  ]
}
```

### Refresh WABA Data

```
POST /user-service/api/embedded-signup/accounts/:wabaId/refresh
```

**Response:**
```json
{
  "success": true,
  "message": "WABA data refreshed successfully",
  "data": {
    "waba": { ... },
    "phoneNumbers": [ ... ]
  }
}
```

### Get Business Profile

```
GET /user-service/api/embedded-signup/phone/:phoneNumberId/business-profile
```

**Response:**
```json
{
  "success": true,
  "data": {
    "phoneNumberId": "987654321",
    "about": "Brief description",
    "address": "123 Main St",
    "description": "Full description",
    "email": "contact@business.com",
    "profilePictureUrl": "https://...",
    "websites": ["https://business.com"],
    "industry": "RETAIL"
  }
}
```

### Update Business Profile

```
POST /user-service/api/embedded-signup/phone/:phoneNumberId/business-profile
```

**Body:**
```json
{
  "about": "Brief description (max 139 chars)",
  "address": "Business address",
  "description": "Full description (max 512 chars)",
  "email": "contact@business.com",
  "industry": "RETAIL",
  "websites": ["https://business.com"]
}
```

### Sync Templates

```
POST /user-service/api/embedded-signup/accounts/:wabaId/sync-templates
```

**Response:**
```json
{
  "success": true,
  "message": "Templates synced successfully",
  "data": {
    "totalSynced": 15,
    "created": 10,
    "updated": 5
  }
}
```

### Override Webhook Callback

```
POST /user-service/api/embedded-signup/accounts/:wabaId/webhook
```

**Body:**
```json
{
  "callbackUrl": "https://your-webhook-url.com/webhook",
  "verifyToken": "your_verify_token"
}
```

### Disconnect Account

```
DELETE /user-service/api/embedded-signup/accounts/:wabaId
```

### Refresh Token

```
POST /user-service/api/embedded-signup/accounts/:wabaId/refresh-token
```

## Frontend Integration

### Facebook SDK Setup

The frontend automatically loads the Facebook SDK and initializes it with your app configuration. The SDK is loaded in the WhatsApp Setup page component.

### Embedded Signup Flow

1. User clicks "Setup WhatsApp" button
2. Frontend calls `/initialize` to get session config
3. Facebook Login popup opens with embedded signup flow
4. User completes the signup on Facebook
5. Frontend receives authorization code
6. Frontend calls `/exchange-code` with the code
7. Backend handles the complete flow:
   - Exchanges code for access token
   - Debugs token to get WABA ID
   - Gets phone number details
   - Registers phone number
   - Subscribes to webhooks
   - Overrides callback URL
   - Saves to database
8. Frontend displays success and connected account details

## Industry Options

| Label | Value |
|-------|-------|
| Automotive | AUTO |
| Beauty, spa and salon | BEAUTY |
| Clothing | APPAREL |
| Education | EDU |
| Entertainment | ENTERTAIN |
| Event planning and service | EVENT_PLAN |
| Finance and banking | FINANCE |
| Food and groceries | GROCERY |
| Public service | GOVT |
| Hotel and lodging | HOTEL |
| Medical and health | HEALTH |
| Charity | NONPROFIT |
| Professional services | PROF_SERVICES |
| Shopping and retail | RETAIL |
| Travel and transportation | TRAVEL |
| Restaurant | RESTAURANT |
| Not a business | NOT_A_BIZ |
| Other | OTHER |

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details (in development mode)"
}
```

Common HTTP status codes:
- `400` - Bad request (missing required fields)
- `401` - Unauthorized (invalid/expired token)
- `404` - Resource not found (WABA/phone not found)
- `500` - Internal server error

## Webhook Configuration

After successful signup, the system automatically:
1. Subscribes the WABA to receive webhooks
2. Overrides the callback URL to your server
3. Sets a verify token for webhook verification

Your webhook endpoint should be available at:
```
{WEBHOOK_BASE_URL}/webhook/whatsapp/{organizationId}
```

## Security Considerations

1. Never expose `META_APP_SECRET` in frontend code
2. All sensitive API calls should be made from the backend
3. Access tokens are stored encrypted in the database
4. User sessions are validated before any WABA operations
5. Webhook verification tokens should be unique per organization
