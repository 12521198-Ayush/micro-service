# User Service API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Caching & Performance](#caching--performance)
4. [Base URL](#base-url)
5. [API Endpoints](#api-endpoints)
6. [Error Responses](#error-responses)
7. [Complete Workflow Examples](#complete-workflow-examples)
8. [Testing Guide](#testing-guide)

---

## Overview

The User Service API provides complete user authentication and profile management functionality including:
- User registration and login with JWT authentication
- Password management (change password, forgot password, reset password)
- User profile management (get, update)
- Account management (delete account)
- Organization/Business details management
- **Wallet management with balance tracking and transaction history**
- **Per-message pricing configuration for marketing, utility, and auth messages**
- Rate limiting for password reset attempts
- **Redis caching for improved performance**

**Version**: 1.0.0  
**Base URL**: `http://localhost:3000/user-service`

---

## Authentication

All protected endpoints require JWT token authentication via the `Authorization` header.

### Header Format
```
Authorization: Bearer <JWT_TOKEN>
```

### Token Example
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzAyNzI4MDAwLCJleHAiOjE3MDI4MTQ0MDB9.xyz123abc
```

### How to Get Token
1. Register a new user or login with existing credentials
2. Response will include a JWT token
3. Include this token in the `Authorization` header for protected endpoints
4. Token expires after 24 hours (configurable via `JWT_EXPIRY` in .env)

---

## Caching & Performance

### Redis Caching

This API includes **Redis caching** for improved response times:

- **User Profile Cache**: GET profile requests are cached for 1 hour
- **Organization Details Cache**: GET organization details are cached for 1 hour
- **Automatic Invalidation**: Cache is cleared when data is updated

**Expected Performance Improvements**:
- Profile GET requests: 80-90% faster
- Login requests: 50-70% faster (caches user lookup)
- Organization GET requests: 80-90% faster

**Graceful Degradation**: If Redis is unavailable, the API continues to work with direct database queries (no caching benefit, but still functional).

For detailed information about caching configuration and monitoring, see [REDIS_CACHING.md](./REDIS_CACHING.md).

---## Base URL

```
http://localhost:3000/user-service
```

---

## API Endpoints

### Authentication Endpoints

#### 1. Register User (Public)

Create a new user account.

**Endpoint**: `POST /api/auth/register`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "Password123!",
  "name": "John Doe"
}
```

**cURL**:
```bash
curl -X POST http://localhost:3000/user-service/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123!",
    "name": "John Doe"
  }'
```

**Response (201 Created)**:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**Possible Errors**:
- `400`: Missing required fields (email, password, name)
- `409`: User already exists with that email

---

#### 2. Login (Public)

Authenticate user and get JWT token.

**Endpoint**: `POST /api/auth/login`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

**cURL**:
```bash
curl -X POST http://localhost:3000/user-service/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123!"
  }'
```

**Response (200 OK)**:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**Possible Errors**:
- `400`: Missing email or password
- `401`: Invalid credentials

---

#### 3. Get Profile (Protected)

Retrieve authenticated user's complete profile information including user details, wallet balance, message pricing, and organization details.

**Endpoint**: `GET /api/auth/profile`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**cURL**:
```bash
curl -X GET http://localhost:3000/user-service/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK)**:
```json
{
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe",
    "metaBusinessAccountId": "123456789012345"
  },
  "wallet": {
    "balance": 100.50,
    "pricing": {
      "marketingMessage": 0.10,
      "utilityMessage": 0.05,
      "authMessage": 0.05
    }
  },
  "organization": {
    "id": 1,
    "organizationName": "Nyife",
    "physicalAddress": "123 Business Street",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110063",
    "country": "India",
    "createdAt": "2025-12-16T10:30:00.000Z",
    "updatedAt": "2025-12-16T10:30:00.000Z"
  }
}
```

**Note**: 
- `metaBusinessAccountId` will be `null` if not set
- `organization` will be `null` if organization details not added

**Possible Errors**:
- `401`: No token provided
- `403`: Invalid or expired token
- `404`: User not found

---

#### 4. Update Profile (Protected)

Update user's name and email.

**Endpoint**: `PUT /api/auth/profile`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

**cURL**:
```bash
curl -X PUT http://localhost:3000/user-service/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john.smith@example.com"
  }'
```

**Response (200 OK)**:
```json
{
  "message": "Profile updated successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Smith",
    "email": "john.smith@example.com"
  }
}
```

**Possible Errors**:
- `400`: Missing name or email
- `401`: No token provided
- `403`: Invalid or expired token
- `409`: Email already in use by another user

---

#### 5. Change Password (Protected)

Change password for authenticated user.

**Endpoint**: `POST /api/auth/change-password`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

**cURL**:
```bash
curl -X POST http://localhost:3000/user-service/api/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Password123!",
    "newPassword": "NewPassword456!"
  }'
```

**Response (200 OK)**:
```json
{
  "message": "Password changed successfully"
}
```

**Possible Errors**:
- `400`: Missing current or new password
- `401`: Current password is incorrect
- `403`: Invalid or expired token

---

#### 6. Forgot Password (Public)

Request password reset token (rate limited to 3 times per 24 hours).

**Endpoint**: `POST /api/auth/forgot-password`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "john@example.com"
}
```

**cURL**:
```bash
curl -X POST http://localhost:3000/user-service/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com"}'
```

**Response (200 OK)**:
```json
{
  "message": "Password reset token generated",
  "resetToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "expiresAt": "2025-12-16T15:30:00.000Z"
}
```

**Possible Errors**:
- `400`: Email is required
- `429`: Too many password reset attempts (limit: 3 per 24 hours)

**Note**: In production, reset token is sent via email. For testing, token is returned in response.

---

#### 7. Reset Password (Public)

Reset password using reset token.

**Endpoint**: `POST /api/auth/reset-password`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "newPassword": "BrandNewPassword789!"
}
```

**cURL**:
```bash
curl -X POST http://localhost:3000/user-service/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "newPassword": "BrandNewPassword789!"
  }'
```

**Response (200 OK)**:
```json
{
  "message": "Password reset successfully"
}
```

**Possible Errors**:
- `400`: Token and new password are required
- `400`: Invalid or expired reset token

---

#### 8. Delete Account (Protected)

Delete user account permanently.

**Endpoint**: `DELETE /api/auth/account`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "password": "Password123!"
}
```

**cURL**:
```bash
curl -X DELETE http://localhost:3000/user-service/api/auth/account \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"password": "Password123!"}'
```

**Response (200 OK)**:
```json
{
  "message": "Account deleted successfully"
}
```

**Possible Errors**:
- `400`: Password is required
- `401`: Password is incorrect
- `403`: Invalid or expired token

---

#### 9. Update Meta Business Account ID (Protected)

Update user's Meta/Facebook Business Account ID. This value is included in the JWT token for easy access.

**Endpoint**: `POST /api/auth/meta-business-account`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "metaBusinessAccountId": "123456789012345"
}
```

**cURL**:
```bash
curl -X POST http://localhost:3000/user-service/api/auth/meta-business-account \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"metaBusinessAccountId": "123456789012345"}'
```

**Response (200 OK)**:
```json
{
  "message": "Meta Business Account ID updated successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe",
    "metaBusinessAccountId": "123456789012345"
  }
}
```

**Possible Errors**:
- `400`: Meta Business Account ID is required
- `401`: No token provided
- `403`: Invalid or expired token
- `404`: User not found
- `500`: Failed to update

**Note**: 
- After updating, a new JWT token is issued with the updated `metaBusinessAccountId`
- The `metaBusinessAccountId` will be available in decoded JWT token as `req.user.metaBusinessAccountId`
- Use the new token for subsequent requests

---

### Organization Details Endpoints

#### 10. Create or Update Organization Details (Protected)

Single endpoint that creates organization details on first call and updates on subsequent calls.

**Endpoint**: `POST /api/organization/details`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "organizationName": "Nyife",
  "physicalAddress": "123 Business Street",
  "city": "Delhi",
  "state": "Delhi",
  "zipCode": "110063",
  "country": "India"
}
```

**cURL**:
```bash
curl -X POST http://localhost:3000/user-service/api/organization/details \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Nyife",
    "physicalAddress": "123 Business Street",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110063",
    "country": "India"
  }'
```

**Response on Create (201 Created)**:
```json
{
  "message": "Organization details added successfully",
  "organizationDetails": {
    "id": 1,
    "userId": 1,
    "organizationName": "Nyife",
    "physicalAddress": "123 Business Street",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110063",
    "country": "India"
  }
}
```

**Response on Update (200 OK)**:
```json
{
  "message": "Organization details updated successfully",
  "organizationDetails": {
    "id": 1,
    "userId": 1,
    "organizationName": "Nyife Global",
    "physicalAddress": "456 New Avenue",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "country": "India"
  }
}
```

**Possible Errors**:
- `400`: Organization name is required
- `401`: No token provided
- `403`: Invalid or expired token
- `404`: User not found

---

#### 11. Get Organization Details (Protected)

Retrieve organization details for authenticated user.

**Endpoint**: `GET /api/organization/details`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**cURL**:
```bash
curl -X GET http://localhost:3000/user-service/api/organization/details \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK)**:
```json
{
  "organizationDetails": {
    "id": 1,
    "userId": 1,
    "organizationName": "Nyife",
    "physicalAddress": "123 Business Street",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110063",
    "country": "India",
    "createdAt": "2025-12-16T10:30:00.000Z",
    "updatedAt": "2025-12-16T10:30:00.000Z"
  }
}
```

**Possible Errors**:
- `401`: No token provided
- `403`: Invalid or expired token
- `404`: Organization details not found or user not found

---

### Wallet Endpoints

#### 12. Add Balance (Protected)

Add funds to user's wallet balance.

**Endpoint**: `POST /api/wallet/add`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "amount": 100.50,
  "description": "Initial deposit"
}
```

**cURL**:
```bash
curl -X POST http://localhost:3000/user-service/api/wallet/add \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.50,
    "description": "Initial deposit"
  }'
```

**Response (200 OK)**:
```json
{
  "message": "Balance added successfully",
  "transaction": {
    "id": 1,
    "type": "credit",
    "amount": 100.50,
    "balanceBefore": 0.00,
    "balanceAfter": 100.50,
    "description": "Initial deposit"
  },
  "currentBalance": 100.50
}
```

**Possible Errors**:
- `400`: Amount must be greater than 0
- `401`: No token provided
- `403`: Invalid or expired token
- `500`: Failed to update balance

---

#### 13. Deduct Balance (Protected)

Deduct funds from user's wallet balance.

**Endpoint**: `POST /api/wallet/deduct`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "amount": 25.00,
  "description": "Message charges for campaign XYZ"
}
```

**cURL**:
```bash
curl -X POST http://localhost:3000/user-service/api/wallet/deduct \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.00,
    "description": "Message charges for campaign XYZ"
  }'
```

**Response (200 OK)**:
```json
{
  "message": "Balance deducted successfully",
  "transaction": {
    "id": 2,
    "type": "debit",
    "amount": 25.00,
    "balanceBefore": 100.50,
    "balanceAfter": 75.50,
    "description": "Message charges for campaign XYZ"
  },
  "currentBalance": 75.50
}
```

**Possible Errors**:
- `400`: Amount must be greater than 0
- `400`: Insufficient balance
- `401`: No token provided
- `403`: Invalid or expired token
- `500`: Failed to update balance

---

#### 14. Get Balance (Protected)

Retrieve current wallet balance and message pricing.

**Endpoint**: `GET /api/wallet/balance`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**cURL**:
```bash
curl -X GET http://localhost:3000/user-service/api/wallet/balance \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK)**:
```json
{
  "balance": 75.50,
  "pricing": {
    "marketingMessage": 0.10,
    "utilityMessage": 0.05,
    "authMessage": 0.05
  }
}
```

**Possible Errors**:
- `401`: No token provided
- `403`: Invalid or expired token
- `404`: User not found

---

#### 15. Get Transaction History (Protected)

Retrieve wallet transaction history with pagination.

**Endpoint**: `GET /api/wallet/transactions?page=1&limit=50`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**cURL**:
```bash
curl -X GET "http://localhost:3000/user-service/api/wallet/transactions?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK)**:
```json
{
  "transactions": [
    {
      "id": 2,
      "type": "debit",
      "amount": 25.00,
      "balanceBefore": 100.50,
      "balanceAfter": 75.50,
      "description": "Message charges for campaign XYZ",
      "createdAt": "2025-12-22T10:30:00.000Z"
    },
    {
      "id": 1,
      "type": "credit",
      "amount": 100.50,
      "balanceBefore": 0.00,
      "balanceAfter": 100.50,
      "description": "Initial deposit",
      "createdAt": "2025-12-22T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 2,
    "limit": 10
  }
}
```

**Possible Errors**:
- `401`: No token provided
- `403`: Invalid or expired token
- `500`: Internal server error

---

#### 16. Update Message Prices (Protected)

Update per-message pricing for different message types.

**Endpoint**: `PUT /api/wallet/pricing`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "marketingMessagePrice": 0.12,
  "utilityMessagePrice": 0.06,
  "authMessagePrice": 0.04
}
```

**Note**: All fields are optional. You can update one, two, or all three prices.

**cURL**:
```bash
curl -X PUT http://localhost:3000/user-service/api/wallet/pricing \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "marketingMessagePrice": 0.12,
    "utilityMessagePrice": 0.06,
    "authMessagePrice": 0.04
  }'
```

**Response (200 OK)**:
```json
{
  "message": "Message prices updated successfully",
  "pricing": {
    "marketingMessage": 0.12,
    "utilityMessage": 0.06,
    "authMessage": 0.04
  }
}
```

**Possible Errors**:
- `400`: At least one message price must be provided
- `400`: Price must be non-negative
- `401`: No token provided
- `403`: Invalid or expired token
- `500`: Failed to update message prices

---

### Health Check Endpoint

#### 17. Health Check (Public)

Check if the API is running.

**Endpoint**: `GET /health`

**cURL**:
```bash
curl http://localhost:3000/user-service/health
```

**Response (200 OK)**:
```json
{
  "status": "OK"
}
```

---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Status | Code | Description |
|--------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Missing or invalid parameters |
| 401 | Unauthorized | Missing authentication token |
| 403 | Forbidden | Invalid or expired token |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Specific Error Examples

**Missing Required Fields (400)**:
```json
{
  "error": "Email, password, and name are required"
}
```

**User Already Exists (409)**:
```json
{
  "error": "User already exists"
}
```

**Invalid Credentials (401)**:
```json
{
  "error": "Invalid credentials"
}
```

**No Token Provided (401)**:
```json
{
  "error": "No token provided"
}
```

**Invalid Token (403)**:
```json
{
  "error": "Invalid or expired token"
}
```

**Rate Limit Exceeded (429)**:
```json
{
  "error": "Too many password reset attempts. Please try again in 18 hour(s)",
  "retryAfter": 18
}
```

---

## Complete Workflow Examples

### Example 1: Complete User Registration and Profile Setup

```bash
# Step 1: Register new user
curl -X POST http://localhost:3000/user-service/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "name": "New User"
  }'
# Response includes: token, user data

# Step 2: Store token for future requests
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Step 3: Get user profile
curl -X GET http://localhost:3000/user-service/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# Step 4: Update profile
curl -X PUT http://localhost:3000/user-service/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "newemail@example.com"
  }'

# Step 5: Add organization details
curl -X POST http://localhost:3000/user-service/api/organization/details \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "My Company",
    "city": "Delhi",
    "country": "India"
  }'

# Step 6: Get organization details
curl -X GET http://localhost:3000/user-service/api/organization/details \
  -H "Authorization: Bearer $TOKEN"
```

---

### Example 2: Password Reset Flow

```bash
# Step 1: Request password reset
curl -X POST http://localhost:3000/user-service/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
# Response includes: resetToken, expiresAt

# Step 2: Store reset token
RESET_TOKEN="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"

# Step 3: Reset password with token
curl -X POST http://localhost:3000/user-service/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "'$RESET_TOKEN'",
    "newPassword": "NewSecurePassword456!"
  }'

# Step 4: Login with new password
curl -X POST http://localhost:3000/user-service/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "NewSecurePassword456!"
  }'
```

---

### Example 3: Account Management

```bash
# Store token from login
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Step 1: Change password (when logged in)
curl -X POST http://localhost:3000/user-service/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword456!"
  }'

# Step 2: Delete account (requires password confirmation)
curl -X DELETE http://localhost:3000/user-service/api/auth/account \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "NewPassword456!"}'
```

---

## Testing Guide

### Using Postman

1. **Import Collection**
   - Open Postman
   - Create new collection: "User Service API"

2. **Set Environment Variables**
   - Create environment: "User Service"
   - Variable: `base_url` = `http://localhost:3000/user-service`
   - Variable: `token` = (will be filled after login)

3. **Create Requests**
   - Create requests for each endpoint
   - Use `{{base_url}}` and `{{token}}` in URLs and headers

4. **Test Workflow**
   - Register → Login → Get Profile → Update Profile
   - Add Organization → Get Organization
   - Change Password → Forgot Password → Reset Password

### Using cURL

See examples above or use provided cURL commands for each endpoint.

### Using Thunder Client (VS Code)

1. Install Thunder Client extension
2. Create collections and requests
3. Use environment variables similar to Postman

---

## Rate Limiting

### Password Reset Limits

- **Max Attempts**: 3 per 24 hours
- **Response Code**: 429 Too Many Requests
- **Retry After**: Specified in response

Example response when limit exceeded:
```json
{
  "error": "Too many password reset attempts. Please try again in 18 hour(s)",
  "retryAfter": 18
}
```

---

## Configuration

### Environment Variables (.env)

```env
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=user_service
DB_PORT=3307

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRY=24h

# Rate Limiting
MAX_RESET_ATTEMPTS=3
```

---

## Field Reference

### User Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | String | Yes | User's email address |
| password | String | Yes | User's password (8+ characters recommended) |
| name | String | Yes | User's full name |

### Organization Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| organizationName | String | Yes | Name of organization/business |
| physicalAddress | String | No | Street address |
| city | String | No | City name |
| state | String | No | State/Province |
| zipCode | String | No | Postal code |
| country | String | No | Country name |

---

## Best Practices

1. **Token Management**
   - Store tokens securely (httpOnly cookies or secure storage)
   - Include token in all protected endpoint requests
   - Refresh token before expiry if implementing refresh tokens

2. **Password Security**
   - Use strong passwords (8+ characters with mixed case)
   - Never share tokens or passwords
   - Use HTTPS in production

3. **Error Handling**
   - Check HTTP status codes
   - Display user-friendly error messages
   - Log errors for debugging

4. **Rate Limiting**
   - Respect 429 status codes
   - Wait specified time before retrying
   - Implement client-side rate limiting

5. **Data Validation**
   - Validate all inputs on client side before sending
   - Handle validation errors gracefully
   - Don't expose sensitive data in error messages

---

## Support

For issues or questions:
1. Check the documentation above
2. Review error messages and HTTP status codes
3. Check database schema (DATABASE_SCHEMA.md)
4. Review migration files if database issues occur

---

## API Summary

| Method | Endpoint | Purpose | Auth | Rate Limited |
|--------|----------|---------|------|--------------|
| POST | `/api/auth/register` | Register user | No | No |
| POST | `/api/auth/login` | Login user | No | No |
| GET | `/api/auth/profile` | Get profile | Yes | No |
| PUT | `/api/auth/profile` | Update profile | Yes | No |
| POST | `/api/auth/change-password` | Change password | Yes | No |
| POST | `/api/auth/forgot-password` | Request reset | No | Yes |
| POST | `/api/auth/reset-password` | Reset password | No | No |
| DELETE | `/api/auth/account` | Delete account | Yes | No |
| POST | `/api/auth/meta-business-account` | Update Meta Business Account ID | Yes | No |
| POST | `/api/organization/details` | Create/Update org | Yes | No |
| GET | `/api/organization/details` | Get org details | Yes | No |
| POST | `/api/wallet/add` | Add wallet balance | Yes | No |
| POST | `/api/wallet/deduct` | Deduct wallet balance | Yes | No |
| GET | `/api/wallet/balance` | Get wallet balance | Yes | No |
| GET | `/api/wallet/transactions` | Get transaction history | Yes | No |
| PUT | `/api/wallet/pricing` | Update message prices | Yes | No |
| GET | `/health` | Health check | No | No |

---

## Quick Reference - All API Routes

### 1. POST `/api/auth/register` - Register User
```json
// Request
{
  "email": "john@example.com",
  "password": "Password123!",
  "name": "John Doe"
}

// Response (201)
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "email": "john@example.com", "name": "John Doe" }
}
```

### 2. POST `/api/auth/login` - Login User
```json
// Request
{
  "email": "john@example.com",
  "password": "Password123!"
}

// Response (200)
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "email": "john@example.com", "name": "John Doe" }
}
```

### 3. GET `/api/auth/profile` - Get User Profile (Auth Required)
```json
// Response (200)
{
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe",
    "metaBusinessAccountId": "123456789012345"
  },
  "wallet": {
    "balance": 100.50,
    "pricing": {
      "marketingMessage": 0.10,
      "utilityMessage": 0.05,
      "authMessage": 0.05
    }
  },
  "organization": {
    "id": 1,
    "organizationName": "Nyife",
    "physicalAddress": "123 Business Street",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110063",
    "country": "India",
    "createdAt": "2025-12-16T10:30:00.000Z",
    "updatedAt": "2025-12-16T10:30:00.000Z"
  }
}
```

### 4. PUT `/api/auth/profile` - Update Profile (Auth Required)
```json
// Request
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}

// Response (200)
{
  "message": "Profile updated successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "name": "John Smith", "email": "john.smith@example.com" }
}
```

### 5. POST `/api/auth/change-password` - Change Password (Auth Required)
```json
// Request
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}

// Response (200)
{
  "message": "Password changed successfully"
}
```

### 6. POST `/api/auth/forgot-password` - Forgot Password
```json
// Request
{
  "email": "john@example.com"
}

// Response (200)
{
  "message": "Password reset token generated",
  "resetToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "expiresAt": "2025-12-16T15:30:00.000Z"
}
```

### 7. POST `/api/auth/reset-password` - Reset Password
```json
// Request
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "newPassword": "BrandNewPassword789!"
}

// Response (200)
{
  "message": "Password reset successfully"
}
```

### 8. DELETE `/api/auth/account` - Delete Account (Auth Required)
```json
// Request
{
  "password": "Password123!"
}

// Response (200)
{
  "message": "Account deleted successfully"
}
```

### 9. POST `/api/auth/meta-business-account` - Update Meta Business Account ID (Auth Required)
```json
// Request
{
  "metaBusinessAccountId": "123456789012345"
}

// Response (200)
{
  "message": "Meta Business Account ID updated successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe",
    "metaBusinessAccountId": "123456789012345"
  }
}
```

### 10. POST `/api/organization/details` - Create/Update Organization (Auth Required)
```json
// Request
{
  "organizationName": "Nyife",
  "physicalAddress": "123 Business Street",
  "city": "Delhi",
  "state": "Delhi",
  "zipCode": "110063",
  "country": "India"
}

// Response (201 Created / 200 Updated)
{
  "message": "Organization details added successfully",
  "organizationDetails": {
    "id": 1,
    "userId": 1,
    "organizationName": "Nyife",
    "physicalAddress": "123 Business Street",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110063",
    "country": "India"
  }
}
```

### 11. GET `/api/organization/details` - Get Organization Details (Auth Required)
```json
// Response (200)
{
  "organizationDetails": {
    "id": 1,
    "userId": 1,
    "organizationName": "Nyife",
    "physicalAddress": "123 Business Street",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110063",
    "country": "India",
    "createdAt": "2025-12-16T10:30:00.000Z",
    "updatedAt": "2025-12-16T10:30:00.000Z"
  }
}
```

### 12. POST `/api/wallet/add` - Add Wallet Balance (Auth Required)
```json
// Request
{
  "amount": 100.50,
  "description": "Initial deposit"
}

// Response (200)
{
  "message": "Balance added successfully",
  "transaction": {
    "id": 1,
    "type": "credit",
    "amount": 100.50,
    "balanceBefore": 0.00,
    "balanceAfter": 100.50,
    "description": "Initial deposit"
  },
  "currentBalance": 100.50
}
```

### 13. POST `/api/wallet/deduct` - Deduct Wallet Balance (Auth Required)
```json
// Request
{
  "amount": 25.00,
  "description": "Message charges for campaign XYZ"
}

// Response (200)
{
  "message": "Balance deducted successfully",
  "transaction": {
    "id": 2,
    "type": "debit",
    "amount": 25.00,
    "balanceBefore": 100.50,
    "balanceAfter": 75.50,
    "description": "Message charges for campaign XYZ"
  },
  "currentBalance": 75.50
}

// Response (400 - Insufficient Balance)
{
  "error": "Insufficient balance",
  "currentBalance": 10.00,
  "required": 25.00
}
```

### 14. GET `/api/wallet/balance` - Get Wallet Balance (Auth Required)
```json
// Response (200)
{
  "balance": 75.50,
  "pricing": {
    "marketingMessage": 0.10,
    "utilityMessage": 0.05,
    "authMessage": 0.05
  }
}
```

### 15. GET `/api/wallet/transactions?page=1&limit=10` - Get Transaction History (Auth Required)
```json
// Response (200)
{
  "transactions": [
    {
      "id": 2,
      "type": "debit",
      "amount": 25.00,
      "balanceBefore": 100.50,
      "balanceAfter": 75.50,
      "description": "Message charges for campaign XYZ",
      "createdAt": "2025-12-22T10:30:00.000Z"
    },
    {
      "id": 1,
      "type": "credit",
      "amount": 100.50,
      "balanceBefore": 0.00,
      "balanceAfter": 100.50,
      "description": "Initial deposit",
      "createdAt": "2025-12-22T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 2,
    "limit": 10
  }
}
```

### 16. PUT `/api/wallet/pricing` - Update Message Prices (Auth Required)
```json
// Request (all fields optional, at least one required)
{
  "marketingMessagePrice": 0.12,
  "utilityMessagePrice": 0.06,
  "authMessagePrice": 0.04
}

// Response (200)
{
  "message": "Message prices updated successfully",
  "pricing": {
    "marketingMessage": 0.12,
    "utilityMessage": 0.06,
    "authMessage": 0.04
  }
}
```

### 17. GET `/health` - Health Check
```json
// Response (200)
{
  "status": "OK"
}
```

