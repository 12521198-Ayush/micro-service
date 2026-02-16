# Microservices Architecture

A comprehensive microservices architecture for WhatsApp business management with user authentication, contact management, template management, campaign management, team collaboration, and messaging capabilities.

## 🏗️ Architecture Overview

This project consists of 6 independent microservices, each handling specific business logic:

### Services

| Service | Port | Description | Database |
|---------|------|-------------|----------|
| **user-service** | 3000 | User authentication, authorization, organization management | user_service |
| **contact-service** | 3001 | Contact and group management | contact_service |
| **template-service** | 3003 | WhatsApp template CRUD operations | template_service |
| **campaign-service** | 3004 | Campaign creation and management | campaign_service |
| **team-service** | 3005 | Team and member management | team_service |
| **whatsapp-service** | 3006 | WhatsApp message sending and webhook handling | whatsapp_service |

## 📁 Project Structure

Each microservice follows a consistent structure:

```
service-name/
├── src/
│   ├── config/
│   │   ├── database.js      # MySQL connection pool
│   │   └── redis.js         # Redis cache configuration
│   ├── controllers/         # Request handlers
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication
│   │   └── errorHandler.js  # Error handling
│   ├── models/              # Database models
│   ├── routes/              # API route definitions
│   ├── utils/
│   │   └── cacheKeys.js     # Cache key generators
│   └── app.js               # Application entry point
├── database/
│   └── schema.sql           # Database schema
├── package.json
└── .env.example             # Environment variables template
```

## ✨ Features

### Common Features (All Services)
- ✅ **Redis Caching**: Optimized performance with Redis caching layer
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Error Handling**: Centralized error handling middleware
- ✅ **Security**: Helmet.js for HTTP security headers
- ✅ **CORS**: Cross-Origin Resource Sharing enabled
- ✅ **Request Logging**: Morgan logger for HTTP requests
- ✅ **Health Checks**: Health endpoint for monitoring
- ✅ **ES Modules**: Modern JavaScript module system

### Service-Specific Features

#### User Service
- User registration and login
- Password hashing with bcrypt
- JWT token generation
- Organization management
- Password reset functionality
- User profile management

#### Contact Service
- Contact CRUD operations
- Group management
- Contact-to-group assignments
- Favorite contacts
- Search and filtering
- Pagination support

#### Template Service
- WhatsApp template creation
- Template listing with filters
- Template updates
- Direct Meta API integration
- Template status tracking

#### Campaign Service
- Campaign creation and scheduling
- Campaign status management
- Campaign analytics tracking
- Bulk message campaigns
- Campaign history

#### Team Service
- Team creation and management
- Team member management
- Role-based access (admin, member, viewer)
- Organization-based teams

#### WhatsApp Service
- Send text and template messages
- Message status tracking
- Webhook handling for status updates
- Message delivery confirmation
- Read receipts

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MySQL (v8 or higher)
- Redis (v6 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd microservices
   ```

2. **Install dependencies for each service**
   ```bash
   # User Service
   cd user-service && npm install

   # Contact Service
   cd ../contact-service && npm install

   # Template Service
   cd ../template-service && npm install

   # Campaign Service
   cd ../campaign-service && npm install

   # Team Service
   cd ../team-service && npm install

   # WhatsApp Service
   cd ../whatsapp-service && npm install
   ```

3. **Configure environment variables**
   
   For each service, copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```

4. **Create databases**
   ```bash
   # Run the schema.sql file for each service
   mysql -u root -p < user-service/database/schema.sql
   mysql -u root -p < contact-service/database/schema.sql
   mysql -u root -p < template-service/database/schema.sql
   mysql -u root -p < campaign-service/database/schema.sql
   mysql -u root -p < team-service/database/schema.sql
   mysql -u root -p < whatsapp-service/database/schema.sql
   ```

5. **Start Redis**
   ```bash
   redis-server
   ```

6. **Start each service**
   ```bash
   # Start all services in separate terminals
   cd user-service && npm start
   cd contact-service && npm start
   cd template-service && npm start
   cd campaign-service && npm start
   cd team-service && npm start
   cd whatsapp-service && npm start
   ```

   Or use development mode with auto-reload:
   ```bash
   npm run dev
   ```

## 📝 API Documentation

### Health Check Endpoints

All services expose a health check endpoint:

```
GET /health
```

Response:
```json
{
  "success": true,
  "message": "Service is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Key API Endpoints

#### User Service (Port 3000)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/organization` - Create organization

#### Contact Service (Port 3001)
- `POST /api/contacts` - Create contact
- `GET /api/contacts` - Get all contacts
- `GET /api/contacts/:id` - Get single contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/groups` - Create group
- `GET /api/groups` - Get all groups

#### Template Service (Port 3003)
- `POST /api/templates/create` - Create template
- `POST /api/templates/list` - List templates
- `POST /api/templates/update/:uuid` - Update template

#### Campaign Service (Port 3004)
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns` - Get all campaigns
- `GET /api/campaigns/:id` - Get single campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

#### Team Service (Port 3005)
- `POST /api/teams` - Create team
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get single team
- `POST /api/teams/:id/members` - Add team member
- `GET /api/teams/:id/members` - Get team members

#### WhatsApp Service (Port 3006)
- `POST /api/messages/send` - Send message
- `GET /api/messages` - Get message history
- `GET /api/messages/:id` - Get single message
- `POST /api/messages/webhook` - Webhook for status updates

## 🔧 Configuration

### Environment Variables

Each service requires specific environment variables. Refer to `.env.example` in each service directory.

### Common Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=service_name

# JWT
JWT_SECRET=your_secret_key

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
```

## 🗄️ Caching Strategy

All services implement Redis caching with the following patterns:

### Cache TTL (Time To Live)
- **List queries**: 5 minutes (300 seconds)
- **Single item queries**: 10 minutes (600 seconds)
- **Message history**: 2 minutes (120 seconds)

### Cache Invalidation
- Caches are automatically invalidated on CREATE, UPDATE, and DELETE operations
- Pattern-based cache deletion for related data

### Cache Keys Format
```
# Examples
contact:{userId}:{contactId}
contacts:{userId}:p{page}:l{limit}:s{search}
template:{userId}:{templateUuid}
campaign:{userId}:{campaignId}
```

## 🔐 Security

### Implemented Security Measures
- JWT-based authentication
- Password hashing with bcrypt
- Helmet.js security headers
- CORS configuration
- SQL injection prevention with parameterized queries
- Input validation
- Error message sanitization

## 📊 Database Schema

Each service has its own database. Check `database/schema.sql` in each service directory for complete schemas.

## 🧪 Testing

```bash
# Run tests (to be implemented)
npm test
```

## 🚢 Deployment

### Docker Deployment (Recommended)

Create `docker-compose.yml` for all services:

```yaml
version: '3.8'
services:
  user-service:
    build: ./user-service
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - mysql
      - redis

  # Add other services...

  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: your_password

  redis:
    image: redis:6-alpine
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start user-service/src/app.js --name user-service
pm2 start contact-service/src/app.js --name contact-service
# ... repeat for other services

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

## 📈 Monitoring

### Health Checks

Each service exposes a `/health` endpoint for monitoring.

### Logging

- Development: Console logs with Morgan
- Production: Consider integrating with logging services (Winston, Bunyan)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

ISC

## 🆘 Support

For support, please open an issue in the repository.

## 🗺️ Roadmap

- [ ] Add comprehensive unit tests
- [ ] Implement integration tests
- [ ] Add Docker support
- [ ] API documentation with Swagger
- [ ] Rate limiting
- [ ] Request validation middleware
- [ ] Distributed tracing
- [ ] Metrics collection
- [ ] CI/CD pipeline
- [ ] Message queue integration (RabbitMQ/Kafka)

## 📝 Notes

- All services use ES modules (type: "module")
- Redis is optional - services will work without it (caching disabled)
- Make sure to update JWT_SECRET in production
- Configure CORS origins for production
- Set up proper database backups
- Monitor Redis memory usage

---

**Built with ❤️ using Node.js, Express, MySQL, and Redis**
