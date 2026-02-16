import express from 'express';
import verifyToken from '../middleware/auth.js';
import {
	createAgentController,
	updateAgentController,
	deleteAgentController,
	assignAgentToDepartmentController,
	listAgentsByUserController,
	listAgentsByDepartmentController
} from '../controllers/agent.js';

const router = express.Router();


// Create agent
router.post('/', verifyToken, createAgentController);

// Update agent
router.put('/:id', verifyToken, updateAgentController);

// Delete agent
router.delete('/:id', verifyToken, deleteAgentController);

// Assign agent to department (by department_id)
router.patch('/:id/assign', verifyToken, assignAgentToDepartmentController);

// List agents by user_id
router.get('/', verifyToken, listAgentsByUserController);

// List agents by department_id
router.get('/department/:department_id', verifyToken, listAgentsByDepartmentController);

export default router;
