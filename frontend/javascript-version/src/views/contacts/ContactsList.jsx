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
import Avatar from '@mui/material/Avatar'

// API Imports
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  toggleContactFavorite,
  assignContactsToGroup
} from '@/libs/contact-service'
import { getGroups } from '@/libs/contact-service'

const ContactsList = () => {
  const { data: session, status } = useSession()
  
  // State
  const [contacts, setContacts] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalContacts, setTotalContacts] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openAssignDialog, setOpenAssignDialog] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [selectedContacts, setSelectedContacts] = useState([])
  const [assignGroupId, setAssignGroupId] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+91',
    company: ''
  })
  
  // Notification state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [formLoading, setFormLoading] = useState(false)

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setLoading(true)
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
        groupId: selectedGroup || undefined,
        favorite: showFavorites || undefined
      }
      
      const response = await getContacts(session.accessToken, params)
      setContacts(response.data || [])
      setTotalContacts(response.pagination?.total || 0)
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        signOut({ callbackUrl: '/login' })
      }
      setSnackbar({ open: true, message: error.message || 'Failed to fetch contacts', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken, page, rowsPerPage, search, selectedGroup, showFavorites])

  // Fetch groups for filter and assign
  const fetchGroups = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      const response = await getGroups(session.accessToken)
      setGroups(response.data || [])
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (session?.accessToken) {
      fetchContacts()
      fetchGroups()
    }
  }, [session?.accessToken, fetchContacts, fetchGroups])

  // Handle form changes
  const handleFormChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value })
  }

  // Open create dialog
  const handleOpenCreate = () => {
    setSelectedContact(null)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      countryCode: '+91',
      company: ''
    })
    setOpenDialog(true)
  }

  // Open edit dialog
  const handleOpenEdit = (contact) => {
    setSelectedContact(contact)
    setFormData({
      firstName: contact.first_name || '',
      lastName: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      countryCode: contact.country_code || '+91',
      company: contact.company || ''
    })
    setOpenDialog(true)
  }

  // Save contact (create or update)
  const handleSaveContact = async () => {
    if (!session?.accessToken) return

    try {
      setFormLoading(true)
      
      const contactData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        countryCode: formData.countryCode,
        company: formData.company
      }

      if (selectedContact) {
        await updateContact(session.accessToken, selectedContact.id, contactData)
        setSnackbar({ open: true, message: 'Contact updated successfully', severity: 'success' })
      } else {
        await createContact(session.accessToken, contactData)
        setSnackbar({ open: true, message: 'Contact created successfully', severity: 'success' })
      }
      
      setOpenDialog(false)
      fetchContacts()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to save contact', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  // Delete contact
  const handleDeleteContact = async () => {
    if (!session?.accessToken || !selectedContact) return

    try {
      setFormLoading(true)
      await deleteContact(session.accessToken, selectedContact.id)
      setSnackbar({ open: true, message: 'Contact deleted successfully', severity: 'success' })
      setOpenDeleteDialog(false)
      fetchContacts()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete contact', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  // Toggle favorite
  const handleToggleFavorite = async (contact) => {
    if (!session?.accessToken) return

    try {
      await toggleContactFavorite(session.accessToken, contact.id)
      fetchContacts()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to update favorite', severity: 'error' })
    }
  }

  // Assign contacts to group
  const handleAssignToGroup = async () => {
    if (!session?.accessToken || !assignGroupId || selectedContacts.length === 0) return

    try {
      setFormLoading(true)
      await assignContactsToGroup(session.accessToken, {
        contactIds: selectedContacts,
        groupId: parseInt(assignGroupId)
      })
      setSnackbar({ open: true, message: 'Contacts assigned to group successfully', severity: 'success' })
      setOpenAssignDialog(false)
      setSelectedContacts([])
      setAssignGroupId('')
      fetchContacts()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to assign contacts', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  // Handle checkbox selection
  const handleSelectContact = (contactId) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    )
  }

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map((c) => c.id))
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
              title="Contacts"
              action={
                <Box display="flex" gap={2}>
                  {selectedContacts.length > 0 && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setOpenAssignDialog(true)}
                      startIcon={<i className="ri-group-line" />}
                    >
                      Assign to Group ({selectedContacts.length})
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleOpenCreate}
                    startIcon={<i className="ri-add-line" />}
                  >
                    Add Contact
                  </Button>
                </Box>
              }
            />
            <CardContent>
              {/* Filters */}
              <Box display="flex" gap={2} mb={4} flexWrap="wrap">
                <TextField
                  size="small"
                  placeholder="Search contacts..."
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
                  <InputLabel>Group</InputLabel>
                  <Select
                    value={selectedGroup}
                    label="Group"
                    onChange={(e) => setSelectedGroup(e.target.value)}
                  >
                    <MenuItem value="">All Groups</MenuItem>
                    {groups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant={showFavorites ? 'contained' : 'outlined'}
                  color={showFavorites ? 'warning' : 'inherit'}
                  onClick={() => setShowFavorites(!showFavorites)}
                  startIcon={<i className={showFavorites ? 'ri-star-fill' : 'ri-star-line'} />}
                >
                  Favorites
                </Button>
              </Box>

              {/* Table */}
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedContacts.length === contacts.length && contacts.length > 0}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Company</TableCell>
                      <TableCell>Favorite</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="textSecondary">No contacts found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      contacts.map((contact) => (
                        <TableRow key={contact.id} hover>
                          <TableCell padding="checkbox">
                            <input
                              type="checkbox"
                              checked={selectedContacts.includes(contact.id)}
                              onChange={() => handleSelectContact(contact.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {(contact.first_name || 'C')[0].toUpperCase()}
                              </Avatar>
                              <Typography>
                                {contact.first_name} {contact.last_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{contact.email || '-'}</TableCell>
                          <TableCell>
                            {contact.country_code} {contact.phone}
                          </TableCell>
                          <TableCell>{contact.company || '-'}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color={contact.is_favorite ? 'warning' : 'default'}
                              onClick={() => handleToggleFavorite(contact)}
                            >
                              <i className={contact.is_favorite ? 'ri-star-fill' : 'ri-star-line'} />
                            </IconButton>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleOpenEdit(contact)}>
                                <i className="ri-edit-line" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedContact(contact)
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

              <TablePagination
                component="div"
                count={totalContacts}
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

      {/* Create/Edit Contact Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedContact ? 'Edit Contact' : 'Create Contact'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={handleFormChange('firstName')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={handleFormChange('lastName')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleFormChange('email')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Country Code"
                value={formData.countryCode}
                onChange={handleFormChange('countryCode')}
                placeholder="+91"
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone}
                onChange={handleFormChange('phone')}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company"
                value={formData.company}
                onChange={handleFormChange('company')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveContact}
            disabled={formLoading || !formData.firstName || !formData.phone}
          >
            {formLoading ? <CircularProgress size={24} /> : selectedContact ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Contact</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{' '}
            <strong>
              {selectedContact?.first_name} {selectedContact?.last_name}
            </strong>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteContact} disabled={formLoading}>
            {formLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign to Group Dialog */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)}>
        <DialogTitle>Assign Contacts to Group</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Assign {selectedContacts.length} contact(s) to a group
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select Group</InputLabel>
            <Select
              value={assignGroupId}
              label="Select Group"
              onChange={(e) => setAssignGroupId(e.target.value)}
            >
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssignToGroup}
            disabled={formLoading || !assignGroupId}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Assign'}
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

export default ContactsList
