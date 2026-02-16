const { Group, Contact } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { cache } = require('../config/redis');
const cacheKeys = require('../utils/cacheKeys');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { name, description } = req.body;
    const userId = req.user.id;

    // Check if group with same name already exists for this user
    const existingGroup = await Group.findOne({
      where: { userId, name }
    });

    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'Group with this name already exists'
      });
    }

    const group = await Group.create({
      userId,
      name,
      description,
    });

    // Invalidate user groups cache
    await cache.deletePattern(cacheKeys.patterns.userGroups(userId));

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group,
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get all groups for a user
// @route   GET /api/groups
// @access  Private
const getGroupsByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    const { includeContacts } = req.query;

    // Check cache first
    const cacheKey = cacheKeys.userGroups(userId, 1, 100);
    const cachedData = await cache.get(cacheKey);
    
    if (cachedData && includeContacts !== 'true') {
      return res.json({
        ...cachedData,
        cached: true
      });
    }

    const options = {
      where: { userId },
      order: [['createdAt', 'DESC']],
      attributes: {
        include: [
          [
            require('sequelize').literal(
              '(SELECT COUNT(DISTINCT c.id) FROM contacts c LEFT JOIN contact_groups cg ON c.id = cg.contact_id WHERE c.group_id = Group.id OR cg.group_id = Group.id)'
            ),
            'contact_count'
          ]
        ]
      }
    };

    // Optionally include contacts in each group
    if (includeContacts === 'true') {
      options.include = [{
        model: Contact,
        as: 'directContacts',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'countryCode']
      }];
    }

    const groups = await Group.findAll(options);

    const responseData = {
      success: true,
      count: groups.length,
      data: groups,
    };

    // Cache the result for 5 minutes (only if not including contacts)
    if (includeContacts !== 'true') {
      await cache.set(cacheKey, responseData, 300);
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get single group by ID
// @route   GET /api/groups/:id
// @access  Private
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check cache first
    const cacheKey = cacheKeys.group(userId, id);
    const cachedGroup = await cache.get(cacheKey);
    
    if (cachedGroup) {
      return res.json({
        success: true,
        data: cachedGroup,
        cached: true
      });
    }

    const group = await Group.findOne({
      where: { id, userId },
      include: [{
        model: Contact,
        as: 'contacts',
        through: { attributes: [] },
      }],
    });

    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Group not found' 
      });
    }

    // Cache the group for 10 minutes
    await cache.set(cacheKey, group, 600);

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private
const updateGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const { name, description } = req.body;

    const group = await Group.findOne({ where: { id, userId } });

    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Group not found' 
      });
    }

    // Check if another group with same name already exists for this user
    const existingGroup = await Group.findOne({
      where: { 
        userId, 
        name,
        id: { [Op.ne]: id } // Not equal to current group id
      }
    });

    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'Group with this name already exists'
      });
    }

    await group.update({ name, description });

    // Invalidate caches
    await cache.deletePattern(cacheKeys.patterns.group(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userGroups(userId));

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: group,
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { deleteContacts = 'true' } = req.query; // Default to deleting contacts

    const group = await Group.findOne({ 
      where: { id, userId },
      include: [{
        model: Contact,
        as: 'directContacts',
        attributes: ['id']
      }]
    });

    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Group not found' 
      });
    }

    const contactCount = group.directContacts?.length || 0;

    // Contacts will be deleted automatically due to CASCADE
    await group.destroy();

    // Invalidate caches
    await cache.deletePattern(cacheKeys.patterns.group(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userGroups(userId));
    await cache.deletePattern(cacheKeys.patterns.userContacts(userId));

    res.json({
      success: true,
      message: `Group deleted successfully. ${contactCount} contact(s) were also deleted.`,
      deletedContacts: contactCount
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get all groups (Admin only - all users' groups)
// @route   GET /api/groups/all
// @access  Private/Admin
const getAllGroups = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      includeContacts = 'false',
      userId 
    } = req.query;

    const options = {
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    };

    // Filter by specific user if provided
    if (userId) {
      options.where = { userId: parseInt(userId) };
    }

    // Optionally include contacts in each group
    if (includeContacts === 'true') {
      options.include = [{
        model: Contact,
        as: 'contacts',
        through: { attributes: [] },
      }];
    }

    const { count, rows: groups } = await Group.findAndCountAll(options);

    res.json({
      success: true,
      count: groups.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: groups,
    });
  } catch (error) {
    console.error('Error fetching all groups:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

module.exports = {
  createGroup,
  getGroupsByUserId,
  getGroupById,
  updateGroup,
  deleteGroup,
  getAllGroups,
};
