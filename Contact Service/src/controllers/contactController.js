const { Contact, Group, ContactGroup } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { cache } = require('../config/redis');
const cacheKeys = require('../utils/cacheKeys');

// @desc    Create a new contact
// @route   POST /api/contacts
// @access  Private
const createContact = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      phone,
      countryCode, 
      company, 
      jobTitle, 
      notes,
      isFavorite 
    } = req.body;
    const userId = req.user.id;

    // Check if contact with same phone and country code already exists for this user
    const existingContact = await Contact.findOne({
      where: { 
        userId, 
        phone,
        countryCode: countryCode || '+1'
      }
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'Contact with this phone number already exists'
      });
    }

    const contact = await Contact.create({
      userId,
      firstName,
      lastName,
      email,
      phone,
      countryCode: countryCode || '+1',
      company,
      jobTitle,
      notes,
      isFavorite: isFavorite || false,
    });

    // Invalidate user contacts cache
    await cache.deletePattern(cacheKeys.patterns.userContacts(userId));

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get all contacts for a user
// @route   GET /api/contacts
// @access  Private
const getContactsByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      search = '', 
      favorite = '', 
      groupId = '',
      page = 1, 
      limit = 10 
    } = req.query;

    // Check cache first
    const cacheKey = cacheKeys.userContacts(userId, page, limit, search, favorite, groupId);
    const cachedData = await cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        ...cachedData,
        cached: true
      });
    }

    const options = {
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      include: [{
        model: Group,
        as: 'groups',
        through: { attributes: [] },
      }],
    };

    // Add search filter
    if (search) {
      options.where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    // Add favorite filter
    if (favorite === 'true') {
      options.where.isFavorite = true;
    }

    // Filter by group
    if (groupId) {
      options.include[0].where = { id: groupId };
      options.include[0].required = true;
    }

    const { count, rows: contacts } = await Contact.findAndCountAll(options);

    const responseData = {
      success: true,
      count: contacts.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: contacts,
    };

    // Cache the result for 5 minutes
    await cache.set(cacheKey, responseData, 300);

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get single contact by ID
// @route   GET /api/contacts/:id
// @access  Private
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check cache first
    const cacheKey = cacheKeys.contact(userId, id);
    const cachedContact = await cache.get(cacheKey);
    
    if (cachedContact) {
      return res.json({
        success: true,
        data: cachedContact,
        cached: true
      });
    }

    const contact = await Contact.findOne({
      where: { id, userId },
      include: [{
        model: Group,
        as: 'groups',
        through: { attributes: [] },
      }],
    });

    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact not found' 
      });
    }

    // Cache the contact for 10 minutes
    await cache.set(cacheKey, contact, 600);

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Update contact
// @route   PUT /api/contacts/:id
// @access  Private
const updateContact = async (req, res) => {
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
    const { phone, countryCode } = req.body;

    const contact = await Contact.findOne({ where: { id, userId } });

    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact not found' 
      });
    }

    // Check if trying to update phone/countryCode to an existing combination
    if (phone || countryCode) {
      const phoneToCheck = phone || contact.phone;
      const countryCodeToCheck = countryCode || contact.countryCode;
      
      const existingContact = await Contact.findOne({
        where: { 
          userId, 
          phone: phoneToCheck,
          countryCode: countryCodeToCheck,
          id: { [Op.ne]: id } // Not equal to current contact id
        }
      });

      if (existingContact) {
        return res.status(400).json({
          success: false,
          message: 'Contact with this phone number already exists'
        });
      }
    }

    await contact.update(req.body);

    // Invalidate caches
    await cache.delete(cacheKeys.contact(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userContacts(userId));

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
// @access  Private
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const contact = await Contact.findOne({ where: { id, userId } });

    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact not found' 
      });
    }

    await contact.destroy();

    // Invalidate caches
    await cache.delete(cacheKeys.contact(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userContacts(userId));

    res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Assign contacts to a group
// @route   POST /api/contacts/assign-to-group
// @access  Private
const assignContactsToGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { contactIds, groupId } = req.body;
    const userId = req.user.id;

    // Verify group belongs to user
    const group = await Group.findOne({ where: { id: groupId, userId } });
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Group not found' 
      });
    }

    // Verify all contacts belong to user
    const contacts = await Contact.findAll({
      where: { 
        id: { [Op.in]: contactIds },
        userId 
      },
    });

    if (contacts.length !== contactIds.length) {
      return res.status(400).json({ 
        success: false,
        message: 'One or more contacts not found or do not belong to you' 
      });
    }

    // Create associations (ignore duplicates)
    const associations = contactIds.map(contactId => ({
      contactId,
      groupId,
    }));

    await ContactGroup.bulkCreate(associations, {
      ignoreDuplicates: true,
    });

    // Invalidate relevant caches
    await cache.deletePattern(cacheKeys.patterns.group(userId, groupId));
    for (const contactId of contactIds) {
      await cache.delete(cacheKeys.contact(userId, contactId));
    }

    res.json({
      success: true,
      message: 'Contacts assigned to group successfully',
      data: {
        groupId,
        contactIds,
      },
    });
  } catch (error) {
    console.error('Error assigning contacts to group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Remove contacts from a group
// @route   POST /api/contacts/remove-from-group
// @access  Private
const removeContactsFromGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { contactIds, groupId } = req.body;
    const userId = req.user.id;

    // Verify group belongs to user
    const group = await Group.findOne({ where: { id: groupId, userId } });
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Group not found' 
      });
    }

    // Remove associations
    await ContactGroup.destroy({
      where: {
        contactId: { [Op.in]: contactIds },
        groupId,
      },
    });

    // Invalidate relevant caches
    await cache.deletePattern(cacheKeys.patterns.group(userId, groupId));
    for (const contactId of contactIds) {
      await cache.delete(cacheKeys.contact(userId, contactId));
    }

    res.json({
      success: true,
      message: 'Contacts removed from group successfully',
    });
  } catch (error) {
    console.error('Error removing contacts from group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Toggle favorite status
// @route   PATCH /api/contacts/:id/favorite
// @access  Private
const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const contact = await Contact.findOne({ where: { id, userId } });

    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact not found' 
      });
    }

    contact.isFavorite = !contact.isFavorite;
    await contact.save();

    // Invalidate caches
    await cache.delete(cacheKeys.contact(userId, id));
    await cache.deletePattern(cacheKeys.patterns.userContacts(userId));

    res.json({
      success: true,
      message: 'Favorite status updated',
      data: contact,
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

module.exports = {
  createContact,
  getContactsByUserId,
  getContactById,
  updateContact,
  deleteContact,
  assignContactsToGroup,
  removeContactsFromGroup,
  toggleFavorite,
};
