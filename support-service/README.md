# Support Ticket Service

Complete support ticket management system with feedback, analytics, and advanced filtering.

## Features

✅ **Ticket Management** - Create, view, update support tickets
✅ **Multi-level Support** - User → Admin workflow
✅ **Real-time Messaging** - Thread-based conversations
✅ **Feedback System** - 5-star ratings with comments
✅ **Advanced Analytics** - Dashboard with insights
✅ **Smart Filters** - Search by status, category, priority, date range
✅ **Activity Logging** - Complete audit trail
✅ **Auto-assignment** - Route tickets to agents
✅ **SLA Tracking** - Response and resolution time monitoring
✅ **Canned Responses** - Quick replies for common issues

## Quick Start

```bash
# Install dependencies
npm install

# Setup database
mysql -u root -p < src/database/schema.sql

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start service
npm run dev
```

Service runs on **http://localhost:3009**

## API Endpoints

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tickets` | Create new ticket |
| GET | `/api/tickets/my-tickets` | Get my tickets |
| GET | `/api/tickets/:id` | Get ticket details |
| POST | `/api/tickets/:id/reply` | Reply to ticket |
| POST | `/api/tickets/:id/feedback` | Submit feedback |
| POST | `/api/tickets/:id/reopen` | Reopen resolved ticket |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | Get all tickets (filtered) |
| POST | `/api/tickets/:id/assign` | Assign to agent |
| PUT | `/api/tickets/:id/status` | Update status |
| PUT | `/api/tickets/:id/priority` | Update priority |
| GET | `/api/tickets/analytics/dashboard` | Get analytics |

## Ticket Categories

- BILLING - Billing & payment issues
- TECHNICAL - Technical problems
- FEATURE_REQUEST - New feature suggestions
- BUG_REPORT - Bug reports
- ACCOUNT - Account management
- INTEGRATION - API integration help
- GENERAL - General inquiries
- OTHER - Miscellaneous

## Ticket Statuses

- OPEN - New ticket
- IN_PROGRESS - Being worked on
- WAITING_FOR_USER - Awaiting user response
- RESOLVED - Issue resolved
- CLOSED - Ticket closed
- REOPENED - Reopened after resolution

## Priority Levels

- LOW - Non-urgent
- MEDIUM - Normal priority
- HIGH - Important
- URGENT - Critical issue

## Testing

```bash
# Create ticket
curl -X POST http://localhost:3009/support-service/api/tickets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Cannot send messages",
    "description": "Getting error when trying to send WhatsApp messages",
    "category": "TECHNICAL",
    "priority": "HIGH"
  }'

# Get my tickets
curl http://localhost:3009/support-service/api/tickets/my-tickets \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get analytics (admin)
curl http://localhost:3009/support-service/api/tickets/analytics/dashboard \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Integration

```javascript
// Example: Check for open tickets before performing action
const openTicketsResponse = await fetch(
  `${SUPPORT_SERVICE_URL}/api/tickets/my-tickets?status=OPEN`,
  { headers: { Authorization: `Bearer ${token}` }}
);

const { count } = await openTicketsResponse.json();

if (count > 0) {
  // Show notification about pending support tickets
}
```

---

**Service Port:** 3009  
**Database:** MySQL  
**Cache:** Redis  
**Authentication:** JWT
