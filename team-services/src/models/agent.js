import pool from '../config/database.js';

// Create Agent
export async function createAgent({ name, email, password, department_id, user_id }) {
  const [result] = await pool.execute(
    'INSERT INTO agent (name, email, password, department, user_id) VALUES (?, ?, ?, ?, ?)',
    [name, email, password, department_id, user_id]
  );
  return result.insertId;
}

// Update Agent
export async function updateAgent({ id, name, email, password, department_id, user_id }) {
  const [result] = await pool.execute(
    'UPDATE agent SET name = ?, email = ?, password = ?, department = ? WHERE id = ? AND user_id = ?',
    [name, email, password, department_id, id, user_id]
  );
  return result.affectedRows;
}

// Delete Agent
export async function deleteAgent({ id, user_id }) {
  const [result] = await pool.execute(
    'DELETE FROM agent WHERE id = ? AND user_id = ?',
    [id, user_id]
  );
  return result.affectedRows;
}

// Assign Agent to Department by department_id
export async function assignAgentToDepartment({ agent_id, department_id, user_id }) {
  const [result] = await pool.execute(
    'UPDATE agent SET department = ? WHERE id = ? AND user_id = ?',
    [department_id, agent_id, user_id]
  );
  return result.affectedRows;
}

// List Agents by user_id
export async function listAgentsByUser(user_id) {
  const [rows] = await pool.execute(
    'SELECT * FROM agent WHERE user_id = ?',
    [user_id]
  );
  return rows;
}

// List Agents by department_id
export async function listAgentsByDepartment({ department_id, user_id }) {
  const [rows] = await pool.execute(
    'SELECT * FROM agent WHERE department = ? AND user_id = ?',
    [department_id, user_id]
  );
  return rows;
}
