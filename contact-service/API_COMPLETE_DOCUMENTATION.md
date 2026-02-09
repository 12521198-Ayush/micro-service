# Contact Service API - Complete Documentation

## Base Information

- **Base URL:** `http://localhost:3001`
- **Authorization:** Bearer Token (JWT)
- **Content-Type:** `application/json`

### JWT Token Format
```json
{
  "id": 6,
  "email": "test@gmail.com",
  "name": "Ayush"
}
```

---

## Table of Contents

1. [Health Check](#health-check)
2. [Groups API](#groups-api)
3. [Contacts API](#contacts-api)
4. [Response Formats](#response-formats)
5. [Error Handling](#error-handling)
6. [Quick Start Guide](#quick-start-guide)

---

## Health Check

### Check Service Status
- **Endpoint:** `GET /health`
- **Authentication:** Not required

**Example:**
```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "success": true,
  "message": "Contact Service is running",
  "timestamp": "2025-12-19T10:30:00.000Z"
}
```

---

## Groups API

### 1. Create Group

Create a new group for the authenticated user.

- **Endpoint:** `POST /api/groups`
- **Authentication:** Required
- **Methods:** POST

**Request Body:**
```json
{
  "name": "Work Contacts",
  "description": "My work colleagues and professional network"
}
```

**Validation Rules:**
- `name`: Required, max 100 characters
- `description`: Optional

**Example:**
```bash
curl -X POST http://localhost:3001/api/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Work Contacts","description":"My work colleagues"}'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Group created successfully",
  "data": {
    "id": 1,
    "userId": 6,
    "name": "Work Contacts",
    "description": "My work colleagues",
    "createdAt": "2025-12-19T10:30:00.000Z",
    "updatedAt": "2025-12-19T10:30:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Group with this name already exists"
}
```

---

### 2. Get All Groups for Current User

Get all groups belonging to the authenticated user.

- **Endpoint:** 
  - `GET /api/groups`
  - `POST /api/groups/list`
- **Authentication:** Required
- **Methods:** GET, POST

**Query Parameters:**
- `includeContacts` (optional): `true` to include contacts in each group

**Examples:**
```bash
# Basic request
curl http://localhost:3001/api/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Include contacts
curl "http://localhost:3001/api/groups?includeContacts=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Using POST method
curl -X POST http://localhost:3001/api/groups/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "userId": 6,
      "name": "Work Contacts",
      "description": "My work colleagues",
      "createdAt": "2025-12-19T10:30:00.000Z",
      "updatedAt": "2025-12-19T10:30:00.000Z",
      "contacts": []
    }
  ]
}
```

---

### 3. Get All Groups (Admin)

Get all groups from all users with pagination.

- **Endpoint:** 
  - `GET /api/groups/all`
  - `POST /api/groups/all`
- **Authentication:** Required
- **Methods:** GET, POST

**Query Parameters:**
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 50
- `includeContacts` (optional): `true` to include contacts
- `userId` (optional): Filter by specific user ID

**Examples:**
```bash
# Get all groups
curl http://localhost:3001/api/groups/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# With pagination
curl "http://localhost:3001/api/groups/all?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by user
curl "http://localhost:3001/api/groups/all?userId=6" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "total": 45,
  "totalPages": 3,
  "currentPage": 1,
  "data": [...]
}
```

---

### 4. Get Single Group by ID

Get details of a specific group.

- **Endpoint:** 
  - `GET /api/groups/:id`
  - `POST /api/groups/detail/:id`
- **Authentication:** Required
- **Methods:** GET, POST

**Examples:**
```bash
# Using GET
curl http://localhost:3001/api/groups/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Using POST
curl -X POST http://localhost:3001/api/groups/detail/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 6,
    "name": "Work Contacts",
    "description": "My work colleagues",
    "contacts": [],
    "createdAt": "2025-12-19T10:30:00.000Z",
    "updatedAt": "2025-12-19T10:30:00.000Z"
  }
}
```

---

### 5. Update Group

Update an existing group.

- **Endpoint:** 
  - `PUT /api/groups/:id`
  - `POST /api/groups/update/:id`
- **Authentication:** Required
- **Methods:** PUT, POST

**Request Body:**
```json
{
  "name": "Updated Group Name",
  "description": "Updated description"
}
```

**Examples:**
```bash
# Using PUT
curl -X PUT http://localhost:3001/api/groups/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","description":"Updated description"}'

# Using POST
curl -X POST http://localhost:3001/api/groups/update/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","description":"Updated description"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Group updated successfully",
  "data": {
    "id": 1,
    "userId": 6,
    "name": "Updated Name",
    "description": "Updated description",
    "createdAt": "2025-12-19T10:30:00.000Z",
    "updatedAt": "2025-12-19T10:35:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Group with this name already exists"
}
```

---

### 6. Delete Group

Delete a group and all its contact associations.

- **Endpoint:** 
  - `DELETE /api/groups/:id`
  - `POST /api/groups/delete/:id`
- **Authentication:** Required
- **Methods:** DELETE, POST

**Examples:**
```bash
# Using DELETE
curl -X DELETE http://localhost:3001/api/groups/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Using POST
curl -X POST http://localhost:3001/api/groups/delete/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Group deleted successfully"
}
```

---

## Contacts API

### 1. Create Contact

Create a new contact for the authenticated user.

- **Endpoint:** `POST /api/contacts`
- **Authentication:** Required
- **Methods:** POST

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "countryCode": "+1",
  "company": "Acme Corporation",
  "jobTitle": "Software Engineer",
  "notes": "Met at tech conference 2025",
  "isFavorite": false
}
```

**Validation Rules:**
- `firstName`: Required, max 50 characters
- `lastName`: Required, max 50 characters
- `email`: Required, valid email format
- `phone`: Required
- `countryCode`: Optional, format: +1, +91, etc. (default: +1)
- `company`: Optional, max 100 characters
- `jobTitle`: Optional, max 100 characters
- `notes`: Optional
- `isFavorite`: Optional, boolean

**Example:**
```bash
curl -X POST http://localhost:3001/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"John",
    "lastName":"Doe",
    "email":"john.doe@example.com",
    "phone":"1234567890",
    "countryCode":"+1",
    "company":"Acme Corp",
    "jobTitle":"Software Engineer"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Contact created successfully",
  "data": {
    "id": 1,
    "userId": 6,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "1234567890",
    "countryCode": "+1",
    "company": "Acme Corporation",
    "jobTitle": "Software Engineer",
    "notes": "Met at tech conference 2025",
    "isFavorite": false,
    "createdAt": "2025-12-19T10:30:00.000Z",
    "updatedAt": "2025-12-19T10:30:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Contact with this phone number already exists"
}
```

---

### 2. Get All Contacts for Current User

Get all contacts belonging to the authenticated user with pagination and filters.

- **Endpoint:** 
  - `GET /api/contacts`
  - `POST /api/contacts/list`
- **Authentication:** Required
- **Methods:** GET, POST

**Query Parameters:**
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 10
- `search` (optional): Search in firstName, lastName, email, phone
- `favorite` (optional): `true` to filter favorites only
- `groupId` (optional): Filter by group ID

**Examples:**
```bash
# Basic request
curl http://localhost:3001/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# With pagination
curl "http://localhost:3001/api/contacts?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Search
curl "http://localhost:3001/api/contacts?search=john" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter favorites
curl "http://localhost:3001/api/contacts?favorite=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by group
curl "http://localhost:3001/api/contacts?groupId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Using POST method
curl -X POST "http://localhost:3001/api/contacts/list?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "totalPages": 5,
  "currentPage": 1,
  "data": [
    {
      "id": 1,
      "userId": 6,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "1234567890",
      "countryCode": "+1",
      "company": "Acme Corp",
      "jobTitle": "Software Engineer",
      "notes": null,
      "isFavorite": false,
      "groups": [],
      "createdAt": "2025-12-19T10:30:00.000Z",
      "updatedAt": "2025-12-19T10:30:00.000Z"
    }
  ]
}
```

---

### 3. Get Single Contact by ID

Get details of a specific contact.

- **Endpoint:** 
  - `GET /api/contacts/:id`
  - `POST /api/contacts/detail/:id`
- **Authentication:** Required
- **Methods:** GET, POST

**Examples:**
```bash
# Using GET
curl http://localhost:3001/api/contacts/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Using POST
curl -X POST http://localhost:3001/api/contacts/detail/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 6,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "1234567890",
    "countryCode": "+1",
    "company": "Acme Corp",
    "jobTitle": "Software Engineer",
    "notes": null,
    "isFavorite": false,
    "groups": [],
    "createdAt": "2025-12-19T10:30:00.000Z",
    "updatedAt": "2025-12-19T10:30:00.000Z"
  }
}
```

---

### 4. Update Contact

Update an existing contact.

- **Endpoint:** 
  - `PUT /api/contacts/:id`
  - `POST /api/contacts/update/:id`
- **Authentication:** Required
- **Methods:** PUT, POST

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "9876543210",
  "countryCode": "+1",
  "company": "Tech Corp",
  "jobTitle": "Senior Developer",
  "notes": "Updated contact information"
}
```

**Examples:**
```bash
# Using PUT
curl -X PUT http://localhost:3001/api/contacts/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Smith","email":"john.smith@example.com","phone":"9876543210","countryCode":"+1"}'

# Using POST
curl -X POST http://localhost:3001/api/contacts/update/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Smith","email":"john.smith@example.com","phone":"9876543210","countryCode":"+1"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Contact updated successfully",
  "data": {
    "id": 1,
    "userId": 6,
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@example.com",
    "phone": "9876543210",
    "countryCode": "+1",
    "company": "Tech Corp",
    "jobTitle": "Senior Developer",
    "notes": "Updated contact information",
    "isFavorite": false,
    "createdAt": "2025-12-19T10:30:00.000Z",
    "updatedAt": "2025-12-19T10:35:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Contact with this phone number already exists"
}
```

---

### 5. Delete Contact

Delete a contact and all its group associations.

- **Endpoint:** 
  - `DELETE /api/contacts/:id`
  - `POST /api/contacts/delete/:id`
- **Authentication:** Required
- **Methods:** DELETE, POST

**Examples:**
```bash
# Using DELETE
curl -X DELETE http://localhost:3001/api/contacts/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Using POST
curl -X POST http://localhost:3001/api/contacts/delete/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Contact deleted successfully"
}
```

---

### 6. Toggle Favorite Status

Toggle the favorite status of a contact.

- **Endpoint:** 
  - `PATCH /api/contacts/:id/favorite`
  - `POST /api/contacts/favorite/:id`
- **Authentication:** Required
- **Methods:** PATCH, POST

**Examples:**
```bash
# Using PATCH
curl -X PATCH http://localhost:3001/api/contacts/1/favorite \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Using POST
curl -X POST http://localhost:3001/api/contacts/favorite/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Contact favorite status updated",
  "data": {
    "id": 1,
    "isFavorite": true
  }
}
```

---

### 7. Assign Contacts to Group

Assign multiple contacts to a group.

- **Endpoint:** `POST /api/contacts/assign-to-group`
- **Authentication:** Required
- **Methods:** POST

**Request Body:**
```json
{
  "contactIds": [1, 2, 3],
  "groupId": 1
}
```

**Validation Rules:**
- `contactIds`: Required, array of integers, minimum 1 item
- `groupId`: Required, integer

**Example:**
```bash
curl -X POST http://localhost:3001/api/contacts/assign-to-group \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contactIds":[1,2,3],"groupId":1}'
```

**Response:**
```json
{
  "success": true,
  "message": "Contacts assigned to group successfully",
  "data": {
    "groupId": 1,
    "assignedCount": 3
  }
}
```

---

### 8. Remove Contacts from Group

Remove multiple contacts from a group.

- **Endpoint:** `POST /api/contacts/remove-from-group`
- **Authentication:** Required
- **Methods:** POST

**Request Body:**
```json
{
  "contactIds": [1, 2],
  "groupId": 1
}
```

**Validation Rules:**
- `contactIds`: Required, array of integers, minimum 1 item
- `groupId`: Required, integer

**Example:**
```bash
curl -X POST http://localhost:3001/api/contacts/remove-from-group \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contactIds":[1,2],"groupId":1}'
```

**Response:**
```json
{
  "success": true,
  "message": "Contacts removed from group successfully",
  "data": {
    "groupId": 1,
    "removedCount": 2
  }
}
```

---

## Response Formats

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
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

### List Response (with pagination)
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "totalPages": 5,
  "currentPage": 1,
  "data": [ ... ]
}
```

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Successful GET/PUT/PATCH/DELETE request
- `201 Created` - Successful POST request (resource created)
- `400 Bad Request` - Validation error or duplicate resource
- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Common Error Messages

**Authentication Errors:**
```json
{
  "success": false,
  "message": "No token provided"
}
```

```json
{
  "success": false,
  "message": "Invalid token"
}
```

**Validation Errors:**
```json
{
  "success": false,
  "errors": [
    {
      "field": "name",
      "message": "Group name is required"
    }
  ]
}
```

**Duplicate Errors:**
```json
{
  "success": false,
  "message": "Group with this name already exists"
}
```

```json
{
  "success": false,
  "message": "Contact with this phone number already exists"
}
```

**Not Found Errors:**
```json
{
  "success": false,
  "message": "Group not found"
}
```

```json
{
  "success": false,
  "message": "Contact not found"
}
```

---

## Quick Start Guide

### 1. Database Setup

```bash
# Create database
mysql -u root -p < src/database/schema.sql
```

### 2. Environment Configuration

Create `.env` file:
```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=contact_service
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
JWT_EXPIRY=24h
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 5. Testing Workflow

```bash
# 1. Check health
curl http://localhost:3001/health

# 2. Create a group
curl -X POST http://localhost:3001/api/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Friends","description":"Personal friends"}'

# 3. Create contacts
curl -X POST http://localhost:3001/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","phone":"1234567890","countryCode":"+1"}'

# 4. Assign contacts to group
curl -X POST http://localhost:3001/api/contacts/assign-to-group \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contactIds":[1,2],"groupId":1}'

# 5. List contacts in group
curl -X POST "http://localhost:3001/api/contacts/list?groupId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 6. Search contacts
curl -X POST "http://localhost:3001/api/contacts/list?search=john" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## API Endpoints Summary

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups` | Create group |
| GET/POST | `/api/groups` or `/api/groups/list` | Get user's groups |
| GET/POST | `/api/groups/all` | Get all groups (admin) |
| GET/POST | `/api/groups/:id` or `/api/groups/detail/:id` | Get single group |
| PUT/POST | `/api/groups/:id` or `/api/groups/update/:id` | Update group |
| DELETE/POST | `/api/groups/:id` or `/api/groups/delete/:id` | Delete group |

### Contacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contacts` | Create contact |
| GET/POST | `/api/contacts` or `/api/contacts/list` | Get user's contacts |
| GET/POST | `/api/contacts/:id` or `/api/contacts/detail/:id` | Get single contact |
| PUT/POST | `/api/contacts/:id` or `/api/contacts/update/:id` | Update contact |
| DELETE/POST | `/api/contacts/:id` or `/api/contacts/delete/:id` | Delete contact |
| PATCH/POST | `/api/contacts/:id/favorite` or `/api/contacts/favorite/:id` | Toggle favorite |
| POST | `/api/contacts/assign-to-group` | Assign to group |
| POST | `/api/contacts/remove-from-group` | Remove from group |

---

## Notes

- All endpoints (except `/health`) require JWT authentication
- User can only access their own contacts and groups (except admin endpoints)
- Pagination defaults: `page=1`, `limit=10`
- Search is case-insensitive
- Deleting a group removes all contact associations
- Deleting a contact removes all group associations
- Phone number + country code combination must be unique per user
- Group name must be unique per user
- Cache is implemented with Redis for improved performance
- Both old (REST) and new (POST-only) API routes are supported for backward compatibility

---

**Last Updated:** December 19, 2025  
**Version:** 1.0.0  
**Service:** Contact Service  
**Port:** 3001
