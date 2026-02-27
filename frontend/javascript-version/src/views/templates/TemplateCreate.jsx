'use client'

// React Imports
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import Collapse from '@mui/material/Collapse'
import LinearProgress from '@mui/material/LinearProgress'
import FormHelperText from '@mui/material/FormHelperText'

// API Imports
import {
  createTemplate,
  validateTemplate,
  uploadTemplateMedia
} from '@/libs/template-service'
import embeddedSignupService from '@/services/embeddedSignupService'

// ─── Constants ───────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt_BR', label: 'Portuguese (BR)' },
  { code: 'ar', label: 'Arabic' },
  { code: 'id', label: 'Indonesian' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'nl', label: 'Dutch' },
  { code: 'ru', label: 'Russian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'zh_CN', label: 'Chinese (Simplified)' },
  { code: 'zh_TW', label: 'Chinese (Traditional)' }
]

const BUTTON_TYPES = [
  { value: 'QUICK_REPLY', label: 'Quick Reply' },
  { value: 'URL', label: 'URL' },
  { value: 'PHONE_NUMBER', label: 'Phone Number' },
  { value: 'COPY_CODE', label: 'Copy Code' }
]

const HEADER_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'TEXT', label: 'Text' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'DOCUMENT', label: 'Document' }
]

const MEDIA_ACCEPT = {
  IMAGE: 'image/jpeg,image/png',
  VIDEO: 'video/mp4',
  DOCUMENT: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

const VARIABLE_REGEX = /\{\{\d+\}\}/g
const NAMED_VARIABLE_REGEX = /\{\{[a-zA-Z_]\w*\}\}/g

// ─── Helpers ─────────────────────────────────────────────────────────────────

const extractVariables = (text) => {
  if (!text) return []

  const positional = text.match(VARIABLE_REGEX) || []
  const named = text.match(NAMED_VARIABLE_REGEX) || []

  return [...new Set([...positional, ...named])]
}

const sanitizeTemplateName = (value) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// ─── Component ───────────────────────────────────────────────────────────────

const TemplateCreate = () => {
  const { data: session } = useSession()
  const router = useRouter()
  const fileInputRef = useRef(null)

  // ─── Form State ──────────────────────────────────────────────────────────

  const [formData, setFormData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en',
    headerType: 'none',
    headerText: '',
    headerMediaHandle: '',
    bodyText: '',
    footerText: '',
    buttons: [],
    // Variable examples
    headerExamples: [],
    bodyExamples: []
  })

  // ─── UI State ────────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedMedia, setUploadedMedia] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // ─── WABA Account State ──────────────────────────────────────────────────

  const [wabaAccounts, setWabaAccounts] = useState([])
  const [selectedWabaId, setSelectedWabaId] = useState('')
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState('')
  const [wabaLoading, setWabaLoading] = useState(true)

  const selectedWaba = wabaAccounts.find(acc => acc.wabaId === selectedWabaId)
  const availableNumbers = selectedWaba?.numbers || selectedWaba?.phoneNumbers || []

  const tenantContext = useMemo(() => ({
    metaBusinessAccountId: selectedWabaId,
    metaPhoneNumberId: selectedPhoneNumberId,
    organizationId: selectedWaba?.organizationId || '',
    metaAppId: process.env.NEXT_PUBLIC_META_APP_ID || ''
  }), [selectedWabaId, selectedPhoneNumberId, selectedWaba?.organizationId])

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleAuthError = (error) => {
    if (error.status === 401) {
      signOut({ callbackUrl: '/login' })
      return true
    }
    return false
  }

  // ─── Fetch WABA Accounts ─────────────────────────────────────────────────

  useEffect(() => {
    const fetchWabaAccounts = async () => {
      try {
        setWabaLoading(true)
        const response = await embeddedSignupService.getWabaAccountsDetails()
        const accounts = response.data || []
        setWabaAccounts(accounts)

        if (accounts.length > 0) {
          setSelectedWabaId(accounts[0].wabaId)
          const firstNumber = (accounts[0].numbers || accounts[0].phoneNumbers || [])[0]
          setSelectedPhoneNumberId(firstNumber?.phoneNumberId || '')
        }
      } catch (error) {
        console.error('Failed to fetch WABA accounts:', error)
        if (error?.status === 401) {
          signOut({ callbackUrl: '/login' })
          return
        }
        showSnackbar('Failed to load WABA accounts', 'error')
      } finally {
        setWabaLoading(false)
      }
    }

    if (session?.accessToken) {
      fetchWabaAccounts()
    }
  }, [session?.accessToken])

  const handleWabaChange = (event) => {
    const nextWabaId = event.target.value
    setSelectedWabaId(nextWabaId)

    const account = wabaAccounts.find(acc => acc.wabaId === nextWabaId)
    const firstNumber = (account?.numbers || account?.phoneNumbers || [])[0]
    setSelectedPhoneNumberId(firstNumber?.phoneNumberId || '')
  }

  const handlePhoneNumberChange = (event) => {
    setSelectedPhoneNumberId(event.target.value)
  }

  // ─── Derived State ───────────────────────────────────────────────────────

  const headerVariables = useMemo(() => extractVariables(formData.headerText), [formData.headerText])
  const bodyVariables = useMemo(() => extractVariables(formData.bodyText), [formData.bodyText])
  const isMediaHeader = ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerType)
  const isAuthentication = formData.category === 'AUTHENTICATION'

  const canSubmit = useMemo(() => {
    if (!formData.name || !formData.bodyText) return false
    if (formData.headerType === 'TEXT' && !formData.headerText) return false
    if (isMediaHeader && !formData.headerMediaHandle && !uploadedMedia) return false
    if (!selectedWabaId) return false
    return true
  }, [formData, isMediaHeader, uploadedMedia, selectedWabaId])

  // ─── Form Handlers ───────────────────────────────────────────────────────

  const handleChange = (field) => (event) => {
    const value = event.target.value

    setFormData((prev) => {
      const next = { ...prev, [field]: value }

      // Reset media state when header type changes
      if (field === 'headerType') {
        next.headerText = ''
        next.headerMediaHandle = ''
        next.headerExamples = []
        setUploadedMedia(null)
      }

      // Reset footer for auth templates
      if (field === 'category' && value === 'AUTHENTICATION') {
        next.footerText = ''
      }

      return next
    })

    setValidationErrors([])
  }

  const handleNameChange = (event) => {
    const raw = event.target.value
    const sanitized = sanitizeTemplateName(raw)

    setFormData((prev) => ({ ...prev, name: sanitized }))
    setValidationErrors([])
  }

  // ─── Button Handlers ─────────────────────────────────────────────────────

  const handleAddButton = () => {
    if (formData.buttons.length >= 10) return

    setFormData((prev) => ({
      ...prev,
      buttons: [...prev.buttons, { type: 'QUICK_REPLY', text: '' }]
    }))
  }

  const handleButtonChange = (index, field, value) => {
    setFormData((prev) => {
      const newButtons = [...prev.buttons]
      newButtons[index] = { ...newButtons[index], [field]: value }
      return { ...prev, buttons: newButtons }
    })
  }

  const handleRemoveButton = (index) => {
    setFormData((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }))
  }

  // ─── Variable Example Handlers ────────────────────────────────────────────

  const handleBodyExampleChange = (index, value) => {
    setFormData((prev) => {
      const examples = [...(prev.bodyExamples || [])]
      examples[index] = value
      return { ...prev, bodyExamples: examples }
    })
  }

  const handleHeaderExampleChange = (index, value) => {
    setFormData((prev) => {
      const examples = [...(prev.headerExamples || [])]
      examples[index] = value
      return { ...prev, headerExamples: examples }
    })
  }

  // ─── Media Upload ─────────────────────────────────────────────────────────

  const handleMediaUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !session?.accessToken) return

    try {
      setUploading(true)
      const response = await uploadTemplateMedia(session.accessToken, file, undefined, tenantContext)
      const data = response.data

      setUploadedMedia({
        headerHandle: data.headerHandle || data.header_handle,
        fileName: data.fileName || file.name,
        fileSize: data.fileSize || file.size,
        mimeType: data.mimeType || file.type
      })

      setFormData((prev) => ({
        ...prev,
        headerMediaHandle: data.headerHandle || data.header_handle
      }))

      showSnackbar(`Media uploaded: ${file.name}`)
    } catch (error) {
      if (!handleAuthError(error)) {
        showSnackbar(error.message || 'Failed to upload media', 'error')
      }
    } finally {
      setUploading(false)
      // Reset the file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── Build Components ─────────────────────────────────────────────────────

  const buildComponents = useCallback(() => {
    const components = []

    // Header
    if (formData.headerType === 'TEXT' && formData.headerText) {
      const headerComponent = {
        type: 'HEADER',
        format: 'TEXT',
        text: formData.headerText
      }

      if (headerVariables.length > 0 && formData.headerExamples?.length > 0) {
        headerComponent.example = {
          header_text: formData.headerExamples.filter(Boolean)
        }
      }

      components.push(headerComponent)
    } else if (isMediaHeader) {
      const mediaHandle = formData.headerMediaHandle || uploadedMedia?.headerHandle

      if (mediaHandle) {
        components.push({
          type: 'HEADER',
          format: formData.headerType,
          example: {
            header_handle: [mediaHandle]
          }
        })
      }
    }

    // Body
    if (formData.bodyText) {
      const bodyComponent = {
        type: 'BODY',
        text: formData.bodyText
      }

      if (bodyVariables.length > 0 && formData.bodyExamples?.length > 0) {
        bodyComponent.example = {
          body_text: [formData.bodyExamples.filter(Boolean)]
        }
      }

      components.push(bodyComponent)
    }

    // Footer
    if (formData.footerText && !isAuthentication) {
      components.push({
        type: 'FOOTER',
        text: formData.footerText
      })
    }

    // Buttons
    if (formData.buttons.length > 0) {
      const buttons = formData.buttons
        .filter((btn) => btn.text || btn.type === 'COPY_CODE')
        .map((btn) => {
          const button = { type: btn.type, text: btn.text }

          if (btn.type === 'URL' && btn.url) {
            button.url = btn.url

            if (/\{\{.*?\}\}/.test(btn.url) && btn.urlExample) {
              button.example = [btn.urlExample]
            }
          }

          if (btn.type === 'PHONE_NUMBER' && btn.phone_number) {
            button.phone_number = btn.phone_number
          }

          if (btn.type === 'COPY_CODE' && btn.example) {
            button.example = [btn.example]
          }

          return button
        })

      if (buttons.length > 0) {
        components.push({ type: 'BUTTONS', buttons })
      }
    }

    return components
  }, [formData, headerVariables, bodyVariables, isMediaHeader, isAuthentication, uploadedMedia])

  // ─── Validate ─────────────────────────────────────────────────────────────

  const handleValidate = async () => {
    if (!session?.accessToken) return

    try {
      setValidating(true)
      setValidationErrors([])

      const payload = {
        name: formData.name,
        language: formData.language,
        category: formData.category,
        components: buildComponents()
      }

      const response = await validateTemplate(session.accessToken, payload, false, tenantContext)

      if (response.isValid || response.success) {
        showSnackbar('Template payload is valid ✓')
        setValidationErrors([])
      } else {
        setValidationErrors(response.errors || ['Validation failed'])
        showSnackbar('Validation errors found', 'warning')
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        const details = error.details
        if (Array.isArray(details)) {
          setValidationErrors(details)
        } else {
          setValidationErrors([error.message || 'Validation request failed'])
        }
        showSnackbar(error.message || 'Validation failed', 'error')
      }
    } finally {
      setValidating(false)
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!session?.accessToken || !canSubmit) return

    try {
      setLoading(true)
      setValidationErrors([])

      const payload = {
        name: formData.name,
        language: formData.language,
        category: formData.category,
        components: buildComponents()
      }

      await createTemplate(session.accessToken, payload, tenantContext)
      showSnackbar('Template created successfully!')

      setTimeout(() => {
        router.push('/message-template/list')
      }, 1200)
    } catch (error) {
      if (!handleAuthError(error)) {
        const details = error.details

        if (Array.isArray(details)) {
          setValidationErrors(details)
        }

        showSnackbar(error.message || 'Failed to create template', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Preview Text ─────────────────────────────────────────────────────────

  const previewBodyText = useMemo(() => {
    let text = formData.bodyText || ''

    bodyVariables.forEach((variable, index) => {
      const example = formData.bodyExamples?.[index]
      if (example) {
        text = text.replace(variable, example)
      }
    })

    return text
  }, [formData.bodyText, bodyVariables, formData.bodyExamples])

  const previewHeaderText = useMemo(() => {
    let text = formData.headerText || ''

    headerVariables.forEach((variable, index) => {
      const example = formData.headerExamples?.[index]
      if (example) {
        text = text.replace(variable, example)
      }
    })

    return text
  }, [formData.headerText, headerVariables, formData.headerExamples])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Grid container spacing={6}>
        {/* ─── Form ─────────────────────────────────────────────────────────── */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Create Message Template"
              subheader="Build a WhatsApp template and submit it to Meta for approval"
            />

            {(loading || uploading) && <LinearProgress />}

            <CardContent>
              {/* Validation Errors */}
              <Collapse in={validationErrors.length > 0}>
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setValidationErrors([])}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    Validation Errors
                  </Typography>
                  {validationErrors.map((err, i) => (
                    <Typography key={i} variant="body2" sx={{ ml: 1 }}>
                      • {typeof err === 'string' ? err : err.message || JSON.stringify(err)}
                    </Typography>
                  ))}
                </Alert>
              </Collapse>

              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                <Tab label="Content" />
                <Tab label="Buttons" />
                <Tab label="Variables & Examples" disabled={bodyVariables.length === 0 && headerVariables.length === 0} />
              </Tabs>

              {/* ─── Tab 0: Content ─────────────────────────────────────────── */}
              {activeTab === 0 && (
                <Grid container spacing={3}>
                  {/* WABA Account Selection */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      WABA Account
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required disabled={wabaLoading}>
                      <InputLabel>Select WABA Account</InputLabel>
                      <Select value={selectedWabaId} label="Select WABA Account" onChange={handleWabaChange}>
                        {wabaAccounts.length === 0 ? (
                          <MenuItem disabled>{wabaLoading ? 'Loading...' : 'No WABA accounts found'}</MenuItem>
                        ) : (
                          wabaAccounts.map((account) => (
                            <MenuItem key={account.wabaId} value={account.wabaId}>
                              {account.businessName || account.wabaId}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                      {!wabaLoading && wabaAccounts.length === 0 && (
                        <FormHelperText error>No WABA accounts connected. Please set up Embedded Signup first.</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required disabled={!selectedWabaId || availableNumbers.length === 0}>
                      <InputLabel>Select Phone Number</InputLabel>
                      <Select value={selectedPhoneNumberId} label="Select Phone Number" onChange={handlePhoneNumberChange}>
                        {availableNumbers.length === 0 ? (
                          <MenuItem disabled>No phone numbers</MenuItem>
                        ) : (
                          availableNumbers.map((num) => (
                            <MenuItem key={num.phoneNumberId} value={num.phoneNumberId}>
                              {num.displayPhoneNumber || num.phoneNumberId}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                      {selectedWabaId && availableNumbers.length === 0 && (
                        <FormHelperText>No phone numbers available for this WABA</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}><Divider /></Grid>

                  {/* Basic Info */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Basic Information
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Template Name"
                      value={formData.name}
                      onChange={handleNameChange}
                      required
                      helperText="Lowercase letters, numbers, and underscores only"
                      placeholder="e.g. order_confirmation"
                      inputProps={{ maxLength: 512 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select value={formData.category} label="Category" onChange={handleChange('category')}>
                        <MenuItem value="MARKETING">Marketing</MenuItem>
                        <MenuItem value="UTILITY">Utility</MenuItem>
                        <MenuItem value="AUTHENTICATION">Authentication</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select value={formData.language} label="Language" onChange={handleChange('language')}>
                        {LANGUAGES.map((lang) => (
                          <MenuItem key={lang.code} value={lang.code}>{lang.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}><Divider /></Grid>

                  {/* Header */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Header (Optional)
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Header Type</InputLabel>
                      <Select value={formData.headerType} label="Header Type" onChange={handleChange('headerType')}>
                        {HEADER_TYPES.map((ht) => (
                          <MenuItem key={ht.value} value={ht.value}>{ht.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {formData.headerType === 'TEXT' && (
                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        label="Header Text"
                        value={formData.headerText}
                        onChange={handleChange('headerText')}
                        helperText={`${formData.headerText.length}/60 characters. Use {{1}} for variables.`}
                        inputProps={{ maxLength: 60 }}
                        placeholder="e.g. Hello {{1}}!"
                      />
                    </Grid>
                  )}

                  {isMediaHeader && (
                    <Grid item xs={12} sm={8}>
                      <Box display="flex" gap={2} alignItems="center">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept={MEDIA_ACCEPT[formData.headerType] || '*/*'}
                          style={{ display: 'none' }}
                          onChange={handleMediaUpload}
                        />
                        <Button
                          variant="outlined"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          startIcon={uploading ? <CircularProgress size={18} /> : <i className="ri-upload-2-line" />}
                        >
                          {uploading ? 'Uploading...' : `Upload ${formData.headerType.toLowerCase()}`}
                        </Button>

                        {uploadedMedia && (
                          <Chip
                            label={uploadedMedia.fileName}
                            color="success"
                            size="small"
                            onDelete={() => {
                              setUploadedMedia(null)
                              setFormData((prev) => ({ ...prev, headerMediaHandle: '' }))
                            }}
                          />
                        )}
                      </Box>
                      <FormHelperText>
                        Upload a {formData.headerType.toLowerCase()} file for the template header. Max 25 MB.
                      </FormHelperText>
                    </Grid>
                  )}

                  <Grid item xs={12}><Divider /></Grid>

                  {/* Body */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Body Text <Typography component="span" color="error.main">*</Typography>
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Message Body"
                      value={formData.bodyText}
                      onChange={handleChange('bodyText')}
                      multiline
                      rows={5}
                      required
                      helperText={`${formData.bodyText.length}/1024 characters. Use {{1}}, {{2}} etc. for dynamic variables.`}
                      inputProps={{ maxLength: 1024 }}
                      placeholder="Hi {{1}}, your order #{{2}} has been confirmed."
                    />

                    {bodyVariables.length > 0 && (
                      <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
                        <Typography variant="caption" color="text.secondary">Variables found:</Typography>
                        {bodyVariables.map((v, i) => (
                          <Chip key={i} label={v} size="small" variant="outlined" color="info" />
                        ))}
                      </Box>
                    )}
                  </Grid>

                  {/* Footer */}
                  {!isAuthentication && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Footer Text (Optional)"
                        value={formData.footerText}
                        onChange={handleChange('footerText')}
                        helperText={`${formData.footerText.length}/60 characters`}
                        inputProps={{ maxLength: 60 }}
                        placeholder="e.g. Reply STOP to unsubscribe"
                      />
                    </Grid>
                  )}
                </Grid>
              )}

              {/* ─── Tab 1: Buttons ─────────────────────────────────────────── */}
              {activeTab === 1 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Buttons (Optional)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Up to 10 Quick Reply or 2 URL/Phone buttons
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        startIcon={<i className="ri-add-line" />}
                        onClick={handleAddButton}
                        disabled={formData.buttons.length >= 10}
                      >
                        Add Button
                      </Button>
                    </Box>
                  </Grid>

                  {formData.buttons.length === 0 && (
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                        <i className="ri-cursor-line" style={{ fontSize: 36, color: 'var(--mui-palette-text-secondary)' }} />
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                          No buttons added yet. Click "Add Button" to add interactive buttons.
                        </Typography>
                      </Paper>
                    </Grid>
                  )}

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
                                {BUTTON_TYPES.map((bt) => (
                                  <MenuItem key={bt.value} value={bt.value}>{bt.label}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={12} sm={button.type === 'QUICK_REPLY' || button.type === 'COPY_CODE' ? 8 : 4}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Button Text"
                              value={button.text}
                              onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                              inputProps={{ maxLength: 25 }}
                              helperText={`${(button.text || '').length}/25`}
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
                                placeholder="https://example.com/{{1}}"
                                helperText="Use {{1}} for dynamic URL suffix"
                              />
                            </Grid>
                          )}

                          {button.type === 'URL' && /\{\{.*?\}\}/.test(button.url || '') && (
                            <Grid item xs={12} sm={4}>
                              <TextField
                                fullWidth
                                size="small"
                                label="URL Variable Example"
                                value={button.urlExample || ''}
                                onChange={(e) => handleButtonChange(index, 'urlExample', e.target.value)}
                                placeholder="e.g. order-123"
                              />
                            </Grid>
                          )}

                          {button.type === 'PHONE_NUMBER' && (
                            <Grid item xs={12} sm={4}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Phone Number"
                                value={button.phone_number || ''}
                                onChange={(e) => handleButtonChange(index, 'phone_number', e.target.value)}
                                placeholder="+1234567890"
                              />
                            </Grid>
                          )}

                          {button.type === 'COPY_CODE' && (
                            <Grid item xs={12} sm={4}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Code Example"
                                value={button.example || ''}
                                onChange={(e) => handleButtonChange(index, 'example', e.target.value)}
                                placeholder="e.g. SAVE20"
                              />
                            </Grid>
                          )}

                          <Grid item xs="auto">
                            <Tooltip title="Remove button">
                              <IconButton size="small" color="error" onClick={() => handleRemoveButton(index)}>
                                <i className="ri-delete-bin-line" />
                              </IconButton>
                            </Tooltip>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* ─── Tab 2: Variables & Examples ─────────────────────────────── */}
              {activeTab === 2 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Meta requires example values for every variable used in your template.
                      These examples are shown to Meta reviewers during the approval process.
                    </Alert>
                  </Grid>

                  {/* Header Variable Examples */}
                  {headerVariables.length > 0 && (
                    <>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Header Variable Examples
                        </Typography>
                      </Grid>
                      {headerVariables.map((variable, index) => (
                        <Grid item xs={12} sm={6} key={`hdr-${index}`}>
                          <TextField
                            fullWidth
                            size="small"
                            label={`Example for ${variable}`}
                            value={formData.headerExamples?.[index] || ''}
                            onChange={(e) => handleHeaderExampleChange(index, e.target.value)}
                            placeholder={`e.g. John`}
                          />
                        </Grid>
                      ))}
                    </>
                  )}

                  {/* Body Variable Examples */}
                  {bodyVariables.length > 0 && (
                    <>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Body Variable Examples
                        </Typography>
                      </Grid>
                      {bodyVariables.map((variable, index) => (
                        <Grid item xs={12} sm={6} key={`body-${index}`}>
                          <TextField
                            fullWidth
                            size="small"
                            label={`Example for ${variable}`}
                            value={formData.bodyExamples?.[index] || ''}
                            onChange={(e) => handleBodyExampleChange(index, e.target.value)}
                            placeholder={`Example value for ${variable}`}
                          />
                        </Grid>
                      ))}
                    </>
                  )}

                  {bodyVariables.length === 0 && headerVariables.length === 0 && (
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                          No variables detected. Add variables like {'{{1}}'}, {'{{2}}'} in your header or body text.
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              )}

              {/* ─── Action Buttons ─────────────────────────────────────────── */}
              <Box display="flex" gap={2} justifyContent="space-between" sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button
                  variant="text"
                  onClick={handleValidate}
                  disabled={validating || !formData.name || !formData.bodyText}
                  startIcon={validating ? <CircularProgress size={18} /> : <i className="ri-checkbox-circle-line" />}
                >
                  {validating ? 'Validating...' : 'Validate'}
                </Button>

                <Box display="flex" gap={2}>
                  <Button variant="outlined" onClick={() => router.back()} disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading || !canSubmit}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <i className="ri-send-plane-line" />}
                  >
                    {loading ? 'Creating...' : 'Create Template'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Preview ──────────────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardHeader
              title="Preview"
              subheader="Live preview of your template"
              action={
                <Chip
                  label={formData.category}
                  size="small"
                  color={formData.category === 'MARKETING' ? 'primary' : formData.category === 'UTILITY' ? 'info' : 'secondary'}
                  variant="outlined"
                />
              }
            />
            <CardContent>
              {/* WhatsApp-style bubble */}
              <Paper
                sx={{
                  p: 2,
                  bgcolor: '#dcf8c6',
                  borderRadius: 2,
                  maxWidth: 320,
                  mx: 'auto',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: -8,
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid #dcf8c6',
                    borderTop: '8px solid transparent'
                  }
                }}
              >
                {/* Header */}
                {formData.headerType === 'TEXT' && formData.headerText && (
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    {previewHeaderText}
                  </Typography>
                )}

                {isMediaHeader && (
                  <Box
                    sx={{
                      height: formData.headerType === 'VIDEO' ? 140 : 120,
                      bgcolor: 'grey.200',
                      borderRadius: 1,
                      mb: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed',
                      borderColor: 'grey.400'
                    }}
                  >
                    <i className={
                      formData.headerType === 'IMAGE' ? 'ri-image-line' :
                      formData.headerType === 'VIDEO' ? 'ri-video-line' :
                      'ri-file-line'
                    } style={{ fontSize: 28, color: 'var(--mui-palette-text-secondary)' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {uploadedMedia ? uploadedMedia.fileName : `[${formData.headerType}]`}
                    </Typography>
                  </Box>
                )}

                {/* Body */}
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {previewBodyText || 'Your message will appear here...'}
                </Typography>

                {/* Footer */}
                {formData.footerText && !isAuthentication && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {formData.footerText}
                  </Typography>
                )}

                {/* Buttons */}
                {formData.buttons.length > 0 && (
                  <Box sx={{ mt: 1.5, borderTop: 1, borderColor: 'divider', pt: 1 }}>
                    {formData.buttons.map((btn, index) => (
                      <Box
                        key={index}
                        sx={{
                          textAlign: 'center',
                          py: 0.75,
                          borderBottom: index < formData.buttons.length - 1 ? 1 : 0,
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                          borderRadius: 1
                        }}
                      >
                        <Typography variant="body2" color="primary.main" fontWeight={500}>
                          {btn.type === 'URL' && <i className="ri-external-link-line" style={{ marginRight: 4, fontSize: 14 }} />}
                          {btn.type === 'PHONE_NUMBER' && <i className="ri-phone-line" style={{ marginRight: 4, fontSize: 14 }} />}
                          {btn.type === 'COPY_CODE' && <i className="ri-file-copy-line" style={{ marginRight: 4, fontSize: 14 }} />}
                          {btn.text || 'Button'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>

              {/* Template Info */}
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  <strong>Name:</strong> {formData.name || '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  <strong>Language:</strong> {LANGUAGES.find((l) => l.code === formData.language)?.label || formData.language}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  <strong>Category:</strong> {formData.category}
                </Typography>
                {bodyVariables.length > 0 && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    <strong>Variables:</strong> {bodyVariables.length} in body{headerVariables.length > 0 ? `, ${headerVariables.length} in header` : ''}
                  </Typography>
                )}
                {formData.buttons.length > 0 && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    <strong>Buttons:</strong> {formData.buttons.length}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── Snackbar ───────────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default TemplateCreate
