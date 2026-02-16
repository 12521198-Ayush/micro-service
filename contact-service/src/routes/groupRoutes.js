const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createGroup,
  getGroupsByUserId,
  getGroupById,
  updateGroup,
  deleteGroup,
  getAllGroups,
} = require('../controllers/groupController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation rules
const groupValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Group name is required')
    .isLength({ max: 100 })
    .withMessage('Group name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim(),
];

// @route   POST /api/groups
// @desc    Create a new group
// @access  Private
router.post('/', groupValidation, createGroup);

// @route   GET/POST /api/groups/all
// @desc    Get all groups from all users (Admin)
// @access  Private
router.get('/all', getAllGroups);
router.post('/all', getAllGroups);

// @route   GET/POST /api/groups OR /api/groups/list
// @desc    Get all groups for logged in user
// @access  Private
router.get('/', getGroupsByUserId);
router.post('/list', getGroupsByUserId);

// @route   GET/POST /api/groups/:id OR /api/groups/detail/:id /api/groups/detail/:id
// @desc    Get single group by ID
// @access  Private
router.get('/:id', getGroupById);
router.post('/detail/:id', getGroupById);

// @route   PUT/POST /api/groups/:id OR /api/groups/update/:id
// @desc    Update group
// @access  Private
router.put('/:id', groupValidation, updateGroup);
router.post('/update/:id', groupValidation, updateGroup);

// @route   DELETE/POST /api/groups/:id OR /api/groups/delete/:id
// @desc    Delete group
// @access  Private
router.delete('/:id', deleteGroup);
router.post('/delete/:id', deleteGroup);

module.exports = router;
