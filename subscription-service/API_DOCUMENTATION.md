# Subscription Service API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture Integration](#architecture-integration)
3. [Subscription Plans](#subscription-plans)
4. [API Endpoints](#api-endpoints)
5. [Usage Tracking & Limits](#usage-tracking--limits)
6. [Payment Integration](#payment-integration)
7. [Error Handling](#error-handling)
8. [Webhooks](#webhooks)

---

## Overview

The Subscription Service handles all subscription and billing operations for the WhatsApp Business API platform. It includes:

- ✅ **5 Subscription Tiers**: Free, Starter, Professional, Enterprise, Lifetime
- ✅ **Multiple Billing Cycles**: Monthly, Yearly, Lifetime
- ✅ **Indian Pricing**: All amounts in INR (₹)
- ✅ **Feature-based Limits**: Contacts, templates, campaigns, messages
- ✅ **Usage Tracking**: Real-time monitoring against plan limits
- ✅ **Promo Codes**: Discount codes with validation
- ✅ **Transaction History**: Complete billing audit trail
- ✅ **Auto-renewal**: Automatic subscription renewals
- ✅ **Redis Caching**: Optimized performance

**Service Details:**
- **Port**: 3007
- **Base URL**: `http://localhost:3007/subscription-service`
- **Database**: MySQL (`subscription_service`)
- **Cache**: Redis
- **Currency**: INR (₹)

---

## Architecture Integration

### Service Dependencies

```
┌─────────────────┐
│  User Service   │ ← JWT Authentication
│    (Port 3000)  │
└────────┬────────┘
         │
         │ Auth Token
         ▼
┌─────────────────────────────┐
│  Subscription Service       │
│     (Port 3007)             │
│                             │
│  • Plans Management         │
│  • Billing & Payments       │
│  • Usage Tracking           │
│  • Limit Enforcement        │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Other Services             │
│  • Contact Service          │
│  • Template Service         │
│  • Campaign Service         │
│  • WhatsApp Service         │
│                             │
│  (Check limits before ops)  │
└─────────────────────────────┘
```

### Integration Flow

1. **User Signs Up** → Gets Free plan automatically
2. **User Upgrades** → Selects plan, completes payment
3. **Usage Tracking** → Each service reports usage
4. **Limit Checks** → Services verify before operations
5. **Auto-renewal** → System renews subscriptions automatically

---

## Subscription Plans

### Available Plans (Indian Pricing - INR ₹)

| Plan | Monthly | Yearly | Lifetime | Contacts | Templates | Campaigns/Month | Messages/Month |
|------|---------|--------|----------|----------|-----------|-----------------|----------------|
| **Free** | ₹0 | ₹0 | N/A | 100 | 3 | 5 | 500 |
| **Starter** | ₹999 | ₹9,999 (2 months free) | N/A | 1,000 | 10 | 20 | 5,000 |
| **Professional** | ₹2,999 | ₹29,999 (3 months free) | N/A | 10,000 | 50 | 100 | 50,000 |
| **Enterprise** | ₹9,999 | ₹99,999 (3 months free) | N/A | Unlimited | Unlimited | Unlimited | Unlimited |
| **Lifetime** | N/A | N/A | ₹1,99,999 | Unlimited | Unlimited | Unlimited | Unlimited |

### Message Pricing (Per Message - INR ₹)

| Plan | Marketing | Utility | Auth |
|------|-----------|---------|------|
| Free | ₹0.35 | ₹0.15 | ₹0.15 |
| Starter | ₹0.30 | ₹0.12 | ₹0.12 |
| Professional | ₹0.25 | ₹0.10 | ₹0.10 |
| Enterprise | ₹0.20 | ₹0.08 | ₹0.08 |
| Lifetime | ₹0.20 | ₹0.08 | ₹0.08 |

### Feature Comparison

| Feature | Free | Starter | Professional | Enterprise | Lifetime |
|---------|------|---------|-------------|------------|----------|
| Advanced Analytics | ❌ | ✅ | ✅ | ✅ | ✅ |
| Automation | ❌ | ❌ | ✅ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ | ✅ |
| White Label | ❌ | ❌ | ❌ | ✅ | ✅ |
| Custom Reports | ❌ | ❌ | ✅ | ✅ | ✅ |
| Webhooks | ❌ | ❌ | ✅ | ✅ | ✅ |
| Bulk Messaging | ❌ | ✅ | ✅ | ✅ | ✅ |
| Team Members | 1 | 3 | 10 | Unlimited | Unlimited |
| WhatsApp Numbers | 1 | 1 | 3 | 10 | 5 |

---

## API Endpoints

### 1. Plans Management

#### GET `/api/plans` - Get All Plans (Public)

Get list of all available subscription plans.

**Request:**
```bash
curl -X GET http://localhost:3007/subscription-service/api/plans
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "code": "FREE",
      "name": "Free Plan",
      "description": "Perfect for trying out WhatsApp Business API",
      "type": "FREE",
      "pricing": {
        "monthly": 0,
        "yearly": 0,
        "lifetime": 0,
        "currency": "INR"
      },
      "limits": {
        "contacts": 100,
        "templates": 3,
        "campaignsPerMonth": 5,
        "messagesPerMonth": 500,
        "teamMembers": 1,
        "whatsappNumbers": 1
      },
      "features": {
        "advancedAnalytics": false,
        "automation": false,
        "apiAccess": false,
        "prioritySupport": false,
        "whiteLabel": false,
        "customReports": false,
        "webhooks": false,
        "bulkMessaging": false
      },
      "messagePricing": {
        "marketing": 0.35,
        "utility": 0.15,
        "auth": 0.15,
        "currency": "INR"
      }
    }
    // ... more plans
  ]
}
```

---

#### GET `/api/plans/:planId` - Get Single Plan (Public)

**Request:**
```bash
curl -X GET http://localhost:3007/subscription-service/api/plans/2
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "code": "STARTER",
    "name": "Starter Plan",
    "description": "Great for small businesses getting started",
    "type": "STARTER",
    "pricing": {
      "monthly": 999,
      "yearly": 9999,
      "lifetime": 0,
      "currency": "INR"
    },
    // ... other details
  }
}
```

---

#### GET `/api/plans-compare?planIds=1,2,3` - Compare Plans (Public)

Compare multiple subscription plans.

**Request:**
```bash
curl -X GET "http://localhost:3007/subscription-service/api/plans-compare?planIds=1,2,3"
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "name": "Free Plan",
      "type": "FREE",
      "pricing": {
        "monthly": 0,
        "yearly": 0,
        "lifetime": 0
      },
      "limits": {
        "contacts": 100,
        "templates": 3,
        // ... other limits
      },
      "features": {
        "advancedAnalytics": false,
        // ... other features
      }
    }
    // ... other plans
  ]
}
```

---

#### GET `/api/plans/:planId/pricing?billingCycle=MONTHLY` - Get Plan Pricing (Public)

**Request:**
```bash
curl -X GET "http://localhost:3007/subscription-service/api/plans/2/pricing?billingCycle=YEARLY"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "planId": 2,
    "planName": "Starter Plan",
    "billingCycle": "YEARLY",
    "amount": 9999,
    "currency": "INR"
  }
}
```

---

### 2. Subscription Management

#### POST `/api/subscriptions/subscribe` - Subscribe to Plan (Protected)

Create a new subscription for the authenticated user.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "planId": 2,
  "billingCycle": "MONTHLY",
  "promoCode": "LAUNCH50",
  "paymentMethod": "RAZORPAY"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3007/subscription-service/api/subscriptions/subscribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": 2,
    "billingCycle": "MONTHLY",
    "promoCode": "LAUNCH50",
    "paymentMethod": "RAZORPAY"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Subscription created successfully",
  "data": {
    "subscriptionId": 1,
    "transactionId": 1,
    "planName": "Starter Plan",
    "billingCycle": "MONTHLY",
    "amount": 499.50,
    "discountApplied": 499.50,
    "currency": "INR",
    "startDate": "2025-01-30T10:00:00.000Z",
    "endDate": "2025-02-30T10:00:00.000Z",
    "status": "ACTIVE"
  }
}
```

**Possible Errors:**
- `400`: Invalid input or validation failed
- `404`: Plan not found
- `409`: User already has active subscription
- `401`/`403`: Authentication error

---

#### GET `/api/subscriptions/current` - Get Current Subscription (Protected)

Get the authenticated user's active subscription with usage data.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**cURL:**
```bash
curl -X GET http://localhost:3007/subscription-service/api/subscriptions/current \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": 1,
      "planName": "Starter Plan",
      "planType": "STARTER",
      "billingCycle": "MONTHLY",
      "amount": 999,
      "currency": "INR",
      "status": "ACTIVE",
      "startDate": "2025-01-30T10:00:00.000Z",
      "endDate": "2025-02-30T10:00:00.000Z",
      "nextBillingDate": "2025-02-30T10:00:00.000Z",
      "autoRenew": true
    },
    "limits": {
      "contacts": 1000,
      "templates": 10,
      "campaignsPerMonth": 20,
      "messagesPerMonth": 5000,
      "teamMembers": 3,
      "whatsappNumbers": 1
    },
    "features": {
      "advancedAnalytics": true,
      "automation": false,
      "apiAccess": false,
      "prioritySupport": false,
      "whiteLabel": false,
      "customReports": false,
      "webhooks": false,
      "bulkMessaging": true
    },
    "usage": {
      "contacts": 250,
      "templates": 5,
      "campaigns": 3,
      "messages": 1200,
      "teamMembers": 2,
      "whatsappNumbers": 1,
      "monthYear": "2025-01"
    }
  }
}
```

**Possible Errors:**
- `404`: No active subscription found
- `401`/`403`: Authentication error

---

#### GET `/api/subscriptions/history?page=1&limit=10` - Get Subscription History (Protected)

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**cURL:**
```bash
curl -X GET "http://localhost:3007/subscription-service/api/subscriptions/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 3,
      "planName": "Professional Plan",
      "planType": "PROFESSIONAL",
      "billingCycle": "YEARLY",
      "amount": 29999,
      "currency": "INR",
      "status": "ACTIVE",
      "startDate": "2025-01-30T10:00:00.000Z",
      "endDate": "2026-01-30T10:00:00.000Z",
      "createdAt": "2025-01-30T10:00:00.000Z"
    },
    {
      "id": 2,
      "planName": "Starter Plan",
      "planType": "STARTER",
      "billingCycle": "MONTHLY",
      "amount": 999,
      "currency": "INR",
      "status": "CANCELLED",
      "startDate": "2024-12-30T10:00:00.000Z",
      "endDate": "2025-01-30T10:00:00.000Z",
      "createdAt": "2024-12-30T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "limit": 10
  }
}
```

---

#### POST `/api/subscriptions/:subscriptionId/cancel` - Cancel Subscription (Protected)

Cancel an active subscription.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Switching to a different plan"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3007/subscription-service/api/subscriptions/1/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Switching to a different plan"}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Subscription cancelled successfully",
  "data": {
    "subscriptionId": 1,
    "status": "CANCELLED",
    "cancelledAt": "2025-01-30T10:30:00.000Z"
  }
}
```

**Possible Errors:**
- `400`: Subscription already cancelled
- `403`: Unauthorized (not subscription owner)
- `404`: Subscription not found

---

#### PUT `/api/subscriptions/:subscriptionId/auto-renew` - Toggle Auto-Renewal (Protected)

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "autoRenew": false
}
```

**cURL:**
```bash
curl -X PUT http://localhost:3007/subscription-service/api/subscriptions/1/auto-renew \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"autoRenew": false}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Auto-renewal disabled",
  "data": {
    "subscriptionId": 1,
    "autoRenew": false
  }
}
```

---

### 3. Usage Tracking

#### GET `/api/usage/current` - Get Current Month Usage (Protected)

Get usage statistics for the current billing period.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**cURL:**
```bash
curl -X GET http://localhost:3007/subscription-service/api/usage/current \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "monthYear": "2025-01",
    "usage": {
      "contacts": 250,
      "templates": 5,
      "campaigns": 3,
      "messages": 1200,
      "teamMembers": 2,
      "whatsappNumbers": 1
    },
    "messageBreakdown": {
      "marketing": 800,
      "utility": 300,
      "auth": 100
    },
    "limits": {
      "contacts": 1000,
      "templates": 10,
      "campaigns": 20,
      "messages": 5000,
      "teamMembers": 3,
      "whatsappNumbers": 1
    },
    "remaining": {
      "contacts": 750,
      "templates": 5,
      "campaigns": 17,
      "messages": 3800,
      "teamMembers": 1,
      "whatsappNumbers": 0
    }
  }
}
```

**Note**: `-1` in limits means unlimited.

---

#### GET `/api/usage/check-limit/:limitType` - Check Specific Limit (Protected)

Check if user can perform an action based on their plan limits.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Limit Types:** `contacts`, `templates`, `campaigns`, `messages`, `team_members`, `whatsapp_numbers`

**cURL:**
```bash
curl -X GET http://localhost:3007/subscription-service/api/usage/check-limit/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "limitType": "contacts",
    "canProceed": true,
    "current": 250,
    "limit": 1000,
    "remaining": 750
  }
}
```

**Usage Example in Other Services:**
```javascript
// Before creating a new contact in Contact Service
const limitCheck = await fetch(
  `http://localhost:3007/subscription-service/api/usage/check-limit/contacts`,
  {
    headers: {
      Authorization: `Bearer ${userToken}`
    }
  }
);

const data = await limitCheck.json();

if (!data.data.canProceed) {
  return res.status(403).json({
    error: 'Contact limit reached. Please upgrade your plan.'
  });
}

// Proceed with creating contact...
```

---

#### GET `/api/usage/history?months=6` - Get Usage History (Protected)

Get usage statistics for past months.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `months` (optional): Number of months to retrieve (default: 6)

**cURL:**
```bash
curl -X GET "http://localhost:3007/subscription-service/api/usage/history?months=6" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "monthYear": "2025-01",
      "contacts": 250,
      "templates": 5,
      "campaigns": 3,
      "messages": 1200,
      "marketingMessages": 800,
      "utilityMessages": 300,
      "authMessages": 100
    },
    {
      "monthYear": "2024-12",
      "contacts": 180,
      "templates": 4,
      "campaigns": 2,
      "messages": 950,
      "marketingMessages": 600,
      "utilityMessages": 250,
      "authMessages": 100
    }
  ]
}
```

---

### 4. Transactions

#### GET `/api/transactions?page=1&limit=50` - Get Transaction History (Protected)

Get billing transaction history.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**cURL:**
```bash
curl -X GET "http://localhost:3007/subscription-service/api/transactions?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "planName": "Starter Plan",
      "type": "NEW",
      "amount": 999,
      "currency": "INR",
      "paymentMethod": "RAZORPAY",
      "paymentStatus": "SUCCESS",
      "invoiceNumber": "INV-2025-001",
      "invoiceUrl": "https://...",
      "description": "Subscription to Starter Plan - MONTHLY",
      "createdAt": "2025-01-30T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 1,
    "limit": 20
  }
}
```

---

#### GET `/api/transactions/:transactionId` - Get Single Transaction (Protected)

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**cURL:**
```bash
curl -X GET http://localhost:3007/subscription-service/api/transactions/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "NEW",
    "amount": 999,
    "currency": "INR",
    "paymentMethod": "RAZORPAY",
    "paymentStatus": "SUCCESS",
    "paymentId": "pay_xxx",
    "gatewayOrderId": "order_xxx",
    "invoiceNumber": "INV-2025-001",
    "invoiceUrl": "https://...",
    "description": "Subscription to Starter Plan - MONTHLY",
    "createdAt": "2025-01-30T10:00:00.000Z"
  }
}
```

---

#### GET `/api/transactions/stats/revenue` - Get Total Revenue (Protected)

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**cURL:**
```bash
curl -X GET http://localhost:3007/subscription-service/api/transactions/stats/revenue \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 29999,
    "currency": "INR"
  }
}
```

---

### 5. Promo Codes

#### GET `/api/promo-codes/active` - Get Active Promo Codes (Public)

Get all currently active promo codes.

**cURL:**
```bash
curl -X GET http://localhost:3007/subscription-service/api/promo-codes/active
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "code": "LAUNCH50",
      "description": "50% off for new users",
      "discountType": "PERCENTAGE",
      "discountValue": 50,
      "validUntil": "2025-12-31T23:59:59.000Z"
    },
    {
      "code": "SAVE500",
      "description": "Flat ₹500 off",
      "discountType": "FIXED_AMOUNT",
      "discountValue": 500,
      "validUntil": "2025-06-30T23:59:59.000Z"
    }
  ]
}
```

---

#### POST `/api/promo-codes/validate` - Validate Promo Code (Protected)

Validate a promo code before applying it.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "LAUNCH50",
  "planId": 2,
  "billingCycle": "MONTHLY"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3007/subscription-service/api/promo-codes/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "LAUNCH50",
    "planId": 2,
    "billingCycle": "MONTHLY"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "valid": true,
  "data": {
    "code": "LAUNCH50",
    "discountType": "PERCENTAGE",
    "discountValue": 50,
    "maxDiscountAmount": 5000,
    "description": "50% off for new users"
  }
}
```

**Response (400 - Invalid):**
```json
{
  "success": false,
  "valid": false,
  "message": "Promo code has expired"
}
```

---

#### POST `/api/promo-codes/calculate-discount` - Calculate Discount (Protected)

Calculate final amount after applying promo code.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "LAUNCH50",
  "amount": 999
}
```

**cURL:**
```bash
curl -X POST http://localhost:3007/subscription-service/api/promo-codes/calculate-discount \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "LAUNCH50",
    "amount": 999
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "code": "LAUNCH50",
    "originalAmount": 999,
    "discountAmount": 499.50,
    "finalAmount": 499.50,
    "currency": "INR"
  }
}
```

---

## Usage Tracking & Limits

### How Limits Work

1. **Plan-Based Limits**: Each subscription plan has specific limits
2. **Monthly Reset**: Campaign and message limits reset monthly
3. **Real-time Tracking**: Usage is tracked as actions occur
4. **Enforcement**: Services check limits before allowing operations

### Integration Example

```javascript
// In Contact Service - Before creating contact

// 1. Check if user can add more contacts
const limitCheck = await fetch(
  `${SUBSCRIPTION_SERVICE_URL}/api/usage/check-limit/contacts`,
  {
    headers: { Authorization: `Bearer ${userToken}` }
  }
);

const limit = await limitCheck.json();

if (!limit.data.canProceed) {
  return res.status(403).json({
    error: 'Contact limit reached',
    current: limit.data.current,
    limit: limit.data.limit,
    message: 'Please upgrade your plan to add more contacts'
  });
}

// 2. Create the contact
// ... contact creation logic ...

// 3. Increment usage counter
await fetch(
  `${SUBSCRIPTION_SERVICE_URL}/api/usage/increment`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      usageType: 'contacts',
      count: 1
    })
  }
);
```

### Usage Types

| Usage Type | Description | Reset Frequency |
|------------|-------------|-----------------|
| `contacts` | Total contacts stored | Never (cumulative) |
| `templates` | Total templates created | Never (cumulative) |
| `campaigns` | Campaigns this month | Monthly |
| `messages` | Messages sent this month | Monthly |
| `team_members` | Team members added | Never (cumulative) |
| `whatsapp_numbers` | WhatsApp numbers connected | Never (cumulative) |
| `marketing_messages` | Marketing messages sent | Monthly |
| `utility_messages` | Utility messages sent | Monthly |
| `auth_messages` | Auth messages sent | Monthly |

---

## Payment Integration

### Razorpay Integration (Primary)

The service is designed to work with Razorpay for Indian payments.

**Setup:**
1. Create Razorpay account at https://razorpay.com
2. Get API keys from Dashboard
3. Add keys to `.env` file
4. Configure webhook URL

**Payment Flow:**

```javascript
// 1. Client initiates subscription
const response = await fetch('/api/subscriptions/subscribe', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planId: 2,
    billingCycle: 'MONTHLY',
    promoCode: 'LAUNCH50',
    paymentMethod: 'RAZORPAY'
  })
});

// 2. Backend creates subscription and returns order details
const { data } = await response.json();

// 3. Frontend opens Razorpay checkout
const options = {
  key: 'YOUR_RAZORPAY_KEY_ID',
  amount: data.amount * 100, // paise
  currency: 'INR',
  name: 'Your Company',
  description: `Subscription to ${data.planName}`,
  order_id: data.gatewayOrderId,
  handler: function (response) {
    // 4. Payment successful - verify on backend
    verifyPayment(response);
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

### Stripe Integration (Optional)

For international payments, Stripe can be configured.

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input or validation failed |
| 401 | Unauthorized | Missing authentication token |
| 403 | Forbidden | Invalid token or insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists or conflict |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Examples

**Limit Exceeded:**
```json
{
  "success": false,
  "error": "Contact limit reached. Please upgrade your plan.",
  "current": 100,
  "limit": 100
}
```

**Invalid Promo Code:**
```json
{
  "success": false,
  "valid": false,
  "message": "Promo code has expired"
}
```

**Already Subscribed:**
```json
{
  "success": false,
  "error": "You already have an active subscription",
  "currentSubscription": {
    "planName": "Starter Plan",
    "endDate": "2025-02-30T10:00:00.000Z"
  }
}
```

---

## Webhooks

### Subscription Events

The service can emit webhooks for important events:

1. **subscription.created** - New subscription created
2. **subscription.renewed** - Subscription auto-renewed
3. **subscription.cancelled** - Subscription cancelled
4. **subscription.expired** - Subscription expired
5. **payment.successful** - Payment completed successfully
6. **payment.failed** - Payment failed
7. **limit.reached** - Usage limit reached

### Webhook Payload Format

```json
{
  "event": "subscription.created",
  "timestamp": "2025-01-30T10:00:00.000Z",
  "data": {
    "subscriptionId": 1,
    "userId": 123,
    "planName": "Starter Plan",
    "billingCycle": "MONTHLY",
    "amount": 999,
    "status": "ACTIVE"
  }
}
```

---

## Testing Guide

### 1. Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your credentials

# Start service
npm run dev
```

### 2. Test Workflow

```bash
# 1. Check service health
curl http://localhost:3007/health

# 2. Get available plans
curl http://localhost:3007/subscription-service/api/plans

# 3. Register user in User Service (Port 3000)
# Get JWT token

# 4. Subscribe to plan
curl -X POST http://localhost:3007/subscription-service/api/subscriptions/subscribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": 2,
    "billingCycle": "MONTHLY"
  }'

# 5. Check current subscription
curl http://localhost:3007/subscription-service/api/subscriptions/current \
  -H "Authorization: Bearer YOUR_TOKEN"

# 6. Check usage
curl http://localhost:3007/subscription-service/api/usage/current \
  -H "Authorization: Bearer YOUR_TOKEN"

# 7. Check limits
curl http://localhost:3007/subscription-service/api/usage/check-limit/contacts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Database Schema Quick Reference

### Main Tables

1. **subscription_plans** - Available subscription plans
2. **user_subscriptions** - Active and past subscriptions
3. **subscription_transactions** - Payment transactions
4. **usage_tracking** - Monthly usage tracking
5. **subscription_history** - Audit trail
6. **promo_codes** - Discount codes
7. **promo_code_usage** - Promo code redemptions

---

## Configuration

### Environment Variables

```bash
# Service
PORT=3007
NODE_ENV=development

# Database
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=subscription_service

# Redis
REDIS_URL=redis://127.0.0.1:6379

# JWT (must match User Service)
JWT_SECRET=your_jwt_secret_key

# Payment Gateway
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review error messages
3. Check database schema (`src/database/schema.sql`)
4. Verify environment variables
5. Check Redis and MySQL connections

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Currency:** INR (₹)  
**Language:** JavaScript (ES Modules)  
**Database:** MySQL 8  
**Cache:** Redis 6
