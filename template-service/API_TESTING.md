# API Testing Documentation - Template Service

## Base URL
```
http://localhost:3001/api/templates
```

## Authentication
All endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. List All Templates (with Optional Filters)

### Endpoint
```
POST /api/templates/list
```

### Headers
```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

### Request Body (All Optional)
```json
{
  "status": "approve",        // Optional: "Pending", "approve", or "rejected"
  "name": "welcome"           // Optional: partial name search
}
```

### Test Cases

#### Test 1: List All Templates (No Filters)
**cURL Command:**
```bash
curl -X POST http://localhost:3001/api/templates/list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{}'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "metaTemplateId": "123456789",
      "name": "welcome_message",
      "category": "MARKETING",
      "language": "en",
      "status": "approve",
      "metadata": {
        "components": [...],
        "parameter_format": {...},
        "created_via": "api"
      },
      "createdAt": "2025-12-18T10:30:00.000Z",
      "updatedAt": "2025-12-18T10:30:00.000Z",
      "userId": 123
    }
  ]
}
```

---

#### Test 2: Filter by Status (Approved Templates)
**cURL Command:**
```bash
curl -X POST http://localhost:3001/api/templates/list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "approve"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "name": "welcome_message",
      "status": "approve",
      ...
    }
  ]
}
```

---

#### Test 3: Filter by Status (Pending Templates)
**cURL Command:**
```bash
curl -X POST http://localhost:3001/api/templates/list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "Pending"
  }'
```

---

#### Test 4: Filter by Name (Partial Match)
**cURL Command:**
```bash
curl -X POST http://localhost:3001/api/templates/list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "welcome"
  }'
```

**Note:** This will return all templates with "welcome" anywhere in the name (case-insensitive partial match).

---

#### Test 5: Filter by Both Status and Name
**cURL Command:**
```bash
curl -X POST http://localhost:3001/api/templates/list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "approve",
    "name": "newsletter"
  }'
```

---

#### Test 6: No Token Provided (Unauthorized)
**cURL Command:**
```bash
curl -X POST http://localhost:3001/api/templates/list \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "No token provided"
}
```

---

#### Test 7: Invalid Token
**cURL Command:**
```bash
curl -X POST http://localhost:3001/api/templates/list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -d '{}'
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "Invalid or expired token"
}
```

---

## Postman Testing

### Setup Collection

1. **Create New Collection:** "Template Service API"

2. **Set Collection Variables:**
   - `base_url`: `http://localhost:3001`
   - `jwt_token`: `<your_actual_token>`

3. **Set Collection Authorization:**
   - Type: Bearer Token
   - Token: `{{jwt_token}}`

### Request Examples

#### Request 1: List All Templates
```
Method: POST
URL: {{base_url}}/api/templates/list
Headers:
  - Content-Type: application/json
  - Authorization: Bearer {{jwt_token}}
Body (raw JSON):
{}
```

#### Request 2: Filter by Status
```
Method: POST
URL: {{base_url}}/api/templates/list
Body (raw JSON):
{
  "status": "approve"
}
```

#### Request 3: Filter by Name
```
Method: POST
URL: {{base_url}}/api/templates/list
Body (raw JSON):
{
  "name": "welcome"
}
```

#### Request 4: Combined Filters
```
Method: POST
URL: {{base_url}}/api/templates/list
Body (raw JSON):
{
  "status": "Pending",
  "name": "promo"
}
```

---

## Testing with JavaScript/Node.js

### Using Axios
```javascript
const axios = require('axios');

const testListTemplates = async () => {
  try {
    const response = await axios.post(
      'http://localhost:3001/api/templates/list',
      {
        status: 'approve',
        name: 'welcome'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_JWT_TOKEN'
        }
      }
    );
    
    console.log('Success:', response.data);
    console.log('Total Templates:', response.data.count);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

testListTemplates();
```

### Using Fetch API
```javascript
const testListTemplates = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/templates/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_JWT_TOKEN'
      },
      body: JSON.stringify({
        status: 'approve',
        name: 'welcome'
      })
    });
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

testListTemplates();
```

---

## Testing with Python

### Using Requests Library
```python
import requests
import json

def test_list_templates():
    url = "http://localhost:3001/api/templates/list"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_JWT_TOKEN"
    }
    
    # Test 1: No filters
    response = requests.post(url, headers=headers, json={})
    print(f"All Templates: {response.json()}")
    
    # Test 2: Filter by status
    response = requests.post(url, headers=headers, json={"status": "approve"})
    print(f"Approved Templates: {response.json()}")
    
    # Test 3: Filter by name
    response = requests.post(url, headers=headers, json={"name": "welcome"})
    print(f"Templates with 'welcome': {response.json()}")
    
    # Test 4: Both filters
    response = requests.post(url, headers=headers, json={
        "status": "Pending",
        "name": "newsletter"
    })
    print(f"Filtered Templates: {response.json()}")

if __name__ == "__main__":
    test_list_templates()
```

---

## Response Codes

| Code | Description | Scenario |
|------|-------------|----------|
| 200  | OK | Templates retrieved successfully |
| 401  | Unauthorized | Missing or invalid JWT token |
| 500  | Internal Server Error | Database error or server issue |

---

## Testing Scenarios Checklist

- [ ] List all templates without filters
- [ ] Filter by status: "Pending"
- [ ] Filter by status: "approve"
- [ ] Filter by status: "rejected"
- [ ] Filter by name (exact match)
- [ ] Filter by name (partial match)
- [ ] Combine status and name filters
- [ ] Test with missing token
- [ ] Test with invalid token
- [ ] Test with expired token
- [ ] Verify response structure
- [ ] Verify data count matches array length
- [ ] Test with empty database
- [ ] Test with special characters in name filter
- [ ] Test case sensitivity in name filter

---

## Sample Test Data Setup

Before testing, ensure you have templates in the database. You can use the create endpoint:

```bash
curl -X POST http://localhost:3001/api/templates/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "welcome_template",
    "category": "MARKETING",
    "language": "en",
    "components": [
      {
        "type": "BODY",
        "text": "Hello {{1}}, welcome to our service!"
      }
    ]
  }'
```

---

## Automated Testing Script (Bash)

```bash
#!/bin/bash

BASE_URL="http://localhost:3001/api/templates"
TOKEN="YOUR_JWT_TOKEN"

echo "=== Testing List Templates API ==="

echo -e "\n1. Test: List all templates"
curl -s -X POST "$BASE_URL/list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}' | jq '.'

echo -e "\n2. Test: Filter by status (approve)"
curl -s -X POST "$BASE_URL/list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"approve"}' | jq '.'

echo -e "\n3. Test: Filter by name"
curl -s -X POST "$BASE_URL/list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"welcome"}' | jq '.'

echo -e "\n4. Test: No token (should fail)"
curl -s -X POST "$BASE_URL/list" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'

echo -e "\n=== Tests Complete ==="
```

**Usage:**
```bash
chmod +x test_api.sh
./test_api.sh
```

---

## Notes

1. **JWT Token Generation:** Ensure you have a valid JWT token. The token should contain user information (id/userId).

2. **Status Values:** Valid status values are:
   - `"Pending"`
   - `"approve"`
   - `"rejected"`

3. **Name Search:** The name filter performs a case-insensitive partial match using SQL LIKE with wildcards.

4. **Empty Results:** If no templates match the filters, the API returns:
   ```json
   {
     "success": true,
     "count": 0,
     "data": []
   }
   ```

5. **Database Connection:** Ensure the database is running and accessible before testing.

---

## Troubleshooting

### Issue: "No token provided"
**Solution:** Add the Authorization header with Bearer token

### Issue: "Invalid or expired token"
**Solution:** Generate a new JWT token with valid credentials

### Issue: 500 Internal Server Error
**Solution:** Check database connection and ensure the `custom_template` table exists

### Issue: Empty data array
**Solution:** Verify templates exist in the database or adjust filter criteria
