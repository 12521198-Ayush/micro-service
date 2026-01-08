'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'

// API Imports
import { createTemplate } from '@/libs/template-service'

const TemplateCreate = () => {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en',
    headerType: 'none',
    headerText: '',
    bodyText: '',
    footerText: '',
    buttons: []
  })
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // Handle form changes
  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value })
  }

  // Add button
  const handleAddButton = () => {
    if (formData.buttons.length >= 3) return
    setFormData({
      ...formData,
      buttons: [...formData.buttons, { type: 'QUICK_REPLY', text: '' }]
    })
  }

  // Update button
  const handleButtonChange = (index, field, value) => {
    const newButtons = [...formData.buttons]
    newButtons[index] = { ...newButtons[index], [field]: value }
    setFormData({ ...formData, buttons: newButtons })
  }

  // Remove button
  const handleRemoveButton = (index) => {
    const newButtons = formData.buttons.filter((_, i) => i !== index)
    setFormData({ ...formData, buttons: newButtons })
  }

  // Build components array from form data
  const buildComponents = () => {
    const components = []

    // Header
    if (formData.headerType === 'text' && formData.headerText) {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: formData.headerText
      })
    } else if (formData.headerType !== 'none') {
      components.push({
        type: 'HEADER',
        format: formData.headerType.toUpperCase()
      })
    }

    // Body
    if (formData.bodyText) {
      components.push({
        type: 'BODY',
        text: formData.bodyText
      })
    }

    // Footer
    if (formData.footerText) {
      components.push({
        type: 'FOOTER',
        text: formData.footerText
      })
    }

    // Buttons
    if (formData.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: formData.buttons.map((btn) => ({
          type: btn.type,
          text: btn.text,
          ...(btn.type === 'URL' && { url: btn.url }),
          ...(btn.type === 'PHONE_NUMBER' && { phone_number: btn.phone })
        }))
      })
    }

    return components
  }

  // Submit form
  const handleSubmit = async () => {
    if (!session?.accessToken) return

    if (!formData.name || !formData.bodyText) {
      setSnackbar({ open: true, message: 'Please fill in required fields', severity: 'error' })
      return
    }

    try {
      setLoading(true)
      
      const templateData = {
        name: formData.name.toLowerCase().replace(/\s+/g, '_'),
        category: formData.category,
        language: formData.language,
        components: buildComponents()
      }

      await createTemplate(session.accessToken, templateData)
      setSnackbar({ open: true, message: 'Template created successfully', severity: 'success' })
      
      setTimeout(() => {
        router.push('/message-template/list')
      }, 1500)
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        signOut({ callbackUrl: '/login' })
      }
      setSnackbar({ open: true, message: error.message || 'Failed to create template', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Grid container spacing={6}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Create Message Template" />
            <CardContent>
              <Grid container spacing={3}>
                {/* Basic Info */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Basic Information
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Template Name"
                    value={formData.name}
                    onChange={handleChange('name')}
                    required
                    helperText="Use lowercase letters, numbers, and underscores only"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category}
                      label="Category"
                      onChange={handleChange('category')}
                    >
                      <MenuItem value="MARKETING">Marketing</MenuItem>
                      <MenuItem value="UTILITY">Utility</MenuItem>
                      <MenuItem value="AUTHENTICATION">Authentication</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={formData.language}
                      label="Language"
                      onChange={handleChange('language')}
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="en_US">English (US)</MenuItem>
                      <MenuItem value="hi">Hindi</MenuItem>
                      <MenuItem value="es">Spanish</MenuItem>
                      <MenuItem value="fr">French</MenuItem>
                      <MenuItem value="de">German</MenuItem>
                      <MenuItem value="pt_BR">Portuguese (BR)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                {/* Header */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Header (Optional)
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Header Type</InputLabel>
                    <Select
                      value={formData.headerType}
                      label="Header Type"
                      onChange={handleChange('headerType')}
                    >
                      <MenuItem value="none">None</MenuItem>
                      <MenuItem value="text">Text</MenuItem>
                      <MenuItem value="image">Image</MenuItem>
                      <MenuItem value="video">Video</MenuItem>
                      <MenuItem value="document">Document</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {formData.headerType === 'text' && (
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Header Text"
                      value={formData.headerText}
                      onChange={handleChange('headerText')}
                      helperText="Max 60 characters"
                      inputProps={{ maxLength: 60 }}
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                {/* Body */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Body Text *
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Message Body"
                    value={formData.bodyText}
                    onChange={handleChange('bodyText')}
                    multiline
                    rows={4}
                    required
                    helperText="Use {{1}}, {{2}}, etc. for dynamic variables. Max 1024 characters."
                    inputProps={{ maxLength: 1024 }}
                  />
                </Grid>

                {/* Footer */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Footer Text (Optional)"
                    value={formData.footerText}
                    onChange={handleChange('footerText')}
                    helperText="Max 60 characters"
                    inputProps={{ maxLength: 60 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                {/* Buttons */}
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Buttons (Optional)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<i className="ri-add-line" />}
                      onClick={handleAddButton}
                      disabled={formData.buttons.length >= 3}
                    >
                      Add Button
                    </Button>
                  </Box>
                </Grid>

                {formData.buttons.map((button, index) => (
                  <Grid item xs={12} key={index}>
                    <Paper sx={{ p: 2 }} variant="outlined">
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Type</InputLabel>
                            <Select
                              value={button.type}
                              label="Type"
                              onChange={(e) => handleButtonChange(index, 'type', e.target.value)}
                            >
                              <MenuItem value="QUICK_REPLY">Quick Reply</MenuItem>
                              <MenuItem value="URL">URL</MenuItem>
                              <MenuItem value="PHONE_NUMBER">Phone Number</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={button.type === 'QUICK_REPLY' ? 8 : 4}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Button Text"
                            value={button.text}
                            onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                          />
                        </Grid>
                        {button.type === 'URL' && (
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              size="small"
                              label="URL"
                              value={button.url || ''}
                              onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                            />
                          </Grid>
                        )}
                        {button.type === 'PHONE_NUMBER' && (
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Phone Number"
                              value={button.phone || ''}
                              onChange={(e) => handleButtonChange(index, 'phone', e.target.value)}
                            />
                          </Grid>
                        )}
                        <Grid item xs="auto">
                          <IconButton size="small" color="error" onClick={() => handleRemoveButton(index)}>
                            <i className="ri-delete-bin-line" />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                ))}

                <Grid item xs={12}>
                  <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                    <Button variant="outlined" onClick={() => router.back()}>
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={loading || !formData.name || !formData.bodyText}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Create Template'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Preview */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardHeader title="Preview" />
            <CardContent>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: '#dcf8c6',
                  borderRadius: 2,
                  maxWidth: 300
                }}
              >
                {formData.headerType === 'text' && formData.headerText && (
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    {formData.headerText}
                  </Typography>
                )}
                {formData.headerType !== 'none' && formData.headerType !== 'text' && (
                  <Box
                    sx={{
                      height: 100,
                      bgcolor: 'grey.300',
                      borderRadius: 1,
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography variant="caption" color="textSecondary">
                      [{formData.headerType.toUpperCase()}]
                    </Typography>
                  </Box>
                )}
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {formData.bodyText || 'Your message will appear here...'}
                </Typography>
                {formData.footerText && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    {formData.footerText}
                  </Typography>
                )}
                {formData.buttons.length > 0 && (
                  <Box sx={{ mt: 2, borderTop: 1, borderColor: 'divider', pt: 1 }}>
                    {formData.buttons.map((btn, index) => (
                      <Chip
                        key={index}
                        label={btn.text || 'Button'}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                )}
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default TemplateCreate
