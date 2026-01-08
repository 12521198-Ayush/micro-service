import {
	createAgent,
	updateAgent,
	deleteAgent,
	assignAgentToDepartment,
	listAgentsByUser,
	listAgentsByDepartment
} from '../models/agent.js';

// Create Agent
export async function createAgentController(req, res) {
	try {
		const { name, email, password, department_id } = req.body;
		const user_id = req.user.id;
		if (!name || !email || !password || !department_id) {
			return res.status(400).json({ message: 'All fields are required' });
		}
		const id = await createAgent({ name, email, password, department_id, user_id });
		res.status(201).json({ id, name, email, department_id, user_id });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
}

// Update Agent
export async function updateAgentController(req, res) {
	try {
		const { id } = req.params;
		const { name, email, password, department_id } = req.body;
		const user_id = req.user.id;
		const affected = await updateAgent({ id, name, email, password, department_id, user_id });
		if (affected) {
			res.json({ id, name, email, department_id, user_id });
		} else {
			res.status(404).json({ message: 'Agent not found or not owned by user' });
		}
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
}

// Delete Agent
export async function deleteAgentController(req, res) {
	try {
		const { id } = req.params;
		const user_id = req.user.id;
		const affected = await deleteAgent({ id, user_id });
		if (affected) {
			res.json({ message: 'Agent deleted' });
		} else {
			res.status(404).json({ message: 'Agent not found or not owned by user' });
		}
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
}

// Assign Agent to Department
export async function assignAgentToDepartmentController(req, res) {
	try {
		const { id } = req.params;
		const { department_id } = req.body;
		const user_id = req.user.id;
		if (!department_id) return res.status(400).json({ message: 'department_id is required' });
		const affected = await assignAgentToDepartment({ agent_id: id, department_id, user_id });
		if (affected) {
			res.json({ id, department_id });
		} else {
			res.status(404).json({ message: 'Agent not found or not owned by user' });
		}
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
}

// List Agents by user_id
export async function listAgentsByUserController(req, res) {
	try {
		const user_id = req.user.id;
		const agents = await listAgentsByUser(user_id);
		res.json(agents);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
}

// List Agents by department
export async function listAgentsByDepartmentController(req, res) {
	try {
		const user_id = req.user.id;
		const { department_id } = req.params;
		const agents = await listAgentsByDepartment({ department_id, user_id });
		res.json(agents);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
}
