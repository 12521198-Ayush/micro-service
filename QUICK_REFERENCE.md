# Microservices Quick Reference

## Service Ports
- User Service: **3000**
- Contact Service: **3001**
- Template Service: **3003**
- Campaign Service: **3004**
- Team Service: **3005**
- WhatsApp Service: **3006**

## Quick Start Commands

### Install All Dependencies
```bash
./install.sh
```

### Start Individual Services
```bash
# Development mode (with auto-reload)
cd user-service && npm run dev
cd contact-service && npm run dev
cd template-service && npm run dev
cd campaign-service && npm run dev
cd team-service && npm run dev
cd whatsapp-service && npm run dev

# Production mode
cd <service-name> && npm start
```

### Database Setup
```bash
# Create all databases
mysql -u root -p < user-service/database/schema.sql
mysql -u root -p < contact-service/database/schema.sql
mysql -u root -p < template-service/database/schema.sql
mysql -u root -p < campaign-service/database/schema.sql
mysql -u root -p < team-service/database/schema.sql
mysql -u root -p < whatsapp-service/database/schema.sql
```

### Redis
```bash
# Start Redis
redis-server

# Check Redis
redis-cli ping
```

## API Quick Reference

### User Service (Port 3000)

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Contact Service (Port 3001)

#### Create Contact
```bash
POST /api/contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+1234567890"
}
```

#### Get All Contacts
```bash
GET /api/contacts?page=1&limit=10
Authorization: Bearer <token>
```

#### Create Group
```bash
POST /api/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Marketing Team",
  "description": "Marketing contacts"
}
```

### Template Service (Port 3003)

#### Create Template
```bash
POST /api/templates/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "welcome_message",
  "language": "en",
  "category": "MARKETING",
  "components": [...]
}
```

#### List Templates
```bash
POST /api/templates/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approve",
  "name": "welcome"
}
```

### Campaign Service (Port 3004)

#### Create Campaign
```bash
POST /api/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Summer Sale",
  "description": "Summer sale campaign",
  "templateId": "template_uuid",
  "groupId": 1,
  "scheduledAt": "2024-07-01T10:00:00Z",
  "status": "scheduled"
}
```

#### Get All Campaigns
```bash
GET /api/campaigns?status=scheduled&page=1&limit=10
Authorization: Bearer <token>
```

### Team Service (Port 3005)

#### Create Team
```bash
POST /api/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sales Team",
  "description": "Sales department team"
}
```

#### Add Team Member
```bash
POST /api/teams/:id/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 123,
  "role": "member"
}
```

### WhatsApp Service (Port 3006)

#### Send Message
```bash
POST /api/messages/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "+1234567890",
  "type": "text",
  "text": "Hello from WhatsApp API"
}
```

#### Send Template Message
```bash
POST /api/messages/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "+1234567890",
  "type": "template",
  "templateName": "welcome_message",
  "templateLanguage": "en",
  "components": [...]
}
```

#### Get Message History
```bash
GET /api/messages?status=sent&page=1&limit=20
Authorization: Bearer <token>
```

## Cache Keys Reference

### Contact Service
- `contact:{userId}:{contactId}` - Single contact
- `contacts:{userId}:p{page}:l{limit}:s{search}:f{favorite}:g{groupId}` - Contact list
- `group:{userId}:{groupId}` - Single group
- `groups:{userId}:p{page}:l{limit}` - Group list

### Template Service
- `template:{userId}:{templateUuid}` - Single template
- `templates:{userId}:s{status}:n{name}` - Template list

### Campaign Service
- `campaign:{userId}:{campaignId}` - Single campaign
- `campaigns:{userId}:s{status}:p{page}:l{limit}` - Campaign list
- `campaign:{campaignId}:stats` - Campaign statistics

### Team Service
- `team:{organizationId}:{teamId}` - Single team
- `teams:{organizationId}` - Organization teams
- `team:{teamId}:members` - Team members

### WhatsApp Service
- `message:{messageId}` - Single message
- `messages:{userId}:p{page}:l{limit}` - Message list
- `conversation:{conversationId}:messages` - Conversation messages

## Health Checks

Check if services are running:
```bash
curl http://localhost:3000/health  # User Service
curl http://localhost:3001/health  # Contact Service
curl http://localhost:3003/health  # Template Service
curl http://localhost:3004/health  # Campaign Service
curl http://localhost:3005/health  # Team Service
curl http://localhost:3006/health  # WhatsApp Service
```

## Common Issues & Solutions

### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Redis Connection Failed
```bash
# Start Redis
redis-server

# Check Redis status
redis-cli ping
# Should return: PONG
```

### Database Connection Failed
- Check MySQL is running
- Verify credentials in .env file
- Ensure database exists
- Check port number (default: 3306)

### JWT Token Invalid
- Token may be expired (default: 7 days)
- Check JWT_SECRET matches across services
- Ensure Bearer token format: `Bearer <token>`

## Environment Variables Checklist

Before starting services, ensure these are configured in each `.env` file:

✅ PORT
✅ NODE_ENV
✅ DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
✅ JWT_SECRET
✅ REDIS_URL
✅ META_ACCESS_TOKEN (for template-service, whatsapp-service)
✅ META_PHONE_NUMBER_ID (for whatsapp-service)
✅ WEBHOOK_VERIFY_TOKEN (for whatsapp-service)

## Development Tips

### Auto-reload on Changes
All services support `npm run dev` with nodemon for auto-reload during development.

### View Logs
Logs are printed to console. For production, consider using:
- Winston
- Bunyan
- PM2 logs

### Testing APIs
Recommended tools:
- Postman
- Thunder Client (VS Code extension)
- curl
- httpie

### Database Management
Recommended tools:
- MySQL Workbench
- TablePlus
- DBeaver
- phpMyAdmin

### Redis Management
Recommended tools:
- RedisInsight
- redis-cli
- Medis

## Production Deployment Checklist

- [ ] Set NODE_ENV=production
- [ ] Use strong JWT_SECRET
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Configure Redis persistence
- [ ] Use process manager (PM2)
- [ ] Set up monitoring
- [ ] Configure logging service
- [ ] Set up SSL/TLS
- [ ] Use environment-specific configs
- [ ] Set up rate limiting
- [ ] Configure firewall rules

## Useful Scripts

### Stop All Node Processes
```bash
pkill -f node
```

### Clear Redis Cache
```bash
redis-cli FLUSHALL
```

### Backup Database
```bash
mysqldump -u root -p database_name > backup.sql
```

### Restore Database
```bash
mysql -u root -p database_name < backup.sql
```

## Support & Resources

- Redis Documentation: https://redis.io/documentation
- MySQL Documentation: https://dev.mysql.com/doc/
- Express.js: https://expressjs.com/
- Node.js: https://nodejs.org/
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp

---

**Last Updated:** December 2024
