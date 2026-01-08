import axios from 'axios';

const META_API_VERSION = process.env.META_API_VERSION || 'v24.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * @desc    Get phone number info
 * @route   GET /api/whatsapp/phone-numbers/:phoneNumberId
 * @access  Private
 */
export const getPhoneNumberInfo = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    const config = req.wabaConfig;

    const response = await axios.get(
      `${META_GRAPH_URL}/${phoneNumberId}`,
      {
        params: {
          access_token: config.accessToken,
          fields: 'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,platform_type,code_verification_status,name_status,is_official_business_account,throughput'
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Get Phone Number Info Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Get all phone numbers for WABA
 * @route   GET /api/whatsapp/phone-numbers
 * @access  Private
 */
export const getPhoneNumbers = async (req, res) => {
  try {
    const config = req.wabaConfig;

    const response = await axios.get(
      `${META_GRAPH_URL}/${config.wabaId}/phone_numbers`,
      {
        params: {
          access_token: config.accessToken,
          fields: 'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,platform_type,code_verification_status,name_status,is_official_business_account'
        }
      }
    );

    res.json({
      success: true,
      data: response.data.data
    });
  } catch (error) {
    console.error('Get Phone Numbers Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Request verification code for phone number
 * @route   POST /api/whatsapp/phone-numbers/:phoneNumberId/request-code
 * @access  Private
 */
export const requestVerificationCode = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    const { codeMethod = 'SMS', language = 'en' } = req.body;
    const config = req.wabaConfig;

    const response = await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}/request_code`,
      {
        code_method: codeMethod, // SMS or VOICE
        language
      },
      {
        params: {
          access_token: config.accessToken
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Request Verification Code Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Verify phone number with code
 * @route   POST /api/whatsapp/phone-numbers/:phoneNumberId/verify-code
 * @access  Private
 */
export const verifyCode = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    const { code } = req.body;
    const config = req.wabaConfig;

    const response = await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}/verify_code`,
      { code },
      {
        params: {
          access_token: config.accessToken
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Verify Code Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Register phone number
 * @route   POST /api/whatsapp/phone-numbers/:phoneNumberId/register
 * @access  Private
 */
export const registerPhoneNumber = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    const { pin } = req.body; // 6-digit PIN for 2FA
    const config = req.wabaConfig;

    const response = await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}/register`,
      {
        messaging_product: 'whatsapp',
        pin
      },
      {
        params: {
          access_token: config.accessToken
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Register Phone Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Deregister phone number
 * @route   POST /api/whatsapp/phone-numbers/:phoneNumberId/deregister
 * @access  Private
 */
export const deregisterPhoneNumber = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    const config = req.wabaConfig;

    const response = await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}/deregister`,
      {},
      {
        params: {
          access_token: config.accessToken
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Deregister Phone Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Set two-step verification PIN
 * @route   POST /api/whatsapp/phone-numbers/:phoneNumberId/set-pin
 * @access  Private
 */
export const setTwoStepPin = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    const { pin } = req.body; // 6-digit PIN
    const config = req.wabaConfig;

    const response = await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}`,
      { pin },
      {
        params: {
          access_token: config.accessToken
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Set PIN Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Get business profile
 * @route   GET /api/whatsapp/phone-numbers/:phoneNumberId/profile
 * @access  Private
 */
export const getBusinessProfile = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    const config = req.wabaConfig;

    const response = await axios.get(
      `${META_GRAPH_URL}/${phoneNumberId}/whatsapp_business_profile`,
      {
        params: {
          access_token: config.accessToken,
          fields: 'about,address,description,email,profile_picture_url,websites,vertical'
        }
      }
    );

    res.json({
      success: true,
      data: response.data.data[0]
    });
  } catch (error) {
    console.error('Get Business Profile Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Update business profile
 * @route   PUT /api/whatsapp/phone-numbers/:phoneNumberId/profile
 * @access  Private
 */
export const updateBusinessProfile = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    const { about, address, description, email, websites, vertical, profilePictureHandle } = req.body;
    const config = req.wabaConfig;

    const updateData = {
      messaging_product: 'whatsapp'
    };

    if (about) updateData.about = about;
    if (address) updateData.address = address;
    if (description) updateData.description = description;
    if (email) updateData.email = email;
    if (websites) updateData.websites = websites;
    if (vertical) updateData.vertical = vertical;
    if (profilePictureHandle) updateData.profile_picture_handle = profilePictureHandle;

    const response = await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}/whatsapp_business_profile`,
      updateData,
      {
        params: {
          access_token: config.accessToken
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Update Business Profile Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Get commerce settings
 * @route   GET /api/whatsapp/phone-numbers/:phoneNumberId/commerce
 * @access  Private
 */
export const getCommerceSettings = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    const config = req.wabaConfig;

    const response = await axios.get(
      `${META_GRAPH_URL}/${phoneNumberId}/whatsapp_commerce_settings`,
      {
        params: {
          access_token: config.accessToken,
          fields: 'id,is_cart_enabled,is_catalog_visible'
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Get Commerce Settings Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Update commerce settings
 * @route   PUT /api/whatsapp/phone-numbers/:phoneNumberId/commerce
 * @access  Private
 */
export const updateCommerceSettings = async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    const { isCartEnabled, isCatalogVisible } = req.body;
    const config = req.wabaConfig;

    const response = await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}/whatsapp_commerce_settings`,
      {
        is_cart_enabled: isCartEnabled,
        is_catalog_visible: isCatalogVisible
      },
      {
        params: {
          access_token: config.accessToken
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Update Commerce Settings Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

export default {
  getPhoneNumberInfo,
  getPhoneNumbers,
  requestVerificationCode,
  verifyCode,
  registerPhoneNumber,
  deregisterPhoneNumber,
  setTwoStepPin,
  getBusinessProfile,
  updateBusinessProfile,
  getCommerceSettings,
  updateCommerceSettings
};
