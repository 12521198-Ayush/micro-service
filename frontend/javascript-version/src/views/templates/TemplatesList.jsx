'use client'

// React Imports
import { useState, useEffect, useCallback } from 'react'

// Next Imports
import { useSession, signOut } from 'next-auth/react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'

// API Imports
import { listTemplates, syncTemplates } from '@/libs/template-service'

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'approve':
    case 'approved':
      return 'success'
    case 'pending':
      return 'warning'
    case 'rejected':
      return 'error'
    default:
      return 'default'
  }
}

const getCategoryColor = (category) => {
  switch (category?.toUpperCase()) {
    case 'MARKETING':
      return 'primary'
    case 'UTILITY':
      return 'info'
    case 'AUTHENTICATION':
      return 'secondary'
    default:
      return 'default'
  }
}

const TemplatesList = () => {
  const { data: session, status } = useSession()
  
  // State
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // Preview dialog state
  const [previewDialog, setPreviewDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  
  // Notification state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setLoading(true)
      const filters = {}
      if (search) filters.name = search
      if (statusFilter) filters.status = statusFilter
      
      const response = await listTemplates(session.accessToken, filters)
      setTemplates(response.data || [])
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        signOut({ callbackUrl: '/login' })
      }
      setSnackbar({ open: true, message: error.message || 'Failed to fetch templates', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken, search, statusFilter])

  useEffect(() => {
    if (session?.accessToken) {
      fetchTemplates()
    }
  }, [session?.accessToken, fetchTemplates])

  // Sync templates from Meta
  const handleSyncTemplates = async () => {
    if (!session?.accessToken) return

    try {
      setSyncing(true)
      await syncTemplates(session.accessToken)
      setSnackbar({ open: true, message: 'Templates synced successfully', severity: 'success' })
      fetchTemplates()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to sync templates', severity: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  // Open preview dialog
  const handlePreview = (template) => {
    setSelectedTemplate(template)
    setPreviewDialog(true)
  }

  // Render template components preview
  const renderTemplatePreview = (template) => {
    if (!template?.components) return null

    return (
      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
        {template.components.map((component, index) => {
          switch (component.type) {
            case 'HEADER':
              return (
                <Typography key={index} variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                  {component.text || `[${component.format} Header]`}
                </Typography>
              )
            case 'BODY':
              return (
                <Typography key={index} variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                  {component.text}
                </Typography>
              )
            case 'FOOTER':
              return (
                <Typography key={index} variant="caption" color="textSecondary">
                  {component.text}
                </Typography>
              )
            case 'BUTTONS':
              return (
                <Box key={index} sx={{ mt: 2 }}>
                  {component.buttons?.map((button, btnIndex) => (
                    <Chip
                      key={btnIndex}
                      label={button.text}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )
            default:
              return null
          }
        })}
      </Box>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Message Templates"
              subheader="Manage your WhatsApp message templates"
              action={
                <Box display="flex" gap={2}>
                  <Button
                    variant="outlined"
                    onClick={handleSyncTemplates}
                    disabled={syncing}
                    startIcon={syncing ? <CircularProgress size={20} /> : <i className="ri-refresh-line" />}
                  >
                    {syncing ? 'Syncing...' : 'Sync from Meta'}
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    href="/message-template/create"
                    startIcon={<i className="ri-add-line" />}
                  >
                    Create Template
                  </Button>
                </Box>
              }
            />
            <CardContent>
              {/* Filters */}
              <Box display="flex" gap={2} mb={4} flexWrap="wrap">
                <TextField
                  size="small"
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <i className="ri-search-line" />
                      </InputAdornment>
                    )
                  }}
                  sx={{ minWidth: 250 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="approve">Approved</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Table */}
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Template Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Language</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created At</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="textSecondary">No templates found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map((template) => (
                        <TableRow key={template.id} hover>
                          <TableCell>
                            <Typography fontWeight={500}>{template.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={template.category || 'N/A'}
                              size="small"
                              color={getCategoryColor(template.category)}
                            />
                          </TableCell>
                          <TableCell>{template.language || 'en'}</TableCell>
                          <TableCell>
                            <Chip
                              label={template.status || 'Unknown'}
                              size="small"
                              color={getStatusColor(template.status)}
                            />
                          </TableCell>
                          <TableCell>
                            {template.created_at
                              ? new Date(template.created_at).toLocaleDateString()
                              : '-'}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Preview">
                              <IconButton size="small" onClick={() => handlePreview(template)}>
                                <i className="ri-eye-line" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                href={`/message-template/edit/${template.id}`}
                              >
                                <i className="ri-edit-line" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selectedTemplate?.name}</Typography>
            <Box display="flex" gap={1}>
              <Chip
                label={selectedTemplate?.category}
                size="small"
                color={getCategoryColor(selectedTemplate?.category)}
              />
              <Chip
                label={selectedTemplate?.status}
                size="small"
                color={getStatusColor(selectedTemplate?.status)}
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2 }}>
            Language: {selectedTemplate?.language || 'en'}
          </Typography>
          {renderTemplatePreview(selectedTemplate)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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

export default TemplatesList
