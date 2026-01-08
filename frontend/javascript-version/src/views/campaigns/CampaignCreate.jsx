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
import { createCampaign } from '@/libs/campaign-service'
import { listTemplates } from '@/libs/template-service'
import { getGroups } from '@/libs/contact-service'

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
  
  // Data state
  const [templates, setTemplates] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // Fetch templates and groups
  const fetchData = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setDataLoading(true)
      const [templatesRes, groupsRes] = await Promise.all([
        listTemplates(session.accessToken, { status: 'approve' }),
        getGroups(session.accessToken)
      ])
      
      setTemplates(templatesRes.data || [])
      setGroups(groupsRes.data || [])
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        signOut({ callbackUrl: '/login' })
      }
      setSnackbar({ open: true, message: 'Failed to load data', severity: 'error' })
    } finally {
      setDataLoading(false)
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (session?.accessToken) {
      fetchData()
    }
  }, [session?.accessToken, fetchData])

  // Handle form changes
  const handleChange = (field) => (event) => {
    const value = event?.target?.value ?? event
    setFormData({ ...formData, [field]: value })
    
    // Update selected template/group for preview
    if (field === 'templateId') {
      setSelectedTemplate(templates.find(t => t.id === value || t.uuid === value))
    }
    if (field === 'groupId') {
      setSelectedGroup(groups.find(g => g.id === parseInt(value)))
    }
  }

  // Submit form
  const handleSubmit = async (saveAsDraft = false) => {
    if (!session?.accessToken) return

    if (!formData.name || !formData.templateId || !formData.groupId) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' })
      return
    }

    if (!saveAsDraft && !formData.scheduledAt) {
      setSnackbar({ open: true, message: 'Please select a schedule time', severity: 'error' })
      return
    }

    try {
      setLoading(true)
      
      const campaignData = {
        name: formData.name,
        description: formData.description,
        templateId: formData.templateId,
        groupId: parseInt(formData.groupId),
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
        status: saveAsDraft ? 'draft' : 'scheduled'
      }

      await createCampaign(session.accessToken, campaignData)
      setSnackbar({ 
        open: true, 
        message: saveAsDraft ? 'Campaign saved as draft' : 'Campaign scheduled successfully', 
        severity: 'success' 
      })
      
      setTimeout(() => {
        router.push('/campaigns/list')
      }, 1500)
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
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
                      onClick={() => handleSubmit(true)}
                      disabled={loading || !formData.name || !formData.templateId || !formData.groupId}
                    >
                      Save as Draft
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => handleSubmit(false)}
                      disabled={loading || !formData.name || !formData.templateId || !formData.groupId || !formData.scheduledAt}
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
