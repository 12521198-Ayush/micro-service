import { createDepartment, updateDepartment, listDepartmentsByUser, isDepartmentNameDuplicate } from '../models/department.js';

// Create Department
export async function createDepartmentController(req, res) {
	try {
		const { name } = req.body;
		const user_id = req.user.id;
		if (!name) return res.status(400).json({ message: 'Department name is required' });
		const duplicate = await isDepartmentNameDuplicate({ name, user_id });
		if (duplicate) return res.status(409).json({ message: 'Department name already exists' });
		const id = await createDepartment({ name, user_id });
		res.status(201).json({ id, name, user_id });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
}

// Update Department
export async function updateDepartmentController(req, res) {
	try {
		const { id } = req.params;
		const { name } = req.body;
		const user_id = req.user.id;
		if (!name) return res.status(400).json({ message: 'Department name is required' });
		const affected = await updateDepartment({ id, name, user_id });
		if (affected) {
			res.json({ id, name, user_id });
		} else {
			res.status(404).json({ message: 'Department not found or not owned by user' });
		}
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
}

// List Departments by user_id
export async function listDepartmentsByUserController(req, res) {
	try {
		const user_id = req.user.id;
		const departments = await listDepartmentsByUser(user_id);
		res.json(departments);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
}
