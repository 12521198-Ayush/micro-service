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
import IconButton from '@mui/material/IconButton'
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
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

// API Imports
import {
  getCampaignById,
  getCampaignStats,
  getCampaignMessages,
  executeCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign
} from '@/libs/campaign-service'

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'success'
    case 'running': return 'info'
    case 'scheduled': return 'warning'
    case 'draft': return 'default'
    case 'failed': return 'error'
    case 'paused': return 'secondary'
    case 'cancelled': return 'default'
    case 'sent': return 'success'
    case 'delivered': return 'info'
    case 'read': return 'primary'
    case 'pending': return 'warning'
    default: return 'default'
  }
}

const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 1 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={`${color}.main`}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}.lighter`,
            color: `${color}.main`
          }}
        >
          <i className={icon} style={{ fontSize: '1.5rem' }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
)

const CampaignView = ({ campaignId }) => {
  const { data: session } = useSession()
  const router = useRouter()

  // State
  const [campaign, setCampaign] = useState(null)
  const [stats, setStats] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)

  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalMessages, setTotalMessages] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  // Dialogs
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: '', title: '', message: '' })
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // Fetch campaign details
  const fetchCampaign = useCallback(async () => {
    if (!session?.accessToken || !campaignId) return

    try {
      setLoading(true)
      const [campaignRes, statsRes] = await Promise.all([
        getCampaignById(session.accessToken, campaignId),
        getCampaignStats(session.accessToken, campaignId).catch(() => null)
      ])

      setCampaign(campaignRes.data)
      if (statsRes?.data) setStats(statsRes.data)
    } catch (error) {
      if (error.status === 401) {
        signOut({ callbackUrl: '/login' })
      }
      setSnackbar({ open: true, message: error.message || 'Failed to load campaign', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken, campaignId])

  // Fetch message logs
  const fetchMessages = useCallback(async () => {
    if (!session?.accessToken || !campaignId) return

    try {
      setMessagesLoading(true)
      const res = await getCampaignMessages(session.accessToken, campaignId, {
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined
      })

      setMessages(res.data || [])
      setTotalMessages(res.total || res.count || 0)
    } catch (error) {
      // Messages endpoint may fail if no logs yet — that's ok
      setMessages([])
      setTotalMessages(0)
    } finally {
      setMessagesLoading(false)
    }
  }, [session?.accessToken, campaignId, page, rowsPerPage, statusFilter])

  useEffect(() => {
    if (session?.accessToken) {
      fetchCampaign()
    }
  }, [session?.accessToken, fetchCampaign])

  useEffect(() => {
    if (session?.accessToken && campaign) {
      fetchMessages()
    }
  }, [session?.accessToken, campaign, fetchMessages])

  // Auto-refresh for running campaigns
  useEffect(() => {
    if (campaign?.status === 'running') {
      const interval = setInterval(() => {
        fetchCampaign()
        fetchMessages()
      }, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [campaign?.status, fetchCampaign, fetchMessages])

  // Action handlers
  const handleAction = async () => {
    if (!session?.accessToken) return

    const action = confirmDialog.action
    setConfirmDialog({ ...confirmDialog, open: false })

    try {
      setActionLoading(true)

      switch (action) {
        case 'execute':
          await executeCampaign(session.accessToken, campaignId)
          setSnackbar({ open: true, message: 'Campaign execution started!', severity: 'success' })
          break
        case 'pause':
          await pauseCampaign(session.accessToken, campaignId)
          setSnackbar({ open: true, message: 'Campaign paused', severity: 'info' })
          break
        case 'resume':
          await resumeCampaign(session.accessToken, campaignId)
          setSnackbar({ open: true, message: 'Campaign resumed', severity: 'success' })
          break
        case 'cancel':
          await cancelCampaign(session.accessToken, campaignId)
          setSnackbar({ open: true, message: 'Campaign cancelled', severity: 'warning' })
          break
      }

      // Refresh data
      fetchCampaign()
      fetchMessages()
    } catch (error) {
      if (error.status === 401) {
        signOut({ callbackUrl: '/login' })
      }
      setSnackbar({ open: true, message: error.message || `Failed to ${action} campaign`, severity: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const openConfirm = (action, title, message) => {
    setConfirmDialog({ open: true, action, title, message })
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (!campaign) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="textSecondary">Campaign not found</Typography>
      </Box>
    )
  }

  const sentCount = stats?.sent_count || campaign.sent_count || 0
  const deliveredCount = stats?.delivered_count || campaign.delivered_count || 0
  const readCount = stats?.read_count || campaign.read_count || 0
  const failedCount = stats?.failed_count || campaign.failed_count || 0
  const totalRecipients = stats?.total_recipients || campaign.total_recipients || 0
  const deliveryRate = totalRecipients > 0 ? ((deliveredCount / totalRecipients) * 100).toFixed(1) : 0
  const readRate = totalRecipients > 0 ? ((readCount / totalRecipients) * 100).toFixed(1) : 0

  return (
    <>
      <Grid container spacing={6}>
        {/* Header with actions */}
        <Grid item xs={12}>
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={() => router.push('/campaigns/list')}>
                <i className="ri-arrow-left-line" />
              </IconButton>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {campaign.name}
                </Typography>
                {campaign.description && (
                  <Typography variant="body2" color="textSecondary">
                    {campaign.description}
                  </Typography>
                )}
              </Box>
              <Chip
                label={campaign.status}
                color={getStatusColor(campaign.status)}
                size="small"
              />
            </Box>
            <Box display="flex" gap={1}>
              {['draft', 'scheduled'].includes(campaign.status) && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <i className="ri-send-plane-line" />}
                  onClick={() => openConfirm(
                    'execute',
                    'Start Campaign',
                    `Are you sure you want to start sending "${campaign.name}"? This will begin sending messages to all recipients in the group.`
                  )}
                  disabled={actionLoading}
                >
                  Send Now
                </Button>
              )}
              {campaign.status === 'running' && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<i className="ri-pause-line" />}
                  onClick={() => openConfirm('pause', 'Pause Campaign', 'Pause the campaign? Pending messages will not be sent until resumed.')}
                  disabled={actionLoading}
                >
                  Pause
                </Button>
              )}
              {campaign.status === 'paused' && (
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<i className="ri-play-line" />}
                  onClick={() => openConfirm('resume', 'Resume Campaign', 'Resume sending the remaining messages?')}
                  disabled={actionLoading}
                >
                  Resume
                </Button>
              )}
              {['running', 'paused', 'scheduled'].includes(campaign.status) && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<i className="ri-close-circle-line" />}
                  onClick={() => openConfirm('cancel', 'Cancel Campaign', 'Cancel this campaign? This action cannot be undone.')}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Total Recipients"
            value={totalRecipients}
            icon="ri-group-line"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Sent"
            value={sentCount}
            icon="ri-send-plane-line"
            color="info"
            subtitle={totalRecipients > 0 ? `${((sentCount / totalRecipients) * 100).toFixed(1)}%` : ''}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Delivered"
            value={deliveredCount}
            icon="ri-check-double-line"
            color="success"
            subtitle={`${deliveryRate}% rate`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Read"
            value={readCount}
            icon="ri-eye-line"
            color="primary"
            subtitle={`${readRate}% rate`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Failed"
            value={failedCount}
            icon="ri-error-warning-line"
            color="error"
          />
        </Grid>

        {/* Progress Bar (for running campaigns) */}
        {campaign.status === 'running' && totalRecipients > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" fontWeight={600}>Sending Progress</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {sentCount + failedCount} / {totalRecipients} ({((sentCount + failedCount) / totalRecipients * 100).toFixed(1)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={((sentCount + failedCount) / totalRecipients) * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Campaign Details Sidebar */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Campaign Info" />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">Template</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {campaign.template_name || campaign.template_id || '-'}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">Contact Group</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {campaign.group_name || `Group #${campaign.group_id}` || '-'}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">Scheduled At</Typography>
                <Typography variant="body2">
                  {campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString() : '-'}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">Started At</Typography>
                <Typography variant="body2">
                  {campaign.started_at ? new Date(campaign.started_at).toLocaleString() : '-'}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">Completed At</Typography>
                <Typography variant="body2">
                  {campaign.completed_at ? new Date(campaign.completed_at).toLocaleString() : '-'}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">Created</Typography>
                <Typography variant="body2">
                  {campaign.created_at ? new Date(campaign.created_at).toLocaleString() : '-'}
                </Typography>
              </Box>
              {campaign.status === 'completed' && totalRecipients > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="textSecondary">Delivery Rate</Typography>
                    <Typography variant="h6" color="success.main" fontWeight={700}>{deliveryRate}%</Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="textSecondary">Read Rate</Typography>
                    <Typography variant="h6" color="primary.main" fontWeight={700}>{readRate}%</Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Message Logs Table */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Message Log"
              subheader={`Per-contact delivery status`}
              action={
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="delivered">Delivered</MenuItem>
                    <MenuItem value="read">Read</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              }
            />
            <CardContent>
              {messagesLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : messages.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography color="textSecondary">
                    {campaign.status === 'draft' || campaign.status === 'scheduled'
                      ? 'Message logs will appear here once the campaign starts sending.'
                      : 'No message logs found.'}
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Contact</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>WhatsApp ID</TableCell>
                          <TableCell>Template</TableCell>
                          <TableCell>Sent At</TableCell>
                          <TableCell>Delivered At</TableCell>
                          <TableCell>Read At</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {messages.map((msg) => (
                          <TableRow key={msg.id} hover>
                            <TableCell>
                              <Typography variant="body2">{msg.contact_name || '-'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{msg.phone_number || '-'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={msg.status}
                                size="small"
                                color={getStatusColor(msg.status)}
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip title={msg.message_id || 'N/A'}>
                                <Typography variant="caption" sx={{ maxWidth: 120, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {msg.message_id ? msg.message_id.slice(-12) : '-'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{msg.template_name || '-'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {msg.sent_at ? new Date(msg.sent_at).toLocaleString() : '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {msg.delivered_at ? new Date(msg.delivered_at).toLocaleString() : '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {msg.read_at ? new Date(msg.read_at).toLocaleString() : '-'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={totalMessages}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10))
                      setPage(0)
                    }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Cancel</Button>
          <Button
            variant="contained"
            color={confirmDialog.action === 'cancel' ? 'error' : 'primary'}
            onClick={handleAction}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

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

export default CampaignView
