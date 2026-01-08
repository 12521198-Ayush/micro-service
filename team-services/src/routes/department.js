import express from 'express';
import verifyToken from '../middleware/auth.js';
import {
	createDepartmentController,
	updateDepartmentController,
	listDepartmentsByUserController
} from '../controllers/department.js';

const router = express.Router();

// Create department
router.post('/', verifyToken, createDepartmentController);

// Update department
router.put('/:id', verifyToken, updateDepartmentController);

// List departments by user_id
router.get('/', verifyToken, listDepartmentsByUserController);

export default router;
