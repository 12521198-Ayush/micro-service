'use client'

// React Imports
import { useState, useEffect, useCallback } from 'react'

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
import Chip from '@mui/material/Chip'

// Date Picker
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'

// API Imports
import { createCampaign, executeCampaign } from '@/libs/campaign-service'
import { listTemplates } from '@/libs/template-service'
import { getGroups } from '@/libs/contact-service'
import embeddedSignupService from '@/services/embeddedSignupService'

const CampaignCreate = () => {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    templateId: '',
    groupId: '',
    scheduledAt: null,
    status: 'draft'
  })

  // Template parameter state
  const [bodyParams, setBodyParams] = useState([])
  const [headerParam, setHeaderParam] = useState({ type: 'none', value: '' })
  
  // Data state
  const [templates, setTemplates] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [wabaAccounts, setWabaAccounts] = useState([])
  const [selectedWabaId, setSelectedWabaId] = useState('')
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState('')
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  const selectedWaba = wabaAccounts.find(acc => acc.wabaId === selectedWabaId)
  const availableNumbers = selectedWaba?.numbers || selectedWaba?.phoneNumbers || []

  const fetchTemplatesForWaba = useCallback(async (wabaId, phoneNumberId, accounts) => {
    if (!session?.accessToken || !wabaId) return

    const allAccounts = accounts || wabaAccounts
    const waba = allAccounts.find(acc => acc.wabaId === wabaId)

    try {
      const response = await listTemplates(session.accessToken, { status: 'APPROVED' }, {
        metaBusinessAccountId: wabaId,
        metaPhoneNumberId: phoneNumberId,
        organizationId: waba?.organizationId || '',
        metaAppId: process.env.NEXT_PUBLIC_META_APP_ID || ''
      })
      setTemplates(response.data || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      if (error?.status === 401) {
        signOut({ callbackUrl: '/login' })
        return
      }
      setSnackbar({ open: true, message: 'Failed to load templates', severity: 'error' })
    }
  }, [session?.accessToken])

  // Fetch templates, groups, and WABA accounts
  const fetchData = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setDataLoading(true)

      // Fetch independently so one failure doesn't block the other
      const [wabaRes, groupsRes] = await Promise.allSettled([
        embeddedSignupService.getWabaAccountsDetails(),
        getGroups(session.accessToken)
      ])

      let nextWabaId = selectedWabaId
      let nextPhoneNumberId = selectedPhoneNumberId

      if (wabaRes.status === 'fulfilled') {
        const accounts = wabaRes.value.data || []
        setWabaAccounts(accounts)

        if (!nextWabaId && accounts.length > 0) {
          nextWabaId = accounts[0].wabaId
          const firstNumber = (accounts[0].numbers || accounts[0].phoneNumbers || [])[0]
          nextPhoneNumberId = firstNumber?.phoneNumberId || ''
          setSelectedWabaId(nextWabaId)
          setSelectedPhoneNumberId(nextPhoneNumberId)
        }
      } else {
        console.error('Failed to fetch WABA accounts:', wabaRes.reason)
        if (wabaRes.reason?.status === 401) {
          signOut({ callbackUrl: '/login' })
          return
        }
        setSnackbar({ open: true, message: 'Failed to load WABA accounts', severity: 'error' })
      }

      if (groupsRes.status === 'fulfilled') {
        setGroups(groupsRes.value.data || [])
      } else {
        console.error('Failed to fetch groups:', groupsRes.reason)
        if (groupsRes.reason?.status === 401) {
          signOut({ callbackUrl: '/login' })
          return
        }
        setSnackbar({ open: true, message: 'Failed to load groups', severity: 'error' })
      }

      if (nextWabaId) {
        const accounts = wabaRes.status === 'fulfilled' ? (wabaRes.value.data || []) : wabaAccounts
        await fetchTemplatesForWaba(nextWabaId, nextPhoneNumberId, accounts)
      }
    } finally {
      setDataLoading(false)
    }
  }, [session?.accessToken, fetchTemplatesForWaba, selectedWabaId, selectedPhoneNumberId])

  useEffect(() => {
    if (session?.accessToken) {
      fetchData()
    }
  }, [session?.accessToken, fetchData])

  useEffect(() => {
    if (selectedWabaId) {
      fetchTemplatesForWaba(selectedWabaId, selectedPhoneNumberId)
      setFormData((prev) => ({ ...prev, templateId: '' }))
      setSelectedTemplate(null)
      setBodyParams([])
      setHeaderParam({ type: 'none', value: '' })
    }
  }, [selectedWabaId, selectedPhoneNumberId, fetchTemplatesForWaba])

  // Handle form changes
  const handleChange = (field) => (event) => {
    const value = event?.target?.value ?? event
    setFormData({ ...formData, [field]: value })
    
    // Update selected template/group for preview
    if (field === 'templateId') {
      const tmpl = templates.find(t => t.id === value || t.uuid === value)
      setSelectedTemplate(tmpl)

      // Parse template body text for variables like {{1}}, {{2}}, etc.
      if (tmpl) {
        const bodyComponent = tmpl.components?.find(c => c.type === 'BODY')
        const bodyText = bodyComponent?.text || ''
        const matches = bodyText.match(/\{\{(\d+)\}\}/g) || []
        const uniqueVars = [...new Set(matches)]
        
        setBodyParams(uniqueVars.map((v, i) => ({
          index: i,
          placeholder: v,
          type: 'static', // 'static' or 'dynamic' (first_name, last_name, etc.)
          value: ''
        })))

        // Check header for media/variable
        const headerComponent = tmpl.components?.find(c => c.type === 'HEADER')
        if (headerComponent) {
          const fmt = headerComponent.format?.toUpperCase()
          if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(fmt)) {
            setHeaderParam({ type: fmt.toLowerCase(), value: '' })
          } else if (fmt === 'TEXT' && headerComponent.text?.includes('{{')) {
            setHeaderParam({ type: 'text', value: '' })
          } else {
            setHeaderParam({ type: 'none', value: '' })
          }
        } else {
          setHeaderParam({ type: 'none', value: '' })
        }
      } else {
        setBodyParams([])
        setHeaderParam({ type: 'none', value: '' })
      }
    }
    if (field === 'groupId') {
      setSelectedGroup(groups.find(g => g.id === parseInt(value)))
    }
  }

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

  // Submit form
  const handleSubmit = async (mode = 'draft') => {
    // mode: 'draft', 'schedule', 'sendNow'
    if (!session?.accessToken) return

    if (!formData.name || !formData.templateId || !formData.groupId) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' })
      return
    }

    if (!selectedWabaId || !selectedPhoneNumberId) {
      setSnackbar({ open: true, message: 'Please select a WABA account and phone number', severity: 'error' })
      return
    }

    if (mode === 'schedule' && !formData.scheduledAt) {
      setSnackbar({ open: true, message: 'Please select a schedule time', severity: 'error' })
      return
    }

    try {
      setLoading(true)

      // Build metadata with template parameters
      const metadata = {
        wabaId: selectedWabaId,
        phoneNumberId: selectedPhoneNumberId,
        bodyParameters: {},
        headerParam: headerParam.type !== 'none' ? headerParam : undefined,
        components: []
      }

      // Build body components
      if (bodyParams.length > 0) {
        const bodyComponent = {
          type: 'body',
          parameters: bodyParams.map(p => ({
            type: 'text',
            text: p.type === 'static' ? p.value : `{{${p.type}}}`
          }))
        }
        metadata.components.push(bodyComponent)
        
        // Map dynamic params for variable replacement
        bodyParams.forEach(p => {
          if (p.type !== 'static') {
            metadata.bodyParameters[p.placeholder] = p.type
          }
        })
      }

      // Build header component
      if (headerParam.type === 'text' && headerParam.value) {
        metadata.components.push({
          type: 'header',
          parameters: [{ type: 'text', text: headerParam.value }]
        })
      } else if (['image', 'video', 'document'].includes(headerParam.type) && headerParam.value) {
        metadata.components.push({
          type: 'header',
          parameters: [{
            type: headerParam.type,
            [headerParam.type]: { link: headerParam.value }
          }]
        })
      }

      const campaignData = {
        name: formData.name,
        description: formData.description,
        templateId: formData.templateId,
        groupId: parseInt(formData.groupId),
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
        status: mode === 'schedule' ? 'scheduled' : 'draft',
        metadata: metadata
      }

      const createRes = await createCampaign(session.accessToken, campaignData)

      if (mode === 'sendNow' && createRes.data?.id) {
        // Immediately execute
        try {
          await executeCampaign(session.accessToken, createRes.data.id)
          setSnackbar({ open: true, message: 'Campaign created and sending started!', severity: 'success' })
        } catch (execError) {
          setSnackbar({ open: true, message: `Campaign created but execution failed: ${execError.message}`, severity: 'warning' })
        }
      } else {
        setSnackbar({ 
          open: true, 
          message: mode === 'draft' ? 'Campaign saved as draft' : 'Campaign scheduled successfully', 
          severity: 'success' 
        })
      }
      
      setTimeout(() => {
        if (mode === 'sendNow' && createRes.data?.id) {
          router.push(`/campaigns/${createRes.data.id}`)
        } else {
          router.push('/campaigns/list')
        }
      }, 1500)
    } catch (error) {
      if (error.status === 401) {
        signOut({ callbackUrl: '/login' })
      }
      setSnackbar({ open: true, message: error.message || 'Failed to create campaign', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Grid container spacing={6}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Create Campaign" />
            <CardContent>
              <Grid container spacing={3}>
                {/* Basic Info */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Campaign Details
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Campaign Name"
                    value={formData.name}
                    onChange={handleChange('name')}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={formData.description}
                    onChange={handleChange('description')}
                    multiline
                    rows={2}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                {/* Sending Account */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Sending Account
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Select WABA Account</InputLabel>
                    <Select
                      value={selectedWabaId}
                      label="Select WABA Account"
                      onChange={handleWabaChange}
                    >
                      {wabaAccounts.length === 0 ? (
                        <MenuItem disabled>No WABA accounts found</MenuItem>
                      ) : (
                        wabaAccounts.map((account) => (
                          <MenuItem key={account.wabaId} value={account.wabaId}>
                            {account.businessName || account.wabaId}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required disabled={!selectedWabaId || availableNumbers.length === 0}>
                    <InputLabel>Select Phone Number</InputLabel>
                    <Select
                      value={selectedPhoneNumberId}
                      label="Select Phone Number"
                      onChange={handlePhoneNumberChange}
                    >
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
                  </FormControl>
                </Grid>

                {/* Template Selection */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Message Template
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Select Template</InputLabel>
                    <Select
                      value={formData.templateId}
                      label="Select Template"
                      onChange={handleChange('templateId')}
                    >
                      {templates.length === 0 ? (
                        <MenuItem disabled>No approved templates found</MenuItem>
                      ) : (
                        templates.map((template) => (
                          <MenuItem key={template.id} value={template.uuid || template.id}>
                            {template.name} - {template.category}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                {/* Recipient Group */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Recipients
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Select Contact Group</InputLabel>
                    <Select
                      value={formData.groupId}
                      label="Select Contact Group"
                      onChange={handleChange('groupId')}
                    >
                      {groups.length === 0 ? (
                        <MenuItem disabled>No groups found</MenuItem>
                      ) : (
                        groups.map((group) => (
                          <MenuItem key={group.id} value={group.id}>
                            {group.name} ({group.contact_count || 0} contacts)
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                {/* Template Parameters */}
                {selectedTemplate && (headerParam.type !== 'none' || bodyParams.length > 0) && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                        Template Parameters
                      </Typography>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Fill in the template variables. Use &quot;Dynamic&quot; to auto-fill from contact data (first name, last name, etc.) or enter a static value.
                      </Alert>
                    </Grid>

                    {/* Header parameter */}
                    {headerParam.type !== 'none' && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                          Header {headerParam.type === 'text' ? 'Variable' : `(${headerParam.type})`}
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          label={headerParam.type === 'text' ? 'Header text value' : `${headerParam.type} URL`}
                          value={headerParam.value}
                          onChange={(e) => setHeaderParam({ ...headerParam, value: e.target.value })}
                          placeholder={headerParam.type === 'text' ? 'Enter header text' : `https://example.com/media.${headerParam.type === 'image' ? 'jpg' : headerParam.type === 'video' ? 'mp4' : 'pdf'}`}
                        />
                      </Grid>
                    )}

                    {/* Body parameters */}
                    {bodyParams.map((param, index) => (
                      <Grid item xs={12} key={index}>
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                          Variable {param.placeholder}
                        </Typography>
                        <Box display="flex" gap={2}>
                          <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Type</InputLabel>
                            <Select
                              value={param.type}
                              label="Type"
                              onChange={(e) => {
                                const updated = [...bodyParams]
                                updated[index] = { ...param, type: e.target.value, value: e.target.value === 'static' ? '' : e.target.value }
                                setBodyParams(updated)
                              }}
                            >
                              <MenuItem value="static">Static Text</MenuItem>
                              <MenuItem value="first_name">First Name</MenuItem>
                              <MenuItem value="last_name">Last Name</MenuItem>
                              <MenuItem value="name">Full Name</MenuItem>
                              <MenuItem value="phone">Phone</MenuItem>
                              <MenuItem value="email">Email</MenuItem>
                            </Select>
                          </FormControl>
                          {param.type === 'static' && (
                            <TextField
                              fullWidth
                              size="small"
                              label={`Value for ${param.placeholder}`}
                              value={param.value}
                              onChange={(e) => {
                                const updated = [...bodyParams]
                                updated[index] = { ...param, value: e.target.value }
                                setBodyParams(updated)
                              }}
                            />
                          )}
                          {param.type !== 'static' && (
                            <TextField
                              fullWidth
                              size="small"
                              value={`Will use contact's ${param.type.replace('_', ' ')}`}
                              disabled
                            />
                          )}
                        </Box>
                      </Grid>
                    ))}

                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                    </Grid>
                  </>
                )}

                {/* Schedule */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Schedule
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Schedule Date & Time"
                    value={formData.scheduledAt}
                    onChange={(newValue) => setFormData({ ...formData, scheduledAt: newValue })}
                    minDateTime={new Date()}
                    slotProps={{
                      textField: {
                        fullWidth: true
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                    <Button variant="outlined" onClick={() => router.back()}>
                      Cancel
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handleSubmit('draft')}
                      disabled={loading || !formData.name || !formData.templateId || !formData.groupId || !selectedWabaId || !selectedPhoneNumberId}
                    >
                      Save as Draft
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleSubmit('sendNow')}
                      disabled={loading || !formData.name || !formData.templateId || !formData.groupId || !selectedWabaId || !selectedPhoneNumberId}
                      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <i className="ri-send-plane-line" />}
                    >
                      Send Now
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => handleSubmit('schedule')}
                      disabled={loading || !formData.name || !formData.templateId || !formData.groupId || !formData.scheduledAt || !selectedWabaId || !selectedPhoneNumberId}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Schedule Campaign'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardHeader title="Campaign Summary" />
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="textSecondary">
                  Campaign Name
                </Typography>
                <Typography variant="body1">
                  {formData.name || '-'}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="textSecondary">
                  Template
                </Typography>
                <Typography variant="body1">
                  {selectedTemplate?.name || '-'}
                </Typography>
                {selectedTemplate && (
                  <Chip
                    label={selectedTemplate.category}
                    size="small"
                    color="primary"
                    sx={{ mt: 0.5 }}
                  />
                )}
                {selectedTemplate?.components?.find(c => c.type === 'BODY')?.text && (
                  <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, fontSize: '0.85rem' }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>Preview:</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedTemplate.components.find(c => c.type === 'BODY').text}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="textSecondary">
                  Recipients
                </Typography>
                <Typography variant="body1">
                  {selectedGroup ? (
                    <>
                      {selectedGroup.name}
                      <Chip
                        label={`${selectedGroup.contact_count || 0} contacts`}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </>
                  ) : (
                    '-'
                  )}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="textSecondary">
                  Scheduled For
                </Typography>
                <Typography variant="body1">
                  {formData.scheduledAt
                    ? new Date(formData.scheduledAt).toLocaleString()
                    : '-'}
                </Typography>
              </Box>

              {selectedGroup && selectedGroup.contact_count > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This campaign will send messages to {selectedGroup.contact_count} contacts.
                </Alert>
              )}
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
    </LocalizationProvider>
  )
}

export default CampaignCreate
