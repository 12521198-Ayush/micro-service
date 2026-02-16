/**
 * Team Service API
 * Handles all team, department, and agent related API calls
 * Base URL: http://localhost:3000/team-service
 */

const TEAM_SERVICE_URL = process.env.NEXT_PUBLIC_TEAM_SERVICE_URL || 'http://localhost:3000/team-service'

/**
 * Generic API request function for team service
 */
async function teamApiRequest(endpoint, token, options = {}) {
  const url = `${TEAM_SERVICE_URL}${endpoint}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers
    },
    ...options
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw {
        status: response.status,
        message: data.error || data.message || 'An error occurred',
        data
      }
    }

    return data
  } catch (error) {
    if (error.status) {
      throw error
    }

    throw {
      status: 500,
      message: error.message || 'Network error occurred',
      data: null
    }
  }
}

// ==================== DEPARTMENT API ====================

/**
 * Create a new department
 * @param {string} token - JWT token
 * @param {object} data - { name }
 */
export async function createDepartment(token, data) {
  return teamApiRequest('/api/department', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Update a department
 * @param {string} token - JWT token
 * @param {number} id - Department ID
 * @param {object} data - { name }
 */
export async function updateDepartment(token, id, data) {
  return teamApiRequest(`/api/department/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * Get all departments for the user
 * @param {string} token - JWT token
 */
export async function getDepartments(token) {
  return teamApiRequest('/api/department', token, {
    method: 'GET'
  })
}

/**
 * Delete a department
 * @param {string} token - JWT token
 * @param {number} id - Department ID
 */
export async function deleteDepartment(token, id) {
  return teamApiRequest(`/api/department/${id}`, token, {
    method: 'DELETE'
  })
}

// ==================== AGENT API ====================

/**
 * Create a new agent
 * @param {string} token - JWT token
 * @param {object} data - { name, email, password, department_id }
 */
export async function createAgent(token, data) {
  return teamApiRequest('/api/agent', token, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * Update an agent
 * @param {string} token - JWT token
 * @param {number} id - Agent ID
 * @param {object} data - Agent data to update
 */
export async function updateAgent(token, id, data) {
  return teamApiRequest(`/api/agent/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * Delete an agent
 * @param {string} token - JWT token
 * @param {number} id - Agent ID
 */
export async function deleteAgent(token, id) {
  return teamApiRequest(`/api/agent/${id}`, token, {
    method: 'DELETE'
  })
}

/**
 * Assign an agent to a department
 * @param {string} token - JWT token
 * @param {number} id - Agent ID
 * @param {object} data - { department_id }
 */
export async function assignAgentToDepartment(token, id, data) {
  return teamApiRequest(`/api/agent/${id}/assign`, token, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

/**
 * Get all agents for the user
 * @param {string} token - JWT token
 */
export async function getAgents(token) {
  return teamApiRequest('/api/agent', token, {
    method: 'GET'
  })
}

/**
 * Get agents by department
 * @param {string} token - JWT token
 * @param {number} departmentId - Department ID
 */
export async function getAgentsByDepartment(token, departmentId) {
  return teamApiRequest(`/api/agent/department/${departmentId}`, token, {
    method: 'GET'
  })
}
