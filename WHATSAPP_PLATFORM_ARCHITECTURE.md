# WhatsApp Business Platform - Complete Architecture

## Overview

A comprehensive WhatsApp Business Platform built using Meta's Cloud API, Business Management API, and Marketing Messages API. This platform enables businesses to onboard via Embedded Signup, manage contacts, create message templates, run marketing campaigns, and handle customer conversations at scale.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 14)                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Dashboard │ │ Signup   │ │ Inbox    │ │Campaigns │ │Templates │ │ Contacts │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY (Kong/Express)                          │
│                        Rate Limiting, Auth, Load Balancing                       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│     USER SERVICE        │ │   WHATSAPP SERVICE      │ │   CAMPAIGN SERVICE      │
│     (Port: 3000)        │ │     (Port: 3006)        │ │     (Port: 3004)        │
│                         │ │                         │ │                         │
│ • Auth & Registration   │ │ • Send Messages         │ │ • Create Campaigns      │
│ • Embedded Signup       │ │ • Receive Webhooks      │ │ • Schedule Campaigns    │
│ • Business Onboarding   │ │ • Message Templates     │ │ • Campaign Analytics    │
│ • Wallet Management     │ │ • Media Management      │ │ • A/B Testing           │
│ • Organization Setup    │ │ • Flows Management      │ │ • Kafka Producer        │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           APACHE KAFKA CLUSTER                                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │ campaign-events │ │ message-queue   │ │ webhook-events  │ │ status-updates│ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│   MESSAGE PROCESSOR     │ │   CONTACT SERVICE       │ │   TEMPLATE SERVICE      │
│   (Kafka Consumer)      │ │     (Port: 3001)        │ │     (Port: 3003)        │
│                         │ │                         │ │                         │
│ • Rate Limiting         │ │ • Contact CRUD          │ │ • Template CRUD         │
│ • Message Batching      │ │ • Groups Management     │ │ • Sync with Meta        │
│ • Retry Logic           │ │ • Import/Export         │ │ • Template Review       │
│ • Status Tracking       │ │ • Opt-in Management     │ │ • Quality Tracking      │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
                    │                   │                   │
                    └───────────────────┴───────────────────┘
                                        │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          TEAM SERVICE (Port: 3000/team-service)                  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌─────────────────┐  │
│  │  Departments   │ │    Agents      │ │   Assignments  │ │ Inbox Routing   │  │
│  └────────────────┘ └────────────────┘ └────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                          │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌─────────────────┐  │
│  │   PostgreSQL   │ │     Redis      │ │  Elasticsearch │ │    S3/MinIO     │  │
│  │   (Primary DB) │ │    (Cache)     │ │    (Search)    │ │    (Media)      │  │
│  └────────────────┘ └────────────────┘ └────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 1. USER SERVICE (Port: 3000)

### Core Features

#### 1.1 Authentication & Authorization
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user account |
| `/api/auth/login` | POST | User login with email/password |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/logout` | POST | Invalidate tokens |
| `/api/auth/forgot-password` | POST | Send password reset email |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/auth/verify-email` | POST | Verify email address |
| `/api/auth/resend-verification` | POST | Resend verification email |

#### 1.2 Embedded Signup (Meta Integration)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/embedded-signup/init` | POST | Initialize embedded signup session |
| `/api/embedded-signup/callback` | POST | Handle OAuth callback from Meta |
| `/api/embedded-signup/exchange-token` | POST | Exchange code for business token |
| `/api/embedded-signup/complete` | POST | Complete onboarding process |
| `/api/embedded-signup/status` | GET | Check onboarding status |
| `/api/embedded-signup/register-phone` | POST | Register phone number for Cloud API |
| `/api/embedded-signup/subscribe-webhooks` | POST | Subscribe app to WABA webhooks |

#### 1.3 Organization Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/organizations` | GET | List user's organizations |
| `/api/organizations` | POST | Create new organization |
| `/api/organizations/:id` | GET | Get organization details |
| `/api/organizations/:id` | PUT | Update organization |
| `/api/organizations/:id` | DELETE | Delete organization |
| `/api/organizations/:id/members` | GET | List organization members |
| `/api/organizations/:id/members` | POST | Invite member to organization |
| `/api/organizations/:id/members/:userId` | DELETE | Remove member |
| `/api/organizations/:id/members/:userId/role` | PUT | Update member role |

#### 1.4 WhatsApp Business Account (WABA) Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/waba` | GET | List linked WhatsApp Business Accounts |
| `/api/waba/:id` | GET | Get WABA details |
| `/api/waba/:id/phone-numbers` | GET | List registered phone numbers |
| `/api/waba/:id/phone-numbers` | POST | Add new phone number |
| `/api/waba/:id/phone-numbers/:phoneId` | GET | Get phone number details |
| `/api/waba/:id/phone-numbers/:phoneId/verify` | POST | Request verification code |
| `/api/waba/:id/phone-numbers/:phoneId/confirm` | POST | Confirm verification code |
| `/api/waba/:id/analytics` | GET | Get WABA analytics |
| `/api/waba/:id/quality-rating` | GET | Get quality rating info |

#### 1.5 Wallet & Billing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallet` | GET | Get wallet balance |
| `/api/wallet/transactions` | GET | List transactions |
| `/api/wallet/add-funds` | POST | Add funds to wallet |
| `/api/wallet/withdraw` | POST | Withdraw funds |
| `/api/wallet/pricing` | GET | Get message pricing |
| `/api/wallet/usage` | GET | Get usage analytics |
| `/api/wallet/invoices` | GET | List invoices |
| `/api/wallet/invoices/:id` | GET | Download invoice |

#### 1.6 User Profile
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/profile` | GET | Get user profile |
| `/api/users/profile` | PUT | Update user profile |
| `/api/users/profile/avatar` | POST | Upload avatar |
| `/api/users/security` | GET | Get security settings |
| `/api/users/security/2fa` | POST | Enable/disable 2FA |
| `/api/users/api-keys` | GET | List API keys |
| `/api/users/api-keys` | POST | Generate new API key |
| `/api/users/api-keys/:id` | DELETE | Revoke API key |

---

## 📱 2. WHATSAPP SERVICE (Port: 3006)

### Core Features

#### 2.1 Send Messages (All Types)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/messages/send` | POST | Send any message type |
| `/api/messages/send/text` | POST | Send text message |
| `/api/messages/send/image` | POST | Send image message |
| `/api/messages/send/video` | POST | Send video message |
| `/api/messages/send/audio` | POST | Send audio message |
| `/api/messages/send/document` | POST | Send document message |
| `/api/messages/send/sticker` | POST | Send sticker message |
| `/api/messages/send/location` | POST | Send location message |
| `/api/messages/send/contact` | POST | Send contact card |
| `/api/messages/send/template` | POST | Send template message |
| `/api/messages/send/interactive` | POST | Send interactive message |
| `/api/messages/send/reaction` | POST | Send reaction to message |

#### 2.2 Interactive Messages
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/messages/send/interactive/buttons` | POST | Send reply buttons (up to 3) |
| `/api/messages/send/interactive/list` | POST | Send list message (up to 10 items) |
| `/api/messages/send/interactive/cta-url` | POST | Send CTA URL button |
| `/api/messages/send/interactive/location-request` | POST | Request user location |
| `/api/messages/send/interactive/address-request` | POST | Request delivery address |
| `/api/messages/send/interactive/flow` | POST | Send WhatsApp Flow |

#### 2.3 Message Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/messages/:id` | GET | Get message by ID |
| `/api/messages/:id/status` | GET | Get message delivery status |
| `/api/messages/:id/mark-read` | POST | Mark message as read |
| `/api/messages/typing-indicator` | POST | Show typing indicator |

#### 2.4 Conversations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/conversations` | GET | List all conversations |
| `/api/conversations/:contactId` | GET | Get conversation with contact |
| `/api/conversations/:contactId/messages` | GET | Get messages in conversation |
| `/api/conversations/:contactId/messages` | POST | Send message to conversation |
| `/api/conversations/:contactId/close` | POST | Close conversation |
| `/api/conversations/:contactId/assign` | POST | Assign to agent |
| `/api/conversations/:contactId/transfer` | POST | Transfer to department |
| `/api/conversations/:contactId/notes` | GET | Get internal notes |
| `/api/conversations/:contactId/notes` | POST | Add internal note |
| `/api/conversations/:contactId/tags` | PUT | Update conversation tags |

#### 2.5 Media Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/media/upload` | POST | Upload media to WhatsApp |
| `/api/media/:id` | GET | Get media info |
| `/api/media/:id/download` | GET | Download media |
| `/api/media/:id` | DELETE | Delete media |

#### 2.6 Webhooks (Incoming)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/whatsapp` | GET | Webhook verification |
| `/api/webhooks/whatsapp` | POST | Receive webhook events |

**Webhook Events Handled:**
- `messages` - Incoming messages (text, media, interactive, location, etc.)
- `message_status` - Delivery status (sent, delivered, read, failed)
- `button_reply` - Quick reply button clicks
- `list_reply` - List item selections
- `template_status` - Template approval/rejection
- `quality_update` - Phone number quality changes
- `account_update` - WABA status changes

#### 2.7 WhatsApp Flows
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/flows` | GET | List all flows |
| `/api/flows` | POST | Create new flow |
| `/api/flows/:id` | GET | Get flow details |
| `/api/flows/:id` | PUT | Update flow |
| `/api/flows/:id` | DELETE | Delete flow |
| `/api/flows/:id/publish` | POST | Publish flow |
| `/api/flows/:id/deprecate` | POST | Deprecate flow |
| `/api/flows/:id/preview` | POST | Preview flow |

#### 2.8 Quick Replies & Canned Responses
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/quick-replies` | GET | List quick replies |
| `/api/quick-replies` | POST | Create quick reply |
| `/api/quick-replies/:id` | PUT | Update quick reply |
| `/api/quick-replies/:id` | DELETE | Delete quick reply |

---

## 📋 3. TEMPLATE SERVICE (Port: 3003)

### Core Features

#### 3.1 Template CRUD
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates` | GET | List all templates |
| `/api/templates` | POST | Create new template |
| `/api/templates/:id` | GET | Get template details |
| `/api/templates/:id` | PUT | Update template |
| `/api/templates/:id` | DELETE | Delete template |
| `/api/templates/sync` | POST | Sync templates from Meta |

#### 3.2 Template Categories
| Category | Description | Use Case |
|----------|-------------|----------|
| `MARKETING` | Promotional messages | Sales, offers, announcements |
| `UTILITY` | Transaction updates | Order confirmations, shipping |
| `AUTHENTICATION` | OTP/Verification | Login codes, 2FA |

#### 3.3 Template Components
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates/:id/header` | PUT | Update header component |
| `/api/templates/:id/body` | PUT | Update body text |
| `/api/templates/:id/footer` | PUT | Update footer text |
| `/api/templates/:id/buttons` | PUT | Update buttons |

**Supported Header Types:**
- `TEXT` - Plain text header
- `IMAGE` - Image header (5MB max)
- `VIDEO` - Video header (16MB max)
- `DOCUMENT` - Document header (100MB max)

**Supported Button Types:**
- `URL` - Website link button
- `PHONE_NUMBER` - Call button
- `QUICK_REPLY` - Quick reply button
- `COPY_CODE` - Copy coupon code
- `OTP` - One-time password button

#### 3.4 Template Variables
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates/:id/variables` | GET | Get variable definitions |
| `/api/templates/:id/variables` | PUT | Update variable examples |

**Variable Formats:**
- Named: `{{customer_name}}`, `{{order_id}}`
- Positional: `{{1}}`, `{{2}}`, `{{3}}`

#### 3.5 Template Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates/:id/analytics` | GET | Get template analytics |
| `/api/templates/:id/quality` | GET | Get quality rating |
| `/api/templates/analytics/summary` | GET | Get overall summary |

**Analytics Metrics:**
- Messages sent/delivered/read
- Button click rates
- Quality score (High/Medium/Low)
- Pause/disable status

#### 3.6 Template Review Status
| Status | Description |
|--------|-------------|
| `PENDING` | Under review |
| `APPROVED` | Ready to send |
| `REJECTED` | Failed review |
| `PAUSED` | Temporarily paused |
| `DISABLED` | Permanently disabled |

---

## 📧 4. CAMPAIGN SERVICE (Port: 3004)

### Core Features (Kafka-Enabled)

#### 4.1 Campaign CRUD
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/campaigns` | GET | List all campaigns |
| `/api/campaigns` | POST | Create new campaign |
| `/api/campaigns/:id` | GET | Get campaign details |
| `/api/campaigns/:id` | PUT | Update campaign |
| `/api/campaigns/:id` | DELETE | Delete campaign |
| `/api/campaigns/:id/duplicate` | POST | Duplicate campaign |

#### 4.2 Campaign Execution
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/campaigns/:id/start` | POST | Start campaign (Kafka producer) |
| `/api/campaigns/:id/pause` | POST | Pause campaign |
| `/api/campaigns/:id/resume` | POST | Resume campaign |
| `/api/campaigns/:id/cancel` | POST | Cancel campaign |
| `/api/campaigns/:id/schedule` | POST | Schedule campaign |

#### 4.3 Campaign Types
| Type | Description |
|------|-------------|
| `ONE_TIME` | Single send campaign |
| `SCHEDULED` | Send at specific time |
| `RECURRING` | Daily/weekly/monthly |
| `TRIGGERED` | Event-based campaigns |
| `A_B_TEST` | Split testing |

#### 4.4 Campaign Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/campaigns/:id/analytics` | GET | Get campaign analytics |
| `/api/campaigns/:id/analytics/realtime` | GET | Real-time stats (WebSocket) |
| `/api/campaigns/:id/recipients` | GET | List recipients with status |
| `/api/campaigns/:id/export` | GET | Export campaign report |

**Analytics Metrics:**
- Total recipients
- Messages sent/delivered/read/failed
- Delivery rate percentage
- Read rate percentage
- Button click rates
- Opt-out rate
- Cost breakdown

#### 4.5 A/B Testing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/campaigns/:id/variants` | GET | List A/B variants |
| `/api/campaigns/:id/variants` | POST | Add variant |
| `/api/campaigns/:id/variants/:variantId` | PUT | Update variant |
| `/api/campaigns/:id/variants/:variantId` | DELETE | Remove variant |
| `/api/campaigns/:id/winner` | POST | Select winner |

#### 4.6 Kafka Integration
```javascript
// Kafka Topics
const KAFKA_TOPICS = {
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_STARTED: 'campaign.started',
  CAMPAIGN_PAUSED: 'campaign.paused',
  MESSAGE_QUEUE: 'message.queue',
  MESSAGE_SENT: 'message.sent',
  MESSAGE_DELIVERED: 'message.delivered',
  MESSAGE_READ: 'message.read',
  MESSAGE_FAILED: 'message.failed',
  WEBHOOK_EVENTS: 'webhook.events',
  STATUS_UPDATES: 'status.updates'
};
```

---

## 👥 5. CONTACT SERVICE (Port: 3001)

### Core Features

#### 5.1 Contact CRUD
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contacts` | GET | List contacts (paginated) |
| `/api/contacts` | POST | Create contact |
| `/api/contacts/:id` | GET | Get contact details |
| `/api/contacts/:id` | PUT | Update contact |
| `/api/contacts/:id` | DELETE | Delete contact |
| `/api/contacts/bulk` | POST | Bulk create contacts |
| `/api/contacts/bulk` | DELETE | Bulk delete contacts |
| `/api/contacts/search` | GET | Search contacts |

#### 5.2 Contact Attributes
| Attribute | Type | Description |
|-----------|------|-------------|
| `phone` | string | WhatsApp phone number |
| `name` | string | Contact name |
| `email` | string | Email address |
| `company` | string | Company name |
| `tags` | array | Custom tags |
| `custom_fields` | object | Custom attributes |
| `opt_in_status` | boolean | Marketing consent |
| `opt_in_date` | date | When opted in |
| `source` | string | How contact was added |
| `last_contacted` | date | Last message sent |
| `last_replied` | date | Last message received |

#### 5.3 Contact Import/Export
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contacts/import` | POST | Import from CSV/Excel |
| `/api/contacts/import/mapping` | POST | Map import columns |
| `/api/contacts/export` | GET | Export to CSV/Excel |
| `/api/contacts/export/template` | GET | Download import template |

#### 5.4 Opt-in Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contacts/:id/opt-in` | POST | Record opt-in |
| `/api/contacts/:id/opt-out` | POST | Record opt-out |
| `/api/contacts/opt-in/bulk` | POST | Bulk opt-in |
| `/api/contacts/opt-out/bulk` | POST | Bulk opt-out |

#### 5.5 Groups
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/groups` | GET | List groups |
| `/api/groups` | POST | Create group |
| `/api/groups/:id` | GET | Get group details |
| `/api/groups/:id` | PUT | Update group |
| `/api/groups/:id` | DELETE | Delete group |
| `/api/groups/:id/contacts` | GET | List group contacts |
| `/api/groups/:id/contacts` | POST | Add contacts to group |
| `/api/groups/:id/contacts` | DELETE | Remove contacts from group |
| `/api/groups/:id/count` | GET | Get contact count |

#### 5.6 Smart Segments
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/segments` | GET | List segments |
| `/api/segments` | POST | Create segment |
| `/api/segments/:id` | GET | Get segment |
| `/api/segments/:id` | PUT | Update segment rules |
| `/api/segments/:id` | DELETE | Delete segment |
| `/api/segments/:id/contacts` | GET | Get matching contacts |
| `/api/segments/:id/refresh` | POST | Refresh segment |

**Segment Rule Types:**
- Tag contains/not contains
- Custom field equals/contains
- Last contacted before/after
- Last replied before/after
- Opt-in status
- Source equals

---

## 👨‍💼 6. TEAM SERVICE (Port: 3000/team-service)

### Core Features

#### 6.1 Department Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/departments` | GET | List departments |
| `/api/departments` | POST | Create department |
| `/api/departments/:id` | GET | Get department |
| `/api/departments/:id` | PUT | Update department |
| `/api/departments/:id` | DELETE | Delete department |
| `/api/departments/:id/agents` | GET | List agents in department |

#### 6.2 Agent Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents |
| `/api/agents` | POST | Create agent |
| `/api/agents/:id` | GET | Get agent details |
| `/api/agents/:id` | PUT | Update agent |
| `/api/agents/:id` | DELETE | Delete agent |
| `/api/agents/:id/status` | PUT | Update availability status |
| `/api/agents/:id/conversations` | GET | Get agent's conversations |
| `/api/agents/:id/stats` | GET | Get agent performance stats |

#### 6.3 Inbox Routing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/routing/rules` | GET | List routing rules |
| `/api/routing/rules` | POST | Create routing rule |
| `/api/routing/rules/:id` | PUT | Update routing rule |
| `/api/routing/rules/:id` | DELETE | Delete routing rule |
| `/api/routing/auto-assign` | POST | Auto-assign conversation |

**Routing Strategies:**
- Round Robin
- Least Busy
- Skills-Based
- Department-Based
- Manual Assignment

#### 6.4 Agent Status
| Status | Description |
|--------|-------------|
| `AVAILABLE` | Ready to receive conversations |
| `BUSY` | Currently handling max capacity |
| `AWAY` | Temporarily unavailable |
| `OFFLINE` | Not available |

---

## 🔄 7. KAFKA MESSAGE PROCESSOR

### Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           KAFKA MESSAGE PROCESSOR                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐        │
│  │  Consumer Group │     │  Message Buffer │     │   Rate Limiter  │        │
│  │                 │────▶│                 │────▶│                 │        │
│  │  Partition: 0   │     │  Batch Size: 50 │     │  80 msg/sec/num │        │
│  │  Partition: 1   │     │  Flush: 1sec    │     │  10 msg/min/user│        │
│  │  Partition: N   │     │                 │     │                 │        │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘        │
│           │                       │                       │                  │
│           ▼                       ▼                       ▼                  │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    MESSAGE SENDER WORKERS                        │        │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │        │
│  │  │Worker 1 │ │Worker 2 │ │Worker 3 │ │Worker 4 │ │Worker N │  │        │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                     META WHATSAPP CLOUD API                      │        │
│  │              https://graph.facebook.com/v24.0                    │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    STATUS UPDATE HANDLER                         │        │
│  │  • Update message status in DB                                   │        │
│  │  • Update campaign analytics                                     │        │
│  │  • Trigger retry on failure                                      │        │
│  │  • Publish to status-updates topic                               │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Rate Limiting Rules
| Rule | Limit | Description |
|------|-------|-------------|
| Throughput | 80 msg/sec | Per phone number |
| Pair Rate | 1 msg/6 sec | To same recipient |
| Burst | 45 messages | Max burst, then wait |
| Retry Backoff | 4^X seconds | Exponential backoff |

### Retry Strategy
```javascript
const retryConfig = {
  maxRetries: 5,
  initialDelay: 1000,     // 1 second
  maxDelay: 60000,        // 1 minute
  backoffMultiplier: 4,
  retryableErrors: [
    'RATE_LIMIT_EXCEEDED',
    'TEMPORARY_ERROR',
    'NETWORK_ERROR'
  ]
};
```

---

## 🔗 8. EMBEDDED SIGNUP FLOW

### Complete Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EMBEDDED SIGNUP FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User Clicks "Connect WhatsApp Business" Button                          │
│     │                                                                        │
│     ▼                                                                        │
│  ┌────────────────────────────────────────────────────┐                     │
│  │  Frontend loads Facebook SDK                        │                     │
│  │  FB.init({ appId: 'YOUR_APP_ID' })                 │                     │
│  └────────────────────────────────────────────────────┘                     │
│     │                                                                        │
│     ▼                                                                        │
│  2. FB.login() with config_id launches Embedded Signup                      │
│     │                                                                        │
│     ▼                                                                        │
│  ┌────────────────────────────────────────────────────┐                     │
│  │  User completes Meta's Embedded Signup:             │                     │
│  │  • Logs in with Facebook/Meta                       │                     │
│  │  • Accepts Terms of Service                         │                     │
│  │  • Selects/Creates Business Portfolio               │                     │
│  │  • Selects/Creates WhatsApp Business Account        │                     │
│  │  • Enters/Verifies Phone Number                     │                     │
│  │  • Sets Display Name                                │                     │
│  └────────────────────────────────────────────────────┘                     │
│     │                                                                        │
│     ▼                                                                        │
│  3. Success Callback Returns:                                                │
│     • waba_id (WhatsApp Business Account ID)                                │
│     • phone_number_id (Registered Phone Number ID)                          │
│     • business_id (Business Portfolio ID)                                   │
│     • exchangeable_code (Token code - 30 sec TTL)                           │
│     │                                                                        │
│     ▼                                                                        │
│  ┌────────────────────────────────────────────────────┐                     │
│  │  Backend: Exchange Code for Business Token          │                     │
│  │  POST /oauth/access_token                           │                     │
│  │  { client_id, client_secret, code }                │                     │
│  │  Returns: business_access_token                     │                     │
│  └────────────────────────────────────────────────────┘                     │
│     │                                                                        │
│     ▼                                                                        │
│  4. Backend Completes Onboarding:                                           │
│     • Store WABA details in database                                        │
│     • Register phone number for Cloud API                                   │
│     • Subscribe app to WABA webhooks                                        │
│     • Sync existing templates                                               │
│     • Configure webhook callback URL                                        │
│     │                                                                        │
│     ▼                                                                        │
│  5. User Can Now:                                                           │
│     • Send messages via Cloud API                                           │
│     • Create and manage templates                                           │
│     • Receive incoming messages via webhooks                                │
│     • Run marketing campaigns                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Frontend Implementation

```javascript
// Embedded Signup Component
const EmbeddedSignup = () => {
  useEffect(() => {
    // Load Facebook SDK
    window.fbAsyncInit = function() {
      FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v24.0'
      });
    };

    // Load SDK script
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    // Message event listener
    window.addEventListener('message', handleEmbeddedSignupMessage);
    return () => window.removeEventListener('message', handleEmbeddedSignupMessage);
  }, []);

  const handleEmbeddedSignupMessage = (event) => {
    if (!event.origin.endsWith('facebook.com')) return;
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'WA_EMBEDDED_SIGNUP') {
        if (data.event === 'FINISH') {
          // Success - send data to backend
          completeOnboarding({
            wabaId: data.data.waba_id,
            phoneNumberId: data.data.phone_number_id,
            businessId: data.data.business_id
          });
        } else if (data.event === 'CANCEL') {
          // User cancelled
          console.log('Cancelled at:', data.data.current_step);
        }
      }
    } catch (e) {
      // Handle error
    }
  };

  const launchWhatsAppSignup = () => {
    FB.login(
      (response) => {
        if (response.authResponse) {
          const code = response.authResponse.code;
          // Exchange code for token on backend
          exchangeCodeForToken(code);
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_FB_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {
            // Pre-fill data if available
            business: {
              name: 'Business Name',
              email: 'business@email.com'
            }
          }
        }
      }
    );
  };

  return (
    <button onClick={launchWhatsAppSignup}>
      Connect WhatsApp Business Account
    </button>
  );
};
```

---

## 📊 9. ANALYTICS SERVICE

### Metrics & Dashboards

#### 9.1 Message Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/messages` | GET | Message analytics |
| `/api/analytics/messages/hourly` | GET | Hourly breakdown |
| `/api/analytics/messages/daily` | GET | Daily breakdown |
| `/api/analytics/delivery-rates` | GET | Delivery rate trends |

#### 9.2 Campaign Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/campaigns` | GET | Campaign overview |
| `/api/analytics/campaigns/:id` | GET | Specific campaign analytics |
| `/api/analytics/campaigns/comparison` | GET | Compare campaigns |

#### 9.3 Template Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/templates` | GET | Template performance |
| `/api/analytics/templates/:id` | GET | Specific template stats |
| `/api/analytics/templates/quality` | GET | Quality scores |

#### 9.4 Business Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/pricing` | GET | Cost analytics |
| `/api/analytics/conversations` | GET | Conversation metrics |
| `/api/analytics/agents` | GET | Agent performance |

---

## 🛡️ 10. SECURITY & COMPLIANCE

### Webhook Verification
```javascript
// Verify webhook signature
const verifyWebhookSignature = (req) => {
  const signature = req.headers['x-hub-signature-256'];
  const expectedSignature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return `sha256=${expectedSignature}` === signature;
};
```

### Data Protection
- All PII encrypted at rest (AES-256)
- TLS 1.3 for data in transit
- GDPR-compliant data handling
- Automatic data retention policies
- Audit logs for all actions

### Access Control
- Role-Based Access Control (RBAC)
- API key authentication
- JWT tokens with short expiry
- Rate limiting per user/org

---

## 📦 11. ENVIRONMENT VARIABLES

```env
# Meta/Facebook App Configuration
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_BUSINESS_ID=your_business_id
META_GRAPH_API_VERSION=v24.0
META_FB_CONFIG_ID=your_fb_config_id

# WhatsApp Configuration
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=whatsapp-platform
KAFKA_GROUP_ID=message-processor
KAFKA_CAMPAIGN_TOPIC=campaign-events
KAFKA_MESSAGE_TOPIC=message-queue
KAFKA_WEBHOOK_TOPIC=webhook-events

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/whatsapp_platform
REDIS_URL=redis://localhost:6379

# Service Ports
USER_SERVICE_PORT=3000
CONTACT_SERVICE_PORT=3001
TEMPLATE_SERVICE_PORT=3003
CAMPAIGN_SERVICE_PORT=3004
WHATSAPP_SERVICE_PORT=3006

# Security
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=your_encryption_key

# Storage
S3_BUCKET=whatsapp-media
S3_REGION=us-east-1
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
```

---

## 🚀 12. DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            KUBERNETES CLUSTER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         INGRESS CONTROLLER                           │   │
│  │                    (NGINX / AWS ALB / Cloudflare)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│        ┌───────────────────────────┼───────────────────────────┐            │
│        ▼                           ▼                           ▼            │
│  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐     │
│  │ Frontend    │            │ API Gateway │            │ Webhook     │     │
│  │ Deployment  │            │ Deployment  │            │ Handler     │     │
│  │ replicas: 3 │            │ replicas: 3 │            │ replicas: 3 │     │
│  └─────────────┘            └─────────────┘            └─────────────┘     │
│                                    │                                         │
│        ┌───────────────────────────┼───────────────────────────┐            │
│        ▼                           ▼                           ▼            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │User Service │ │Contact Svc  │ │Template Svc │ │Campaign Svc │          │
│  │replicas: 2  │ │replicas: 2  │ │replicas: 2  │ │replicas: 2  │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│        │                           │                                         │
│        ▼                           ▼                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │WhatsApp Svc │ │Team Service │ │Msg Processor│ │Analytics Svc│          │
│  │replicas: 3  │ │replicas: 2  │ │replicas: 5  │ │replicas: 2  │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                            KAFKA CLUSTER                             │   │
│  │                    (3 brokers, replication: 3)                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          DATA SERVICES                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │  │ PostgreSQL  │  │    Redis    │  │Elasticsearch│  │   MinIO   │  │   │
│  │  │ (Primary +  │  │  (Cluster)  │  │  (Cluster)  │  │ (Storage) │  │   │
│  │  │  Replicas)  │  │             │  │             │  │           │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 13. API RATE LIMITS

| Service | Endpoint Pattern | Rate Limit |
|---------|-----------------|------------|
| All | `/api/*` | 1000 req/min per user |
| Messages | `/api/messages/send` | 80 msg/sec per phone |
| Templates | `/api/templates` | 100 templates/hour |
| Campaigns | `/api/campaigns/start` | 10 campaigns/hour |
| Contacts | `/api/contacts/import` | 10,000 contacts/request |
| Media | `/api/media/upload` | 100 MB total/hour |

---

## 📚 14. QUICK REFERENCE - ALL ENDPOINTS

### Total Endpoints: ~150+

| Service | Endpoint Count | Key Features |
|---------|---------------|--------------|
| User Service | 35+ | Auth, Embedded Signup, WABA, Wallet |
| WhatsApp Service | 40+ | Messages, Media, Conversations, Flows |
| Template Service | 15+ | CRUD, Sync, Analytics |
| Campaign Service | 20+ | CRUD, Scheduling, A/B Testing |
| Contact Service | 25+ | CRUD, Groups, Segments, Import/Export |
| Team Service | 15+ | Departments, Agents, Routing |
| Analytics Service | 15+ | All metrics and reporting |

---

This architecture provides a complete, scalable WhatsApp Business Platform with all Meta API features, Kafka-based message processing, and embedded signup for customer onboarding.
