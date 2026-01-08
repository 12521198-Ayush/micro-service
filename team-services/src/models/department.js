import pool from '../config/database.js';


// Check for duplicate department name for a user
export async function isDepartmentNameDuplicate({ name, user_id }) {
  const [rows] = await pool.execute(
    'SELECT id FROM department WHERE name = ? AND user_id = ?',
    [name, user_id]
  );
  return rows.length > 0;
}

// Create Department
export async function createDepartment({ name, user_id }) {
  if (!name) throw new Error('Department name is required');
  // Check for duplicate
  const duplicate = await isDepartmentNameDuplicate({ name, user_id });
  if (duplicate) throw new Error('Department name already exists');
  const [result] = await pool.execute(
    'INSERT INTO department (name, user_id) VALUES (?, ?)',
    [name, user_id]
  );
  return result.insertId;
}

// Update Department
export async function updateDepartment({ id, name, user_id }) {
  if (!name) throw new Error('Department name is required');
  const [result] = await pool.execute(
    'UPDATE department SET name = ? WHERE id = ? AND user_id = ?',
    [name, id, user_id]
  );
  return result.affectedRows;
}

// List Departments by user_id
export async function listDepartmentsByUser(user_id) {
  const [rows] = await pool.execute(
    'SELECT * FROM department WHERE user_id = ?',
    [user_id]
  );
  return rows;
}
