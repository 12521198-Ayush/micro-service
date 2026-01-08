# Contact Service API

A microservice for managing contacts and groups with MySQL database and JWT authentication.

## Features

- **Contact Management**: Create, read, update, and delete contacts
- **Group Management**: Organize contacts into groups
- **JWT Authentication**: Secure API endpoints with JWT token validation
- **MySQL Database**: Persistent storage with Sequelize ORM
- **RESTful API**: Well-structured API endpoints

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Set up your MySQL database:
```bash
mysql -u root -p < database/schema.sql
```

4. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

5. Update the `.env` file with your configuration:
   - Database credentials
   - JWT secret key
   - Port number

## Database Schema

The service uses three main tables:

- **groups**: Stores group information
- **contacts**: Stores contact information
- **contact_groups**: Junction table for many-to-many relationship between contacts and groups

## Running the Service

### Development mode with auto-reload:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The service will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

### Authentication
All API endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

The JWT token should contain:
```json
{
  "id": 6,
  "email": "test@gmail.com",
  "name": "Ayush"
}
```

### Groups

#### Create Group
```http
POST /api/groups
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Work Contacts",
  "description": "My work colleagues"
}
```

#### Get All Groups by User ID
```http
GET /api/groups
Authorization: Bearer <token>

Query Parameters:
- includeContacts=true (optional) - Include contacts in each group
```

#### Get Single Group
```http
GET /api/groups/:id
Authorization: Bearer <token>
```

#### Update Group
```http
PUT /api/groups/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Delete Group
```http
DELETE /api/groups/:id
Authorization: Bearer <token>
```

### Contacts

#### Create Contact
```http
POST /api/contacts
Content-Type: application/json
Authorization: Bearer <token>

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "company": "Acme Corp",
  "jobTitle": "Software Engineer",
  "notes": "Met at conference",
  "isFavorite": false
}
```

#### Get All Contacts by User ID
```http
GET /api/contacts
Authorization: Bearer <token>

Query Parameters:
- search=john (optional) - Search in firstName, lastName, email, phone
- favorite=true (optional) - Filter favorite contacts
- groupId=1 (optional) - Filter by group
- page=1 (optional) - Page number (default: 1)
- limit=10 (optional) - Items per page (default: 10)
```

#### Get Single Contact
```http
GET /api/contacts/:id
Authorization: Bearer <token>
```

#### Update Contact
```http
PUT /api/contacts/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.updated@example.com",
  "phone": "+1234567890"
}
```

#### Delete Contact
```http
DELETE /api/contacts/:id
Authorization: Bearer <token>
```

#### Assign Contacts to Group
```http
POST /api/contacts/assign-to-group
Content-Type: application/json
Authorization: Bearer <token>

{
  "contactIds": [1, 2, 3],
  "groupId": 1
}
```

#### Remove Contacts from Group
```http
POST /api/contacts/remove-from-group
Content-Type: application/json
Authorization: Bearer <token>

{
  "contactIds": [1, 2],
  "groupId": 1
}
```

#### Toggle Favorite Status
```http
PATCH /api/contacts/:id/favorite
Authorization: Bearer <token>
```

### Health Check
```http
GET /health
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]
}
```

## Project Structure

```
Contact Service/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   ├── contactController.js # Contact business logic
│   └── groupController.js   # Group business logic
├── database/
│   └── schema.sql           # MySQL database schema
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   └── errorHandler.js      # Error handling middleware
├── models/
│   ├── Contact.js           # Contact model
│   ├── Group.js             # Group model
│   ├── ContactGroup.js      # Junction table model
│   └── index.js             # Model associations
├── routes/
│   ├── contactRoutes.js     # Contact routes
│   └── groupRoutes.js       # Group routes
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── index.js                 # Application entry point
├── package.json             # Project dependencies
└── README.md                # This file
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 3000 |
| DB_HOST | MySQL host | localhost |
| DB_PORT | MySQL port | 3306 |
| DB_NAME | Database name | contact_service |
| DB_USER | Database user | root |
| DB_PASSWORD | Database password | - |
| JWT_SECRET | Secret key for JWT | - |

## Security

- All endpoints require JWT authentication
- JWT tokens are validated on every request
- User can only access their own contacts and groups
- SQL injection protection via Sequelize ORM
- Input validation using express-validator
- Security headers via Helmet.js

## Development

Run with auto-reload:
```bash
npm run dev
```

## License

ISC
