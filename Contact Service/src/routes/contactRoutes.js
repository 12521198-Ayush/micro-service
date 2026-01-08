const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createContact,
  getContactsByUserId,
  getContactById,
  updateContact,
  deleteContact,
  assignContactsToGroup,
  removeContactsFromGroup,
  toggleFavorite,
} = require('../controllers/contactController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation rules
const contactValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('countryCode')
    .optional()
    .trim()
    .matches(/^\+\d{1,4}$/)
    .withMessage('Country code must be in format +1, +91, etc.'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  body('jobTitle')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Job title cannot exceed 100 characters'),
  body('notes')
    .optional()
    .trim(),
];

const assignToGroupValidation = [
  body('contactIds')
    .isArray({ min: 1 })
    .withMessage('contactIds must be a non-empty array'),
  body('contactIds.*')
    .isInt()
    .withMessage('Each contactId must be an integer'),
  body('groupId')
    .isInt()
    .withMessage('groupId must be an integer'),
];

// @route   POST /api/contacts
// @desc    Create a new contact
// @access  Private
router.post('/', contactValidation, createContact);

// @route   GET/POST /api/contacts OR /api/contacts/list
// @desc    Get all contacts for logged in user
// @access  Private
router.get('/', getContactsByUserId);
router.post('/list', getContactsByUserId);

// @route   GET/POST /api/contacts/:id OR /api/contacts/detail/:id
// @desc    Get single contact by ID
// @access  Private
router.get('/:id', getContactById);
router.post('/detail/:id', getContactById);

// @route   PUT/POST /api/contacts/:id OR /api/contacts/update/:id
// @desc    Update contact
// @access  Private
router.put('/:id', contactValidation, updateContact);
router.post('/update/:id', contactValidation, updateContact);

// @route   DELETE/POST /api/contacts/:id OR /api/contacts/delete/:id
// @desc    Delete contact
// @access  Private
router.delete('/:id', deleteContact);
router.post('/delete/:id', deleteContact);

// @route   POST /api/contacts/assign-to-group
// @desc    Assign contacts to a group
// @access  Private
router.post('/assign-to-group', assignToGroupValidation, assignContactsToGroup);

// @route   POST /api/contacts/remove-from-group
// @desc    Remove contacts from a group
// @access  Private
router.post('/remove-from-group', assignToGroupValidation, removeContactsFromGroup);

// @route   PATCH/POST /api/contacts/:id/favorite OR /api/contacts/favorite/:id
// @desc    Toggle favorite status of a contact
// @access  Private
router.patch('/:id/favorite', toggleFavorite);
router.post('/favorite/:id', toggleFavorite);

module.exports = router;
