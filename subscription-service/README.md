# Subscription Service - WhatsApp Business API Platform

A complete subscription and billing microservice for WhatsApp Business API SaaS platform with Indian pricing (INR ₹).

## 🚀 Features

### Core Features
- ✅ **5 Subscription Tiers**: Free, Starter, Professional, Enterprise, Lifetime
- ✅ **Multiple Billing Cycles**: Monthly, Yearly, Lifetime options
- ✅ **Indian Pricing**: All amounts in INR (₹)
- ✅ **Feature-Based Limits**: Contacts, templates, campaigns, messages
- ✅ **Real-time Usage Tracking**: Monitor usage against plan limits
- ✅ **Promo Codes**: Discount system with validation
- ✅ **Transaction History**: Complete billing audit trail
- ✅ **Auto-Renewal**: Automatic subscription renewals
- ✅ **Redis Caching**: Optimized performance
- ✅ **JWT Authentication**: Secure API access

### Technical Features
- RESTful API architecture
- MySQL database with optimized indexes
- Redis caching layer
- Comprehensive error handling
- Detailed logging
- CORS enabled
- Helmet security
- Rate limiting ready

## 📋 Prerequisites

- Node.js v18 or higher
- MySQL v8 or higher
- Redis v6 or higher
- User Service running (for authentication)

## 🛠️ Installation

### 1. Clone and Setup

```bash
# Navigate to project directory
cd subscription-service

# Install dependencies
npm install
```

### 2. Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Create database and run schema
source database/schema.sql
```

This will:
- Create `subscription_service` database
- Create all required tables
- Insert default subscription plans (Free, Starter, Professional, Enterprise, Lifetime)

### 3. Redis Setup

```bash
# Start Redis server
redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 4. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Environment Variables:**

```env
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

# JWT (MUST match User Service)
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Payment Gateway (Optional for testing)
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 5. Start the Service

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The service will start on **http://localhost:3007**

## 📊 Default Subscription Plans

The service comes with 5 pre-configured plans:

| Plan | Monthly | Yearly | Lifetime | Contacts | Messages/Month |
|------|---------|--------|----------|----------|----------------|
| **Free** | ₹0 | ₹0 | - | 100 | 500 |
| **Starter** | ₹999 | ₹9,999 | - | 1,000 | 5,000 |
| **Professional** | ₹2,999 | ₹29,999 | - | 10,000 | 50,000 |
| **Enterprise** | ₹9,999 | ₹99,999 | - | Unlimited | Unlimited |
| **Lifetime** | - | - | ₹1,99,999 | Unlimited | Unlimited |

## 🔌 API Endpoints

### Plans Management (Public)
```
GET    /api/plans                    - Get all plans
GET    /api/plans/:planId            - Get single plan
GET    /api/plans-compare            - Compare multiple plans
GET    /api/plans/:planId/pricing    - Get plan pricing
```

### Subscriptions (Protected)
```
POST   /api/subscriptions/subscribe              - Subscribe to a plan
GET    /api/subscriptions/current                - Get current subscription
GET    /api/subscriptions/history                - Get subscription history
POST   /api/subscriptions/:id/cancel             - Cancel subscription
PUT    /api/subscriptions/:id/auto-renew         - Toggle auto-renewal
```

### Usage Tracking (Protected)
```
GET    /api/usage/current                        - Get current usage
GET    /api/usage/check-limit/:limitType         - Check specific limit
GET    /api/usage/history                        - Get usage history
```

### Transactions (Protected)
```
GET    /api/transactions                         - Get transaction history
GET    /api/transactions/:transactionId          - Get single transaction
GET    /api/transactions/stats/revenue           - Get total revenue
```

### Promo Codes
```
GET    /api/promo-codes/active                   - Get active promo codes (Public)
POST   /api/promo-codes/validate                 - Validate promo code (Protected)
POST   /api/promo-codes/calculate-discount       - Calculate discount (Protected)
```

## 🧪 Testing

### 1. Health Check

```bash
curl http://localhost:3007/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Subscription Service is running",
  "timestamp": "2025-01-30T10:00:00.000Z",
  "service": "subscription-service",
  "version": "1.0.0"
}
```

### 2. Get Available Plans (No Auth Required)

```bash
curl http://localhost:3007/subscription-service/api/plans
```

### 3. Subscribe to a Plan (Requires Auth)

```bash
# First, get JWT token from User Service (port 3000)
# Then use it to subscribe

curl -X POST http://localhost:3007/subscription-service/api/subscriptions/subscribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": 2,
    "billingCycle": "MONTHLY",
    "promoCode": "LAUNCH50"
  }'
```

### 4. Check Current Subscription

```bash
curl http://localhost:3007/subscription-service/api/subscriptions/current \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Check Usage Limits

```bash
curl http://localhost:3007/subscription-service/api/usage/current \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🏗️ Architecture Integration

### Service Communication

```
┌─────────────────┐
│  User Service   │ ← JWT Authentication
│    (Port 3000)  │
└────────┬────────┘
         │
         │ Verify Token
         ▼
┌─────────────────────────────┐
│  Subscription Service       │
│     (Port 3007)             │
│                             │
│  • Plans & Pricing          │
│  • Subscription Management  │
│  • Usage Tracking           │
│  • Limit Enforcement        │
└────────┬────────────────────┘
         │
         │ Check Limits
         ▼
┌─────────────────────────────┐
│  Other Services             │
│  • Contact Service          │
│  • Template Service         │
│  • Campaign Service         │
└─────────────────────────────┘
```

### How Other Services Check Limits

```javascript
// Example: Contact Service checking before adding contact

const checkLimit = await fetch(
  'http://localhost:3007/subscription-service/api/usage/check-limit/contacts',
  {
    headers: {
      Authorization: `Bearer ${userToken}`
    }
  }
);

const { data } = await checkLimit.json();

if (!data.canProceed) {
  return res.status(403).json({
    error: 'Contact limit reached',
    message: 'Please upgrade your plan to add more contacts',
    current: data.current,
    limit: data.limit
  });
}

// Proceed with operation...
```

## 📁 Project Structure

```
subscription-service/
├── src/
│   ├── config/
│   │   ├── database.js          # MySQL configuration
│   │   └── redis.js             # Redis cache configuration
│   ├── controllers/
│   │   ├── planController.js     # Plans management
│   │   ├── subscriptionController.js  # Subscriptions
│   │   ├── usageController.js    # Usage tracking
│   │   ├── transactionController.js   # Transactions
│   │   └── promoController.js    # Promo codes
│   ├── middleware/
│   │   └── auth.js              # JWT verification
│   ├── models/
│   │   ├── SubscriptionPlan.js  # Plans model
│   │   ├── UserSubscription.js  # Subscriptions model
│   │   ├── SubscriptionTransaction.js  # Transactions model
│   │   ├── UsageTracking.js     # Usage model
│   │   └── PromoCode.js         # Promo codes model
│   ├── routes/
│   │   ├── planRoutes.js        # Plans routes
│   │   ├── subscriptionRoutes.js  # Subscription routes
│   │   ├── usageRoutes.js       # Usage routes
│   │   ├── transactionRoutes.js  # Transaction routes
│   │   └── promoRoutes.js       # Promo code routes
│   ├── database/
│   │   └── schema.sql           # Complete database schema
│   └── app.js                   # Main application
├── .env.example                 # Environment template
├── package.json                 # Dependencies
├── API_DOCUMENTATION.md         # Comprehensive API docs
└── README.md                    # This file
```

## 🔒 Security

### Authentication
- All protected endpoints require JWT token
- Token must be obtained from User Service
- Token format: `Authorization: Bearer <token>`

### Data Protection
- Password never stored (handled by User Service)
- SQL injection prevention via parameterized queries
- XSS protection via Helmet
- CORS configuration
- Redis encryption support

### Payment Security
- Razorpay secure integration
- Payment verification
- Transaction audit trail
- Refund tracking

## 🎯 Usage Limits

### How Limits Work

1. **Plan-Based**: Each plan has specific limits
2. **Monthly Reset**: Campaign and message limits reset monthly
3. **Real-Time Tracking**: Usage tracked as actions occur
4. **Enforcement**: Services check before operations

### Limit Types

| Type | Description | Reset |
|------|-------------|-------|
| Contacts | Total stored contacts | Never |
| Templates | Total message templates | Never |
| Campaigns | Campaigns per month | Monthly |
| Messages | Messages per month | Monthly |
| Team Members | Team members added | Never |
| WhatsApp Numbers | Connected numbers | Never |

### Integration Example

```javascript
// Before creating contact
const limit = await checkLimit('contacts', userId);

if (!limit.canProceed) {
  throw new Error('Limit reached');
}

// Create contact
await createContact(data);

// Increment usage
await incrementUsage('contacts', userId);
```

## 💳 Payment Integration

### Razorpay Setup (Recommended for India)

1. **Create Account**: https://razorpay.com
2. **Get API Keys**: Dashboard → Settings → API Keys
3. **Add to .env**:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxxx
   ```
4. **Configure Webhooks**: Dashboard → Webhooks → Add endpoint

### Payment Flow

1. User selects plan and billing cycle
2. Backend creates subscription record
3. Backend creates Razorpay order
4. Frontend opens Razorpay checkout
5. User completes payment
6. Razorpay webhook updates status
7. Subscription activated

## 📈 Monitoring

### Health Check Endpoint

```bash
GET /health
```

Returns service status, database connection, Redis connection.

### Logging

The service logs:
- All API requests (Morgan)
- Database queries
- Cache hits/misses
- Payment events
- Subscription changes

### Metrics to Monitor

- Active subscriptions by plan
- Monthly recurring revenue (MRR)
- Churn rate
- Average revenue per user (ARPU)
- Usage patterns
- Limit violations

## 🐛 Troubleshooting

### Common Issues

**1. Service Won't Start**
```bash
# Check if port 3007 is in use
lsof -i :3007

# Kill process if needed
kill -9 <PID>
```

**2. Database Connection Failed**
```bash
# Verify MySQL is running
sudo systemctl status mysql

# Check credentials in .env
# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"
```

**3. Redis Connection Failed**
```bash
# Verify Redis is running
redis-cli ping

# Check Redis URL in .env
```

**4. JWT Token Invalid**
```bash
# Ensure JWT_SECRET matches User Service
# Check token expiration
# Verify Authorization header format
```

**5. Promo Code Not Working**
- Check if code is active
- Verify validity dates
- Check usage limits
- Ensure code applies to selected plan

## 🚧 Development

### Adding New Plans

```sql
INSERT INTO subscription_plans (
  plan_code, plan_name, plan_description, plan_type,
  monthly_price, yearly_price,
  max_contacts, max_templates, max_campaigns_per_month,
  max_messages_per_month, max_team_members, max_whatsapp_numbers,
  -- ... other fields
) VALUES (
  'CUSTOM', 'Custom Plan', 'Custom description', 'CUSTOM',
  1999.00, 19999.00,
  5000, 25, 50,
  25000, 5, 2,
  -- ... other values
);
```

### Creating Promo Codes

```sql
INSERT INTO promo_codes (
  code, description, discount_type, discount_value,
  valid_from, valid_until, max_uses
) VALUES (
  'NEWYEAR50', '50% off New Year sale', 'PERCENTAGE', 50.00,
  '2025-01-01', '2025-01-31', 100
);
```

### Adding New Features

1. Update database schema if needed
2. Update model with new methods
3. Add controller functions
4. Create/update routes
5. Update API documentation
6. Test thoroughly

## 📚 Documentation

- **API Documentation**: See `API_DOCUMENTATION.md`
- **Database Schema**: See `src/database/schema.sql`
- **Architecture**: See microservices architecture document

## 🤝 Integration with Other Services

### User Service (Port 3000)
- Provides JWT authentication
- User management
- Profile data

### Contact Service (Port 3001)
- Checks contact limits before adding
- Reports usage

### Template Service (Port 3003)
- Checks template limits
- Reports usage

### Campaign Service (Port 3004)
- Checks campaign limits
- Reports message usage

### WhatsApp Service (Port 3006)
- Reports message delivery
- Tracks message types

## 🎓 Best Practices

1. **Always check limits** before operations
2. **Report usage immediately** after operations
3. **Handle limit errors gracefully** with upgrade prompts
4. **Cache subscription data** to reduce database load
5. **Validate promo codes** before applying
6. **Monitor usage patterns** for anomalies
7. **Test payment flows** thoroughly
8. **Keep audit logs** of all transactions

## 📞 Support

For issues or questions:
1. Check API Documentation
2. Review error messages
3. Check logs
4. Verify environment variables
5. Test database connectivity
6. Verify Redis connection

## 📄 License

MIT License - See LICENSE file for details

## 👥 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

**Version:** 1.0.0  
**Currency:** INR (₹)  
**Service Port:** 3007  
**Database:** MySQL  
**Cache:** Redis  
**Authentication:** JWT (from User Service)  
**Language:** JavaScript (ES Modules)  
**Node Version:** >=18.0.0
