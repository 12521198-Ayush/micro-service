# Team Services API Documentation

All endpoints require JWT authentication via the `Authorization: Bearer <token>` header. The `user_id` is extracted from the JWT payload.

---

## Department APIs

### Create Department
- **POST** `/team-service/api/department`
- **Body:**
  ```json
  {
    "name": "Department Name"
  }
  ```
- Returns 409 if department name already exists for the user
- **Response:**
  - `201 Created` with department info

### Update Department
- **PUT** `/team-service/api/department/:id`
- **Body:**
  ```json
  {
    "name": "New Department Name"
  }
  ```
- **Response:**
  - `200 OK` with updated department info

### List Departments by User
- **GET** `/team-service/api/department`
- **Response:**
  - `200 OK` with array of departments for the authenticated user

---

## Agent APIs

### Create Agent
- **POST** `/team-service/api/agent`
- **Body:**
  ```json
  {
    "name": "Agent Name",
    "email": "agent@email.com",
    "password": "password123",
    "department_id": 1
  }
  ```
- **Response:**
  - `201 Created` with agent info

### Update Agent
- **PUT** `/team-service/api/agent/:id`
- **Body:**
  ```json
  {
    "name": "New Name",
    "email": "new@email.com",
    "password": "newpassword",
    "department_id": 1
  }
  ```
- **Response:**
  - `200 OK` with updated agent info

### Delete Agent
- **DELETE** `/team-service/api/agent/:id`
- **Response:**
  - `200 OK` with deletion message

### Assign Agent to Department
- **PATCH** `/team-service/api/agent/:id/assign`
- **Body:**
  ```json
  {
    "department_id": 1
  }
  ```
- **Response:**
  - `200 OK` with assignment info

### List Agents by User
- **GET** `/team-service/api/agent`
- **Response:**
  - `200 OK` with array of agents for the authenticated user

### List Agents by Department
- **GET** `/team-service/api/agent/department/:department_id`
- **Response:**
  - `200 OK` with array of agents in the specified department for the authenticated user

---

## Authentication
- All endpoints require a valid JWT in the `Authorization` header.
- Example: `Authorization: Bearer <your_token_here>`

---

## Error Responses
- `400 Bad Request`: Missing or invalid fields
- `401 Unauthorized`: No or invalid token
- `404 Not Found`: Resource not found or not owned by user
- `500 Internal Server Error`: Server error
