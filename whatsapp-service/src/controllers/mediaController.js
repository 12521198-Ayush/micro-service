import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const META_API_VERSION = process.env.META_API_VERSION || 'v24.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * @desc    Upload media to WhatsApp
 * @route   POST /api/whatsapp/media/upload
 * @access  Private
 */
export const uploadMedia = async (req, res) => {
  try {
    const { file } = req;
    const { type } = req.body; // image, video, audio, document, sticker
    const config = req.wabaConfig;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', fs.createReadStream(file.path), {
      filename: file.originalname,
      contentType: file.mimetype
    });
    formData.append('type', file.mimetype);

    const response = await axios.post(
      `${META_GRAPH_URL}/${config.phoneNumberId}/media`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${config.accessToken}`
        }
      }
    );

    // Clean up temp file
    fs.unlinkSync(file.path);

    res.json({
      success: true,
      data: {
        mediaId: response.data.id,
        type
      }
    });
  } catch (error) {
    console.error('Upload Media Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Get media URL (for downloading received media)
 * @route   GET /api/whatsapp/media/:mediaId
 * @access  Private
 */
export const getMediaUrl = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const config = req.wabaConfig;

    const response = await axios.get(
      `${META_GRAPH_URL}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        }
      }
    );

    res.json({
      success: true,
      data: {
        url: response.data.url,
        mimeType: response.data.mime_type,
        sha256: response.data.sha256,
        fileSize: response.data.file_size
      }
    });
  } catch (error) {
    console.error('Get Media URL Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Download media file
 * @route   GET /api/whatsapp/media/:mediaId/download
 * @access  Private
 */
export const downloadMedia = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const config = req.wabaConfig;

    // First get the media URL
    const urlResponse = await axios.get(
      `${META_GRAPH_URL}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        }
      }
    );

    const mediaUrl = urlResponse.data.url;
    const mimeType = urlResponse.data.mime_type;

    // Download the actual file
    const fileResponse = await axios.get(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      },
      responseType: 'stream'
    });

    // Set headers for file download
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="media_${mediaId}"`);

    // Pipe the file to response
    fileResponse.data.pipe(res);
  } catch (error) {
    console.error('Download Media Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Delete media
 * @route   DELETE /api/whatsapp/media/:mediaId
 * @access  Private
 */
export const deleteMedia = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const config = req.wabaConfig;

    await axios.delete(
      `${META_GRAPH_URL}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        }
      }
    );

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Delete Media Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

/**
 * @desc    Resume interrupted media upload
 * @route   POST /api/whatsapp/media/resume
 * @access  Private
 */
export const resumeUpload = async (req, res) => {
  try {
    const { uploadSessionId, offset, file } = req.body;
    const config = req.wabaConfig;

    // Create resumable upload session if not exists
    if (!uploadSessionId) {
      const sessionResponse = await axios.post(
        `${META_GRAPH_URL}/${config.phoneNumberId}/uploads`,
        {
          messaging_product: 'whatsapp',
          file_length: file.size,
          file_type: file.mimetype
        },
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`
          }
        }
      );

      return res.json({
        success: true,
        data: {
          uploadSessionId: sessionResponse.data.id,
          offset: 0
        }
      });
    }

    // Resume upload from offset
    // This is a simplified version - full implementation would handle chunked uploads

    res.json({
      success: true,
      message: 'Resumable upload session active',
      data: {
        uploadSessionId,
        offset
      }
    });
  } catch (error) {
    console.error('Resume Upload Error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
};

export default {
  uploadMedia,
  getMediaUrl,
  downloadMedia,
  deleteMedia,
  resumeUpload
};
