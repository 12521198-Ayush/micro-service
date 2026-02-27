'use client'

// React Imports
import { useState, useEffect, useCallback, useRef } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'
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
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Skeleton from '@mui/material/Skeleton'
import Paper from '@mui/material/Paper'
import FormHelperText from '@mui/material/FormHelperText'

// API Imports
import {
  listTemplates,
  syncTemplates,
  deleteTemplate,
  publishTemplate
} from '@/libs/template-service'
import embeddedSignupService from '@/services/embeddedSignupService'

// ─── Status / Category Helpers ───────────────────────────────────────────────

const STATUS_CONFIG = {
  APPROVED: { color: 'success', label: 'Approved', icon: 'ri-check-line' },
  PENDING: { color: 'warning', label: 'Pending', icon: 'ri-time-line' },
  REJECTED: { color: 'error', label: 'Rejected', icon: 'ri-close-line' },
  PAUSED: { color: 'default', label: 'Paused', icon: 'ri-pause-line' },
  DISABLED: { color: 'default', label: 'Disabled', icon: 'ri-forbid-line' },
  IN_APPEAL: { color: 'info', label: 'In Appeal', icon: 'ri-error-warning-line' },
  DELETED: { color: 'error', label: 'Deleted', icon: 'ri-delete-bin-line' }
}

const CATEGORY_CONFIG = {
  MARKETING: { color: 'primary', label: 'Marketing' },
  UTILITY: { color: 'info', label: 'Utility' },
  AUTHENTICATION: { color: 'secondary', label: 'Authentication' }
}

const TYPE_CONFIG = {
  STANDARD: { label: 'Standard' },
  CAROUSEL: { label: 'Carousel' },
  FLOW: { label: 'Flow' },
  AUTHENTICATION: { label: 'Auth' }
}

const getStatusConfig = (status) => {
  const key = String(status || '').toUpperCase()
  return STATUS_CONFIG[key] || { color: 'default', label: status || 'Unknown', icon: 'ri-question-line' }
}

const getCategoryConfig = (category) => {
  const key = String(category || '').toUpperCase()
  return CATEGORY_CONFIG[key] || { color: 'default', label: category || 'N/A' }
}

const getTypeLabel = (type) => {
  const key = String(type || '').toUpperCase()
  return TYPE_CONFIG[key]?.label || type || '—'
}

// ─── Debounce Hook ───────────────────────────────────────────────────────────

const useDebounce = (value, delay = 400) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// ─── Component ───────────────────────────────────────────────────────────────

const TemplatesList = () => {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  // Data state
  const [templates, setTemplates] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [publishingId, setPublishingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [wabaAccounts, setWabaAccounts] = useState([])
  const [selectedWabaId, setSelectedWabaId] = useState('')
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState('')
  const [wabaLoading, setWabaLoading] = useState(true)

  // Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Pagination state
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)

  // Dialogs
  const [previewDialog, setPreviewDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [syncResultDialog, setSyncResultDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [syncResult, setSyncResult] = useState(null)

  // Notification
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  const debouncedSearch = useDebounce(search)
  const abortRef = useRef(null)

  const selectedWaba = wabaAccounts.find(acc => acc.wabaId === selectedWabaId)
  const availableNumbers = selectedWaba?.numbers || selectedWaba?.phoneNumbers || []

  const tenantContext = {
    metaBusinessAccountId: selectedWabaId,
    metaPhoneNumberId: selectedPhoneNumberId,
    organizationId: selectedWaba?.organizationId || '',
    metaAppId: process.env.NEXT_PUBLIC_META_APP_ID || ''
  }

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

  // ─── Fetch WABA Accounts ───────────────────────────────────────────────────

  const fetchWabaAccounts = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setWabaLoading(true)
      const response = await embeddedSignupService.getWabaAccountsDetails()
      const accounts = response.data || []
      setWabaAccounts(accounts)

      if (!selectedWabaId && accounts.length > 0) {
        const firstAccount = accounts[0]
        setSelectedWabaId(firstAccount.wabaId)
        const firstNumber = (firstAccount.numbers || firstAccount.phoneNumbers || [])[0]
        setSelectedPhoneNumberId(firstNumber?.phoneNumberId || '')
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        showSnackbar(error.message || 'Failed to fetch WABA accounts', 'error')
      }
    } finally {
      setWabaLoading(false)
    }
  }, [session?.accessToken, selectedWabaId])

  // ─── Fetch Templates ────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    if (!session?.accessToken || !selectedWabaId) return

    try {
      setLoading(true)

      const filters = {
        limit: rowsPerPage,
        offset: page * rowsPerPage
      }

      if (debouncedSearch) filters.search = debouncedSearch
      if (statusFilter) filters.status = statusFilter
      if (categoryFilter) filters.category = categoryFilter

      const response = await listTemplates(session.accessToken, filters, tenantContext)

      setTemplates(response.data || [])
      setTotalCount(response.pagination?.total || response.count || 0)
    } catch (error) {
      if (!handleAuthError(error)) {
        showSnackbar(error.message || 'Failed to fetch templates', 'error')
      }
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken, debouncedSearch, statusFilter, categoryFilter, page, rowsPerPage, selectedWabaId, selectedPhoneNumberId])

  useEffect(() => {
    if (session?.accessToken) {
      fetchWabaAccounts()
    }
  }, [fetchWabaAccounts, session?.accessToken])

  useEffect(() => {
    if (session?.accessToken && selectedWabaId) {
      fetchTemplates()
    }
  }, [fetchTemplates, session?.accessToken, selectedWabaId])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, statusFilter, categoryFilter])

  // ─── Sync Templates ────────────────────────────────────────────────────────

  const handleSyncTemplates = async () => {
    if (!session?.accessToken || syncing || !selectedWabaId) return

    try {
      setSyncing(true)
      const response = await syncTemplates(session.accessToken, tenantContext)
      const result = response.data || response

      setSyncResult(result)
      setSyncResultDialog(true)
      fetchTemplates()
    } catch (error) {
      if (!handleAuthError(error)) {
        showSnackbar(error.message || 'Failed to sync templates', 'error')
      }
    } finally {
      setSyncing(false)
    }
  }

  // ─── Publish / Refresh Template ─────────────────────────────────────────────

  const handlePublishTemplate = async (template) => {
    if (!session?.accessToken || publishingId) return

    try {
      setPublishingId(template.uuid)
      await publishTemplate(session.accessToken, template.uuid, tenantContext)
      showSnackbar(`Template "${template.name}" status refreshed from Meta`)
      fetchTemplates()
    } catch (error) {
      if (!handleAuthError(error)) {
        showSnackbar(error.message || 'Failed to refresh template status', 'error')
      }
    } finally {
      setPublishingId(null)
    }
  }

  // ─── Delete Template ────────────────────────────────────────────────────────

  const handleDeleteConfirm = (template) => {
    setSelectedTemplate(template)
    setDeleteDialog(true)
  }

  const handleDeleteTemplate = async () => {
    if (!session?.accessToken || !selectedTemplate) return

    try {
      setDeletingId(selectedTemplate.uuid)
      await deleteTemplate(session.accessToken, selectedTemplate.uuid, tenantContext)
      showSnackbar(`Template "${selectedTemplate.name}" deleted successfully`)
      setDeleteDialog(false)
      setSelectedTemplate(null)
      fetchTemplates()
    } catch (error) {
      if (!handleAuthError(error)) {
        showSnackbar(error.message || 'Failed to delete template', 'error')
      }
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Preview Dialog ─────────────────────────────────────────────────────────

  const handlePreview = (template) => {
    setSelectedTemplate(template)
    setPreviewDialog(true)
  }

  const renderComponentPreview = (components) => {
    if (!Array.isArray(components) || components.length === 0) {
      return <Typography color="text.secondary">No components</Typography>
    }

    return components.map((component, index) => {
      switch (component.type) {
        case 'HEADER':
          if (component.format === 'TEXT') {
            return (
              <Typography key={index} variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                {component.text || '[Text Header]'}
              </Typography>
            )
          }
          return (
            <Box key={index} sx={{ height: 80, bgcolor: 'action.hover', borderRadius: 1, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                [{component.format || 'MEDIA'} Header]
              </Typography>
            </Box>
          )

        case 'BODY':
          return (
            <Typography key={index} variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {component.text || '[Body text]'}
            </Typography>
          )

        case 'FOOTER':
          return (
            <Typography key={index} variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {component.text}
            </Typography>
          )

        case 'BUTTONS':
          return (
            <Box key={index} sx={{ mt: 1, borderTop: 1, borderColor: 'divider', pt: 1 }}>
              {component.buttons?.map((btn, bi) => (
                <Chip key={bi} label={btn.text || btn.type} size="small" sx={{ mr: 0.5, mb: 0.5 }} color="primary" variant="outlined" />
              ))}
            </Box>
          )

        case 'CAROUSEL':
          return (
            <Box key={index} sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Carousel ({component.cards?.length || 0} cards)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                {component.cards?.map((card, ci) => (
                  <Paper key={ci} variant="outlined" sx={{ minWidth: 150, p: 1, flexShrink: 0 }}>
                    <Typography variant="caption" fontWeight="bold">Card {ci + 1}</Typography>
                    {card.components && renderComponentPreview(card.components)}
                  </Paper>
                ))}
              </Box>
            </Box>
          )

        default:
          return (
            <Typography key={index} variant="caption" color="text.secondary">
              [{component.type}]
            </Typography>
          )
      }
    })
  }

  // ─── Pagination Handlers ────────────────────────────────────────────────────

  const handleChangePage = (event, newPage) => setPage(newPage)

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  // ─── Clear Filters ─────────────────────────────────────────────────────────

  const handleClearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setCategoryFilter('')
    setPage(0)
  }

  const handleWabaChange = (event) => {
    const nextWabaId = event.target.value
    setSelectedWabaId(nextWabaId)

    const account = wabaAccounts.find(acc => acc.wabaId === nextWabaId)
    const firstNumber = (account?.numbers || account?.phoneNumbers || [])[0]
    setSelectedPhoneNumberId(firstNumber?.phoneNumberId || '')
    setPage(0)
  }

  const handlePhoneNumberChange = (event) => {
    setSelectedPhoneNumberId(event.target.value)
    setPage(0)
  }

  const hasActiveFilters = search || statusFilter || categoryFilter

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (authStatus === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Message Templates"
              subheader={`Manage your WhatsApp message templates${totalCount > 0 ? ` (${totalCount} total)` : ''}`}
              action={
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    onClick={handleSyncTemplates}
                    disabled={syncing}
                    startIcon={syncing ? <CircularProgress size={18} /> : <i className="ri-refresh-line" />}
                    size="small"
                  >
                    {syncing ? 'Syncing...' : 'Sync from Meta'}
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    href="/message-template/create"
                    startIcon={<i className="ri-add-line" />}
                    size="small"
                  >
                    Create Template
                  </Button>
                </Box>
              }
            />

            {loading && <LinearProgress />}

            <CardContent>
              {/* Filters */}
              <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
                <FormControl size="small" sx={{ minWidth: 240 }} disabled={wabaLoading || wabaAccounts.length === 0}>
                  <InputLabel>WABA Account</InputLabel>
                  <Select value={selectedWabaId} label="WABA Account" onChange={handleWabaChange}>
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
                  {!wabaLoading && wabaAccounts.length === 0 && (
                    <FormHelperText>Connect a WABA account to view templates</FormHelperText>
                  )}
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 240 }} disabled={!selectedWabaId || availableNumbers.length === 0}>
                  <InputLabel>Phone Number</InputLabel>
                  <Select value={selectedPhoneNumberId} label="Phone Number" onChange={handlePhoneNumberChange}>
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

                <TextField
                  size="small"
                  placeholder="Search by name..."
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
                  <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="APPROVED">Approved</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                    <MenuItem value="PAUSED">Paused</MenuItem>
                    <MenuItem value="DISABLED">Disabled</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Category</InputLabel>
                  <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
                    <MenuItem value="">All Categories</MenuItem>
                    <MenuItem value="MARKETING">Marketing</MenuItem>
                    <MenuItem value="UTILITY">Utility</MenuItem>
                    <MenuItem value="AUTHENTICATION">Authentication</MenuItem>
                  </Select>
                </FormControl>
                {hasActiveFilters && (
                  <Button size="small" onClick={handleClearFilters} startIcon={<i className="ri-filter-off-line" />}>
                    Clear
                  </Button>
                )}
              </Box>

              {/* Table */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Template Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Language</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Quality</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && templates.length === 0 ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(8)].map((_, j) => (
                            <TableCell key={j}><Skeleton variant="text" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                          <Box>
                            <i className="ri-file-list-3-line" style={{ fontSize: 48, color: 'var(--mui-palette-text-secondary)' }} />
                            <Typography color="text.secondary" sx={{ mt: 1 }}>
                              {hasActiveFilters ? 'No templates match your filters' : 'No templates found'}
                            </Typography>
                            {!hasActiveFilters && (
                              <Box display="flex" gap={1} justifyContent="center" mt={2}>
                                <Button size="small" variant="outlined" onClick={handleSyncTemplates} disabled={syncing}>
                                  Sync from Meta
                                </Button>
                                <Button size="small" variant="contained" href="/message-template/create">
                                  Create Template
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map((template) => {
                        const statusCfg = getStatusConfig(template.status)
                        const categoryCfg = getCategoryConfig(template.category)
                        const isPublishing = publishingId === template.uuid
                        const isDeleting = deletingId === template.uuid

                        return (
                          <TableRow key={template.uuid || template.id} hover sx={{ opacity: isDeleting ? 0.5 : 1 }}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 220 }}>
                                {template.name}
                              </Typography>
                              {template.metaTemplateId && (
                                <Typography variant="caption" color="text.secondary" noWrap display="block">
                                  Meta ID: {template.metaTemplateId}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip label={categoryCfg.label} size="small" color={categoryCfg.color} variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{getTypeLabel(template.templateType)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{template.language || 'en'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={statusCfg.label} size="small" color={statusCfg.color} icon={<i className={statusCfg.icon} />} />
                            </TableCell>
                            <TableCell>
                              {template.qualityScore ? (
                                <Chip
                                  label={typeof template.qualityScore === 'object' ? template.qualityScore.score || '—' : template.qualityScore}
                                  size="small"
                                  color={
                                    String(template.qualityScore?.score || template.qualityScore).toUpperCase() === 'GREEN' ? 'success' :
                                    String(template.qualityScore?.score || template.qualityScore).toUpperCase() === 'YELLOW' ? 'warning' :
                                    String(template.qualityScore?.score || template.qualityScore).toUpperCase() === 'RED' ? 'error' : 'default'
                                  }
                                  variant="outlined"
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">—</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Box display="flex" justifyContent="flex-end" gap={0.5}>
                                <Tooltip title="Preview">
                                  <IconButton size="small" onClick={() => handlePreview(template)}>
                                    <i className="ri-eye-line" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Refresh status from Meta">
                                  <span>
                                    <IconButton size="small" onClick={() => handlePublishTemplate(template)} disabled={isPublishing || !!publishingId}>
                                      {isPublishing ? <CircularProgress size={16} /> : <i className="ri-loop-left-line" />}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <span>
                                    <IconButton size="small" color="error" onClick={() => handleDeleteConfirm(template)} disabled={isDeleting || !!deletingId}>
                                      <i className="ri-delete-bin-line" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {totalCount > 0 && (
                <TablePagination
                  component="div"
                  count={totalCount}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 20, 50, 100]}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── Preview Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
            <Box>
              <Typography variant="h6">{selectedTemplate?.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedTemplate?.language || 'en'} • {getTypeLabel(selectedTemplate?.templateType)}
                {selectedTemplate?.metaTemplateId && ` • Meta ID: ${selectedTemplate.metaTemplateId}`}
              </Typography>
            </Box>
            <Box display="flex" gap={1} flexShrink={0}>
              <Chip label={getCategoryConfig(selectedTemplate?.category).label} size="small" color={getCategoryConfig(selectedTemplate?.category).color} variant="outlined" />
              <Chip label={getStatusConfig(selectedTemplate?.status).label} size="small" color={getStatusConfig(selectedTemplate?.status).color} />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTemplate?.rejectionReason && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={500}>Rejection Reason</Typography>
              <Typography variant="body2">{selectedTemplate.rejectionReason}</Typography>
            </Alert>
          )}
          <Paper sx={{ p: 2, bgcolor: '#dcf8c6', borderRadius: 2, maxWidth: 340 }}>
            {renderComponentPreview(selectedTemplate?.components || [])}
          </Paper>
          {selectedTemplate?.lastSyncedAt && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Last synced: {new Date(selectedTemplate.lastSyncedAt).toLocaleString()}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─────────────────────────────────────── */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{selectedTemplate?.name}</strong>? This will also remove it from Meta's platform. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)} disabled={!!deletingId}>Cancel</Button>
          <Button onClick={handleDeleteTemplate} color="error" variant="contained" disabled={!!deletingId}>
            {deletingId ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Sync Result Dialog ─────────────────────────────────────────────── */}
      <Dialog open={syncResultDialog} onClose={() => setSyncResultDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Sync Completed</DialogTitle>
        <DialogContent>
          {syncResult && (
            <Box>
              <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
                <Chip label={`Fetched: ${syncResult.fetched || 0}`} color="default" />
                <Chip label={`Created: ${syncResult.created || 0}`} color="success" variant="outlined" />
                <Chip label={`Updated: ${syncResult.updated || 0}`} color="info" variant="outlined" />
                {(syncResult.failed || 0) > 0 && (
                  <Chip label={`Failed: ${syncResult.failed}`} color="error" variant="outlined" />
                )}
              </Box>
              {syncResult.errors?.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>Errors:</Typography>
                  {syncResult.errors.slice(0, 5).map((err, i) => (
                    <Typography key={i} variant="caption" display="block">
                      • {err.name || err.metaTemplateId}: {err.message}
                    </Typography>
                  ))}
                  {syncResult.errors.length > 5 && (
                    <Typography variant="caption">...and {syncResult.errors.length - 5} more</Typography>
                  )}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncResultDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Snackbar ───────────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default TemplatesList
