import OrganizationDetails from '../models/OrganizationDetails.js';
import User from '../models/User.js';

export const createOrUpdateOrganizationDetails = async (req, res) => {
  try {
    const {
      organizationName,
      physicalAddress,
      city,
      state,
      zipCode,
      country,
    } = req.body;

    // Validate input
    if (!organizationName) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    // Verify user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if organization details already exist
    const existingDetails = await OrganizationDetails.findByUserId(req.user.id);

    let result;
    let isCreated = false;

    if (existingDetails) {
      // Update existing organization details
      const updated = await OrganizationDetails.update(req.user.id, {
        organizationName,
        physicalAddress,
        city,
        state,
        zipCode,
        country,
      });

      if (!updated) {
        return res.status(500).json({ error: 'Failed to update organization details' });
      }

      result = {
        id: existingDetails.id,
        userId: req.user.id,
        organizationName,
        physicalAddress,
        city,
        state,
        zipCode,
        country,
      };
    } else {
      // Create new organization details
      const detailsId = await OrganizationDetails.create(req.user.id, {
        organizationName,
        physicalAddress,
        city,
        state,
        zipCode,
        country,
      });

      isCreated = true;
      result = {
        id: detailsId,
        userId: req.user.id,
        organizationName,
        physicalAddress,
        city,
        state,
        zipCode,
        country,
      };
    }

    res.status(isCreated ? 201 : 200).json({
      message: isCreated
        ? 'Organization details added successfully'
        : 'Organization details updated successfully',
      organizationDetails: result,
    });
  } catch (error) {
    console.error('Create/Update organization details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrganizationDetails = async (req, res) => {
  try {
    // Verify user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const details = await OrganizationDetails.findByUserId(req.user.id);

    if (!details) {
      return res.status(404).json({ error: 'Organization details not found' });
    }

    res.status(200).json({
      organizationDetails: {
        id: details.id,
        userId: details.user_id,
        organizationName: details.organization_name,
        physicalAddress: details.physical_address,
        city: details.city,
        state: details.state,
        zipCode: details.zip_code,
        country: details.country,
        createdAt: details.created_at,
        updatedAt: details.updated_at,
      },
    });
  } catch (error) {
    console.error('Get organization details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
