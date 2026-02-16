'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'
import TablePagination from '@mui/material/TablePagination'

import { getFlows, createFlow, deleteFlow, duplicateFlow } from '@/libs/automation-service'

const AutomationFlowsList = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const [flows, setFlows] = useState([])
  const [analytics, setAnalytics] = useState({ totalFlows: 0, activeFlows: 0, inactiveFlows: 0, totalRuns: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [creating, setCreating] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchFlows = useCallback(async () => {
    try {
      setLoading(true)
      const token = session?.accessToken
      if (!token) return

      const result = await getFlows(token, {
        search,
        page: page + 1,
        limit: rowsPerPage
      })

      setFlows(result.data?.data || [])
      setAnalytics(result.analytics || { totalFlows: 0, activeFlows: 0, inactiveFlows: 0, totalRuns: 0 })
      setTotal(result.data?.meta?.total || 0)
    } catch (error) {
      console.error('Error fetching flows:', error)
    } finally {
      setLoading(false)
    }
  }, [search, page, rowsPerPage, session])

  useEffect(() => {
    fetchFlows()
  }, [fetchFlows])

  const handleCreate = async () => {
    if (!createName.trim()) return
    try {
      setCreating(true)
      const token = session?.accessToken
      const result = await createFlow(token, { name: createName, description: createDescription })
      setCreateOpen(false)
      setCreateName('')
      setCreateDescription('')

      if (result.data?.uuid) {
        router.push(`/automation/${result.data.uuid}`)
      } else {
        fetchFlows()
      }
    } catch (error) {
      console.error('Error creating flow:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      const token = session?.accessToken
      await deleteFlow(token, deleteTarget.uuid)
      setDeleteOpen(false)
      setDeleteTarget(null)
      fetchFlows()
    } catch (error) {
      console.error('Error deleting flow:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleDuplicate = async (uuid) => {
    try {
      const token = session?.accessToken
      await duplicateFlow(token, uuid)
      fetchFlows()
    } catch (error) {
      console.error('Error duplicating flow:', error)
    }
  }

  const statsCards = [
    {
      title: 'Total Automations',
      value: analytics.totalFlows,
      icon: 'ri-file-list-2-line',
      gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
      bgColor: '#eff6ff'
    },
    {
      title: 'Total Runs',
      value: analytics.totalRuns,
      icon: 'ri-refresh-line',
      gradient: 'linear-gradient(135deg, #22c55e, #10b981)',
      bgColor: '#f0fdf4'
    },
    {
      title: 'Active Flows',
      value: analytics.activeFlows,
      icon: 'ri-checkbox-circle-line',
      gradient: 'linear-gradient(135deg, #f97316, #fb923c)',
      bgColor: '#fff7ed'
    }
  ]

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant='h5' fontWeight='bold'>My Automations</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            Respond automatically to messages based on your own criteria
          </Typography>
        </Box>
        <Button
          variant='contained'
          startIcon={<i className='ri-add-line' />}
          onClick={() => setCreateOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #ff5100, #ff7a3d)',
            borderRadius: 3,
            px: 3,
            '&:hover': { background: 'linear-gradient(135deg, #e64900, #ff6a2d)' }
          }}
        >
          Create
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card
              sx={{
                borderRadius: 4,
                transition: 'all 0.3s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box
                    sx={{
                      background: card.gradient,
                      borderRadius: 3,
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className={card.icon} style={{ fontSize: 24, color: 'white' }} />
                  </Box>
                </Box>
                <Typography variant='h4' fontWeight='bold'>{card.value}</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>{card.title}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Flows Table */}
      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant='h6'>Automation Flows</Typography>
            <TextField
              size='small'
              placeholder='Search flows...'
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='ri-search-line' />
                  </InputAdornment>
                )
              }}
              sx={{ width: 300 }}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : flows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <i className='ri-robot-line' style={{ fontSize: 64, color: '#d1d5db' }} />
              <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                No automation flows yet
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Create your first automation flow to get started
              </Typography>
              <Button
                variant='contained'
                sx={{ mt: 3, background: 'linear-gradient(135deg, #ff5100, #ff7a3d)' }}
                onClick={() => setCreateOpen(true)}
              >
                Create Your First Flow
              </Button>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Trigger</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Runs</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {flows.map((flow) => (
                      <TableRow
                        key={flow.id}
                        hover
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => router.push(`/automation/${flow.uuid}`)}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant='subtitle2' fontWeight='600'>{flow.name}</Typography>
                            {flow.description && (
                              <Typography variant='caption' color='text.secondary'>{flow.description}</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={flow.trigger === 'new_contact' ? 'New Contact' : flow.trigger === 'keywords' ? 'Keywords' : 'Not Set'}
                            size='small'
                            variant='outlined'
                            color={flow.trigger ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={flow.status === 'active' ? 'Active' : 'Inactive'}
                            size='small'
                            color={flow.status === 'active' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{flow.flow_logs_count || 0}</TableCell>
                        <TableCell>
                          {flow.updated_at ? new Date(flow.updated_at).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell align='right'>
                          <Tooltip title='Edit'>
                            <IconButton
                              size='small'
                              onClick={(e) => { e.stopPropagation(); router.push(`/automation/${flow.uuid}`) }}
                            >
                              <i className='ri-edit-line' />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Duplicate'>
                            <IconButton
                              size='small'
                              onClick={(e) => { e.stopPropagation(); handleDuplicate(flow.uuid) }}
                            >
                              <i className='ri-file-copy-line' />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Delete'>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(flow); setDeleteOpen(true) }}
                            >
                              <i className='ri-delete-bin-line' />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component='div'
                count={total}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2,
                background: 'linear-gradient(135deg, #ff5100, #ff7a3d)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <i className='ri-robot-line' style={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant='h6'>New Automation</Typography>
              <Typography variant='caption' color='text.secondary'>Create a new automation workflow</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label='Name'
              fullWidth
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
            />
            <TextField
              label='Description'
              fullWidth
              multiline
              rows={3}
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
            disabled={creating || !createName.trim()}
            sx={{ background: 'linear-gradient(135deg, #ff5100, #ff7a3d)' }}
          >
            {creating ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Automation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant='contained' color='error' onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AutomationFlowsList
