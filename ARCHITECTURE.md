# Microservices Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT APPLICATIONS                        │
│                     (Web, Mobile, Third-party Apps)                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP/HTTPS
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                         API GATEWAY (Optional)                       │
│                    Load Balancer / Nginx / Kong                      │
└──┬───────┬────────┬────────┬────────┬────────┬────────────────────┬─┘
   │       │        │        │        │        │                    │
   │       │        │        │        │        │                    │
┌──▼───┐ ┌─▼────┐ ┌─▼─────┐ ┌─▼─────┐ ┌─▼────┐ ┌─▼──────┐        │
│ User │ │Contact│ │Template│ │Campaign│ │ Team │ │WhatsApp│        │
│Service│ │Service│ │Service│ │Service│ │Service│ │Service│        │
│:3000 │ │:3001 │ │:3003 │ │:3004 │ │:3005 │ │:3006  │        │
└──┬───┘ └─┬────┘ └─┬─────┘ └─┬─────┘ └─┬────┘ └─┬──────┘        │
   │       │        │        │        │        │                    │
   │       │        │        │        │        │                    │
┌──▼───────▼────────▼────────▼────────▼────────▼────────────────────▼─┐
│                           Redis Cache Layer                           │
│                          (localhost:6379)                            │
└──────────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                        MySQL Databases                               │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐          │
│  │   user_  │ contact_ │ template_│ campaign_│  team_   │          │
│  │ service  │ service  │ service  │ service  │ service  │          │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘          │
│              ┌──────────────────────┐                                │
│              │  whatsapp_service    │                                │
│              └──────────────────────┘                                │
└──────────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                     External Services                                │
│                 Meta WhatsApp Business API                           │
│                    (graph.facebook.com)                              │
└──────────────────────────────────────────────────────────────────────┘
```

## Service Communication Flow

### 1. User Authentication Flow
```
Client → User Service → Database → Redis Cache → Response
         (Login/Register)
```

### 2. Contact Management Flow
```
Client → Contact Service → Auth (JWT) → Database → Cache → Response
         (CRUD Operations)
```

### 3. Template Management Flow
```
Client → Template Service → Auth → Meta API → Database → Cache
         (Create Template)    ↓                  ↓
                           Response         Save Status
```

### 4. Campaign Creation Flow
```
Client → Campaign Service → Auth → Get Contacts → Get Template
              ↓                    (Contact Service)  (Template Service)
         Create Campaign                               
              ↓
         Save to DB → Cache → Response
```

### 5. Message Sending Flow
```
Client → WhatsApp Service → Auth → Meta WhatsApp API
              ↓                           ↓
         Save to DB                  Send Message
              ↓                           ↓
         Cache Update ←──────────── Status Update
              ↓
         Response to Client
```

### 6. Webhook Handling Flow
```
Meta API → WhatsApp Service → Update Status → Database
  (Status    (Webhook Endpoint)     ↓
   Update)                    Invalidate Cache
                                     ↓
                              Notify Client (Optional)
```

## Data Flow Between Services

### Campaign Execution Flow
```
┌──────────────┐
│  Campaign    │ 1. Get Campaign Details
│  Service     │────────────────────────────┐
└──────────────┘                            │
       │                                     ▼
       │ 2. Get Template           ┌─────────────────┐
       └───────────────────────────►│Template Service│
       │                            └─────────────────┘
       │ 3. Get Contacts                    │
       └───────────────────────────┐        │
       │                            ▼        │
       │                   ┌─────────────────┴┐
       │                   │ Contact Service  │
       │                   └──────────────────┘
       │                            │
       │ 4. Send Messages           │
       └───────────────────┐        │
                           ▼        │
                  ┌────────────────▼┴┐
                  │ WhatsApp Service │
                  └──────────────────┘
                           │
                           ▼
                  Meta WhatsApp API
```

## Service Dependencies

```
User Service (Core - No Dependencies)
    │
    ├─► Contact Service (Depends on User Service for Auth)
    │       │
    │       └─► Campaign Service (Depends on Contact Service)
    │
    ├─► Template Service (Depends on User Service for Auth)
    │       │
    │       └─► Campaign Service (Depends on Template Service)
    │
    ├─► Team Service (Depends on User Service for Auth & Org)
    │
    └─► WhatsApp Service (Depends on User Service for Auth)
            │
            └─► Campaign Service (Uses WhatsApp Service)
```

## Tech Stack

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js v5
- **Language**: JavaScript (ES Modules)

### Database
- **Primary DB**: MySQL v8
- **Cache**: Redis v6

### Security
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **HTTP Security**: Helmet.js
- **CORS**: cors package

### Middleware
- **Logging**: Morgan
- **Body Parsing**: Express built-in
- **Security Headers**: Helmet

### External APIs
- **WhatsApp**: Meta Graph API v20.0

## Key Features by Service

### 🔐 User Service
- User registration & login
- JWT token management
- Organization management
- Password reset
- Profile management

### 📇 Contact Service
- Contact CRUD
- Group management
- Contact-group associations
- Search & filtering
- Favorites
- **Cache**: 5-10 min TTL

### 📄 Template Service
- Template CRUD
- Meta API integration
- Template status sync
- Version management
- **Cache**: 5-10 min TTL

### 📊 Campaign Service
- Campaign scheduling
- Batch processing
- Status tracking
- Analytics
- **Cache**: 5-10 min TTL

### 👥 Team Service
- Team management
- Member management
- Role-based access
- Organization hierarchy
- **Cache**: 5-10 min TTL

### 💬 WhatsApp Service
- Message sending
- Status tracking
- Webhook handling
- Delivery confirmation
- **Cache**: 2-10 min TTL

## Cache Strategy

### Cache Hit Flow
```
Request → Check Cache → Cache Hit → Return Cached Data
```

### Cache Miss Flow
```
Request → Check Cache → Cache Miss → Query DB → Store in Cache → Return Data
```

### Cache Invalidation
```
Write Operation → Update DB → Delete Cache Keys → Success Response
```

### Cache Patterns
- **User Contacts**: `contacts:{userId}:*`
- **User Templates**: `templates:{userId}:*`
- **User Campaigns**: `campaigns:{userId}:*`
- **Team Members**: `team:{teamId}:members`
- **Messages**: `messages:{userId}:*`

## Performance Optimizations

1. **Database Connection Pooling**
   - Max 10 connections per service
   - Reuse connections
   - Auto-reconnect

2. **Redis Caching**
   - Reduce database load
   - Fast data retrieval
   - Automatic expiration

3. **Pagination**
   - Limit query results
   - Reduce payload size
   - Improve response time

4. **Indexed Queries**
   - Database indexes on frequently queried fields
   - Faster lookups

5. **Async Operations**
   - Non-blocking I/O
   - Promise-based operations

## Security Measures

1. **Authentication**
   - JWT tokens
   - Token expiration
   - Refresh tokens (optional)

2. **Authorization**
   - Role-based access
   - Organization-level isolation
   - Resource ownership validation

3. **Data Protection**
   - Password hashing
   - SQL injection prevention
   - XSS protection

4. **Network Security**
   - CORS configuration
   - Helmet security headers
   - HTTPS (recommended)

## Monitoring & Observability

### Health Checks
- `/health` endpoint on each service
- Returns service status
- Used by load balancers

### Logging
- Request/response logging
- Error logging
- Performance metrics

### Recommended Tools
- **APM**: New Relic, DataDog
- **Logging**: Winston, Bunyan
- **Monitoring**: Prometheus + Grafana
- **Tracing**: Jaeger, Zipkin

## Scalability Considerations

### Horizontal Scaling
- Stateless services
- Load balancer distribution
- Session management with Redis

### Database Scaling
- Read replicas
- Sharding by user/organization
- Connection pooling

### Cache Scaling
- Redis cluster
- Cache warming
- TTL optimization

### Message Queue (Future)
- RabbitMQ / Kafka
- Async message processing
- Event-driven architecture

---

**Architecture Version:** 1.0
**Last Updated:** December 2024
