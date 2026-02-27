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
import TablePagination from '@mui/material/TablePagination'
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
import LinearProgress from '@mui/material/LinearProgress'

// API Imports
import { getCampaigns, deleteCampaign } from '@/libs/campaign-service'

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'success'
    case 'running':
      return 'info'
    case 'scheduled':
      return 'warning'
    case 'draft':
      return 'default'
    case 'failed':
      return 'error'
    case 'paused':
      return 'secondary'
    default:
      return 'default'
  }
}

const CampaignsList = () => {
  const { data: session, status } = useSession()
  
  // State
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalCampaigns, setTotalCampaigns] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  
  // Dialog states
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  
  // Notification state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [formLoading, setFormLoading] = useState(false)

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setLoading(true)
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined
      }
      
      const response = await getCampaigns(session.accessToken, params)
      setCampaigns(response.data || [])
      setTotalCampaigns(response.total || response.count || 0)
    } catch (error) {
      if (error.status === 401) {
        signOut({ callbackUrl: '/login' })
      }
      setSnackbar({ open: true, message: error.message || 'Failed to fetch campaigns', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken, page, rowsPerPage, statusFilter])

  useEffect(() => {
    if (session?.accessToken) {
      fetchCampaigns()
    }
  }, [session?.accessToken, fetchCampaigns])

  // Delete campaign
  const handleDeleteCampaign = async () => {
    if (!session?.accessToken || !selectedCampaign) return

    try {
      setFormLoading(true)
      await deleteCampaign(session.accessToken, selectedCampaign.id)
      setSnackbar({ open: true, message: 'Campaign deleted successfully', severity: 'success' })
      setOpenDeleteDialog(false)
      fetchCampaigns()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete campaign', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
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
              title="Campaigns"
              subheader="Manage your WhatsApp marketing campaigns"
              action={
                <Button
                  variant="contained"
                  color="primary"
                  href="/campaigns/create"
                  startIcon={<i className="ri-add-line" />}
                >
                  Create Campaign
                </Button>
              }
            />
            <CardContent>
              {/* Filters */}
              <Box display="flex" gap={2} mb={4} flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="scheduled">Scheduled</MenuItem>
                    <MenuItem value="running">Running</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                    <MenuItem value="paused">Paused</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Table */}
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Campaign Name</TableCell>
                      <TableCell>Template</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell>Scheduled At</TableCell>
                      <TableCell>Created At</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {campaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="textSecondary">No campaigns found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      campaigns.map((campaign) => (
                        <TableRow key={campaign.id} hover>
                          <TableCell>
                            <Typography fontWeight={500}>{campaign.name}</Typography>
                            {campaign.description && (
                              <Typography variant="caption" color="textSecondary">
                                {campaign.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{campaign.template_name || campaign.templateId || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={campaign.status || 'Draft'}
                              size="small"
                              color={getStatusColor(campaign.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ minWidth: 100 }}>
                              <Box display="flex" justifyContent="space-between" mb={0.5}>
                                <Typography variant="caption">
                                  {campaign.sent_count || 0}/{campaign.total_recipients || 0}
                                </Typography>
                                <Typography variant="caption">
                                  {campaign.total_recipients > 0
                                    ? Math.round((campaign.sent_count / campaign.total_recipients) * 100)
                                    : 0}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={
                                  campaign.total_recipients > 0
                                    ? (campaign.sent_count / campaign.total_recipients) * 100
                                    : 0
                                }
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            {campaign.scheduled_at
                              ? new Date(campaign.scheduled_at).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {campaign.created_at
                              ? new Date(campaign.created_at).toLocaleDateString()
                              : '-'}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View">
                              <IconButton size="small" href={`/campaigns/${campaign.id}`}>
                                <i className="ri-eye-line" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                href={`/campaigns/edit/${campaign.id}`}
                                disabled={campaign.status === 'running' || campaign.status === 'completed'}
                              >
                                <i className="ri-edit-line" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedCampaign(campaign)
                                  setOpenDeleteDialog(true)
                                }}
                                disabled={campaign.status === 'running'}
                              >
                                <i className="ri-delete-bin-line" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={totalCampaigns}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10))
                  setPage(0)
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Campaign</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedCampaign?.name}</strong>? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteCampaign} disabled={formLoading}>
            {formLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
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

export default CampaignsList
