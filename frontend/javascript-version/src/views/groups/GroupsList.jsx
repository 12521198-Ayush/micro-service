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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'

// API Imports
import { getGroups, createGroup, updateGroup, deleteGroup } from '@/libs/contact-service'

const GroupsList = () => {
  const { data: session, status } = useSession()
  
  // State
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  
  // Notification state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [formLoading, setFormLoading] = useState(false)

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setLoading(true)
      const response = await getGroups(session.accessToken)
      setGroups(response.data || [])
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        signOut({ callbackUrl: '/login' })
      }
      setSnackbar({ open: true, message: error.message || 'Failed to fetch groups', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (session?.accessToken) {
      fetchGroups()
    }
  }, [session?.accessToken, fetchGroups])

  // Handle form changes
  const handleFormChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value })
  }

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedGroup(null)
    setFormData({ name: '', description: '' })
    setOpenDialog(true)
  }

  // Open edit dialog
  const handleOpenEdit = (group) => {
    setSelectedGroup(group)
    setFormData({
      name: group.name || '',
      description: group.description || ''
    })
    setOpenDialog(true)
  }

  // Save group (create or update)
  const handleSaveGroup = async () => {
    if (!session?.accessToken) return

    try {
      setFormLoading(true)
      
      if (selectedGroup) {
        await updateGroup(session.accessToken, selectedGroup.id, formData)
        setSnackbar({ open: true, message: 'Group updated successfully', severity: 'success' })
      } else {
        await createGroup(session.accessToken, formData)
        setSnackbar({ open: true, message: 'Group created successfully', severity: 'success' })
      }
      
      setOpenDialog(false)
      fetchGroups()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to save group', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  // Delete group
  const handleDeleteGroup = async () => {
    if (!session?.accessToken || !selectedGroup) return

    try {
      setFormLoading(true)
      await deleteGroup(session.accessToken, selectedGroup.id)
      setSnackbar({ open: true, message: 'Group deleted successfully', severity: 'success' })
      setOpenDeleteDialog(false)
      fetchGroups()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete group', severity: 'error' })
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
              title="Contact Groups"
              action={
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleOpenCreate}
                  startIcon={<i className="ri-add-line" />}
                >
                  Create Group
                </Button>
              }
            />
            <CardContent>
              {/* Table */}
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Group Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Contacts</TableCell>
                      <TableCell>Created At</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="textSecondary">No groups found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      groups.map((group) => (
                        <TableRow key={group.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                                <i className="ri-group-line" style={{ fontSize: '1.2rem' }} />
                              </Avatar>
                              <Typography fontWeight={500}>{group.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{group.description || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${group.contact_count || 0} contacts`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {group.created_at ? new Date(group.created_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleOpenEdit(group)}>
                                <i className="ri-edit-line" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedGroup(group)
                                  setOpenDeleteDialog(true)
                                }}
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create/Edit Group Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedGroup ? 'Edit Group' : 'Create Group'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Group Name"
                value={formData.name}
                onChange={handleFormChange('name')}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={handleFormChange('description')}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveGroup}
            disabled={formLoading || !formData.name}
          >
            {formLoading ? <CircularProgress size={24} /> : selectedGroup ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedGroup?.name}</strong>? 
            This will not delete the contacts in this group.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteGroup} disabled={formLoading}>
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

export default GroupsList
