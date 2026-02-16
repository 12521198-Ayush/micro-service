'use client'

// React Imports
import { useState, useEffect, useCallback, useRef } from 'react'

// Next Imports
import { useSession, signOut } from 'next-auth/react'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Checkbox from '@mui/material/Checkbox'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import Fab from '@mui/material/Fab'

// API Imports
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  bulkCreateContacts,
  getContactsByGroupId
} from '@/libs/contact-service'

const ContactsGroupsPage = () => {
  const { data: session, status } = useSession()
  const fileInputRef = useRef(null)

  // State
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState([])
  const [groups, setGroups] = useState([])
  const [activeTab, setActiveTab] = useState(0) // 0: All Contacts, 1: Groups
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedContacts, setSelectedContacts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)

  // Form states
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+91',
    company: '',
    groupId: ''
  })
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })
  const [importData, setImportData] = useState({ file: null, groupId: '' })

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState(null)

  // Notification state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [formLoading, setFormLoading] = useState(false)

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      const response = await getGroups(session.accessToken)
      setGroups(response.data || [])
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        signOut({ callbackUrl: '/login' })
      }
      console.error('Failed to fetch groups:', error)
    }
  }, [session?.accessToken])

  // Fetch contacts (all or by group)
  const fetchContacts = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setLoading(true)
      let response

      if (selectedGroup) {
        response = await getContactsByGroupId(session.accessToken, selectedGroup.id, {
          limit: 100,
          search: searchQuery
        })
      } else {
        response = await getContacts(session.accessToken, {
          limit: 100,
          search: searchQuery
        })
      }

      setContacts(response.data || [])
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken, selectedGroup, searchQuery])

  useEffect(() => {
    if (session?.accessToken) {
      fetchGroups()
      fetchContacts()
    }
  }, [session?.accessToken, fetchGroups, fetchContacts])

  // Handle contact form changes
  const handleContactFormChange = (field) => (event) => {
    setContactForm({ ...contactForm, [field]: event.target.value })
  }

  // Handle group form changes
  const handleGroupFormChange = (field) => (event) => {
    setGroupForm({ ...groupForm, [field]: event.target.value })
  }

  // Open create contact dialog
  const handleOpenCreateContact = () => {
    setEditingContact(null)
    setContactForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      countryCode: '+91',
      company: '',
      groupId: selectedGroup?.id || ''
    })
    setContactDialogOpen(true)
  }

  // Open edit contact dialog
  const handleOpenEditContact = (contact) => {
    setEditingContact(contact)
    setContactForm({
      firstName: contact.first_name || contact.firstName || '',
      lastName: contact.last_name || contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      countryCode: contact.country_code || contact.countryCode || '+91',
      company: contact.company || '',
      groupId: contact.group_id || contact.groupId || ''
    })
    setContactDialogOpen(true)
  }

  // Save contact
  const handleSaveContact = async () => {
    if (!session?.accessToken) return

    try {
      setFormLoading(true)

      const data = {
        firstName: contactForm.firstName,
        lastName: contactForm.lastName,
        email: contactForm.email,
        phone: contactForm.phone,
        countryCode: contactForm.countryCode,
        company: contactForm.company,
        groupId: contactForm.groupId || null
      }

      if (editingContact) {
        await updateContact(session.accessToken, editingContact.id, data)
        setSnackbar({ open: true, message: 'Contact updated successfully', severity: 'success' })
      } else {
        await createContact(session.accessToken, data)
        setSnackbar({ open: true, message: 'Contact created successfully', severity: 'success' })
      }

      setContactDialogOpen(false)
      fetchContacts()
      fetchGroups() // Refresh group counts
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to save contact', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  // Delete contact
  const handleDeleteContact = async () => {
    if (!session?.accessToken || !editingContact) return

    try {
      setFormLoading(true)
      await deleteContact(session.accessToken, editingContact.id)
      setSnackbar({ open: true, message: 'Contact deleted successfully', severity: 'success' })
      setDeleteDialogOpen(false)
      setEditingContact(null)
      fetchContacts()
      fetchGroups()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete contact', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  // Open create group dialog
  const handleOpenCreateGroup = () => {
    setEditingGroup(null)
    setGroupForm({ name: '', description: '' })
    setGroupDialogOpen(true)
  }

  // Open edit group dialog
  const handleOpenEditGroup = () => {
    if (!selectedGroup) return
    setEditingGroup(selectedGroup)
    setGroupForm({ name: selectedGroup.name, description: selectedGroup.description || '' })
    setGroupDialogOpen(true)
  }

  // Save group
  const handleSaveGroup = async () => {
    if (!session?.accessToken) return

    try {
      setFormLoading(true)

      if (editingGroup) {
        await updateGroup(session.accessToken, editingGroup.id, groupForm)
        setSnackbar({ open: true, message: 'Group updated successfully', severity: 'success' })
      } else {
        await createGroup(session.accessToken, groupForm)
        setSnackbar({ open: true, message: 'Group created successfully', severity: 'success' })
      }

      setGroupDialogOpen(false)
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
      const response = await deleteGroup(session.accessToken, selectedGroup.id)
      setSnackbar({ 
        open: true, 
        message: response.message || 'Group deleted successfully', 
        severity: 'success' 
      })
      setDeleteGroupDialogOpen(false)
      setSelectedGroup(null)
      fetchGroups()
      fetchContacts()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete group', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  // Handle file import
  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setImportData({ ...importData, file })
    }
  }

  // Process CSV/Excel file
  const handleImportContacts = async () => {
    if (!session?.accessToken || !importData.file) return

    try {
      setFormLoading(true)

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const text = e.target.result
          const lines = text.split('\n').filter(line => line.trim())
          
          // Parse header
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
          
          // Parse contacts
          const contactsToImport = []
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim())
            const contact = {}
            
            headers.forEach((header, index) => {
              if (header.includes('first')) contact.firstName = values[index]
              else if (header.includes('last')) contact.lastName = values[index]
              else if (header.includes('email')) contact.email = values[index]
              else if (header.includes('phone') || header.includes('mobile')) contact.phone = values[index]
              else if (header.includes('country') || header.includes('code')) contact.countryCode = values[index]
              else if (header.includes('company') || header.includes('organization')) contact.company = values[index]
            })

            if (contact.firstName && contact.phone) {
              contactsToImport.push(contact)
            }
          }

          if (contactsToImport.length === 0) {
            setSnackbar({ open: true, message: 'No valid contacts found in file', severity: 'error' })
            return
          }

          const response = await bulkCreateContacts(session.accessToken, {
            contacts: contactsToImport,
            groupId: importData.groupId || null
          })

          setSnackbar({ 
            open: true, 
            message: response.message || `${response.data?.created || 0} contacts imported`, 
            severity: 'success' 
          })
          setImportDialogOpen(false)
          setImportData({ file: null, groupId: '' })
          fetchContacts()
          fetchGroups()
        } catch (parseError) {
          setSnackbar({ open: true, message: 'Failed to parse file', severity: 'error' })
        }
        setFormLoading(false)
      }

      reader.readAsText(importData.file)
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to import contacts', severity: 'error' })
      setFormLoading(false)
    }
  }

  // Filter contacts by search
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const firstName = (contact.first_name || contact.firstName || '').toLowerCase()
    const lastName = (contact.last_name || contact.lastName || '').toLowerCase()
    const phone = (contact.phone || '').toLowerCase()
    return firstName.includes(query) || lastName.includes(query) || phone.includes(query)
  })

  // Filter groups by search
  const filteredGroups = groups.filter(group => {
    if (!searchQuery) return true
    return group.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Handle select all
  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id))
    }
  }

  // Handle select contact
  const handleSelectContact = (id) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    )
  }

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 150px)', gap: 3 }}>
      {/* Left Sidebar */}
      <Card sx={{ width: 350, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" fontWeight="bold">Groups</Typography>
            <Chip label={`${groups.length} total groups`} size="small" color="default" />
          </Box>
          <Fab
            color="primary"
            size="small"
            onClick={handleOpenCreateGroup}
            sx={{ position: 'absolute', right: 16, top: 16 }}
          >
            <i className="ri-add-line" />
          </Fab>
        </CardContent>

        <Box px={2} pb={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <i className="ri-search-line" />
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Box px={2} pb={1} display="flex" alignItems="center" gap={1}>
          <Checkbox
            size="small"
            checked={selectedContacts.length > 0 && selectedContacts.length === filteredContacts.length}
            indeterminate={selectedContacts.length > 0 && selectedContacts.length < filteredContacts.length}
            onChange={handleSelectAll}
          />
          <Typography variant="body2" color="text.secondary">Select all</Typography>
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <i className="ri-more-2-fill" />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={() => { setImportDialogOpen(true); setMenuAnchor(null) }}>
              <i className="ri-upload-line" style={{ marginRight: 8 }} /> Import Contacts
            </MenuItem>
          </Menu>
        </Box>

        <Divider />

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(e, v) => { setActiveTab(v); setSelectedGroup(null) }}>
          <Tab label="All Contacts" sx={{ flex: 1 }} />
          <Tab label="Groups" sx={{ flex: 1 }} />
        </Tabs>

        {/* List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 0 ? (
            // All Contacts List
            <List disablePadding>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress size={24} />
                </Box>
              ) : filteredContacts.length === 0 ? (
                <Typography color="text.secondary" align="center" p={3}>
                  No contacts found
                </Typography>
              ) : (
                filteredContacts.map(contact => (
                  <ListItem
                    key={contact.id}
                    disablePadding
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => handleSelectContact(contact.id)}
                      />
                    }
                  >
                    <ListItemButton onClick={() => handleOpenEditContact(contact)}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: '#ff5100', width: 36, height: 36 }}>
                          {(contact.first_name || contact.firstName || 'C')[0].toUpperCase()}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={`${contact.first_name || contact.firstName || ''} ${contact.last_name || contact.lastName || ''}`}
                        secondary={`${contact.country_code || contact.countryCode || ''} ${contact.phone || ''}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
          ) : (
            // Groups List
            <List disablePadding>
              {filteredGroups.length === 0 ? (
                <Typography color="text.secondary" align="center" p={3}>
                  No groups found
                </Typography>
              ) : (
                filteredGroups.map(group => (
                  <ListItem
                    key={group.id}
                    disablePadding
                    sx={{
                      bgcolor: selectedGroup?.id === group.id ? 'action.selected' : 'transparent',
                      borderLeft: selectedGroup?.id === group.id ? '4px solid #ff5100' : 'none'
                    }}
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={selectedGroup?.id === group.id}
                        onChange={() => setSelectedGroup(selectedGroup?.id === group.id ? null : group)}
                      />
                    }
                  >
                    <ListItemButton onClick={() => setSelectedGroup(group)}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: '#ff5100', width: 36, height: 36 }}>
                          {group.name[0].toUpperCase()}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText primary={group.name} />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
          )}
        </Box>
      </Card>

      {/* Right Content */}
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedGroup ? (
          // Group Details View
          <>
            <CardContent>
              <Box display="flex" alignItems="center" gap={3} mb={3}>
                <Avatar sx={{ bgcolor: '#ff5100', width: 80, height: 80, fontSize: '2rem' }}>
                  {selectedGroup.name[0].toUpperCase()}
                </Avatar>
                <Box flex={1}>
                  <Typography variant="h4" fontWeight="bold">{selectedGroup.name}</Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <i className="ri-group-line" />
                    <Typography color="text.secondary">
                      {selectedGroup.contact_count || 0} contacts
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<i className="ri-edit-line" />}
                  onClick={handleOpenEditGroup}
                  sx={{ bgcolor: '#ff5100', '&:hover': { bgcolor: '#e64a00' } }}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<i className="ri-delete-bin-line" />}
                  onClick={() => setDeleteGroupDialogOpen(true)}
                >
                  Delete
                </Button>
              </Box>
            </CardContent>

            <Divider />

            <CardContent>
              <Box display="flex" alignItems="center" gap={2} p={2} bgcolor="#f5f5f5" borderRadius={2}>
                <Avatar sx={{ bgcolor: 'error.light', width: 40, height: 40 }}>
                  <i className="ri-group-line" />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">Group Information</Typography>
                </Box>
              </Box>

              <Box mt={3} display="flex" gap={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Group Name</Typography>
                  <Typography fontWeight="bold">{selectedGroup.name}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Contacts</Typography>
                  <Chip
                    label={`${selectedGroup.contact_count || 0} contacts`}
                    size="small"
                    sx={{ bgcolor: '#ff5100', color: 'white', mt: 0.5 }}
                  />
                </Box>
              </Box>

              {selectedGroup.description && (
                <Box mt={3}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography>{selectedGroup.description}</Typography>
                </Box>
              )}
            </CardContent>
          </>
        ) : (
          // Default/Empty state or All Contacts view
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Avatar sx={{ bgcolor: '#f5f5f5', width: 80, height: 80, mb: 2 }}>
              <i className="ri-contacts-book-line" style={{ fontSize: 40, color: '#999' }} />
            </Avatar>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {activeTab === 1 ? 'Select a group to view details' : 'Manage your contacts'}
            </Typography>
            <Typography color="text.secondary" align="center" mb={3}>
              {activeTab === 1 
                ? 'Click on a group from the left panel to see group information and contacts'
                : 'Add contacts individually or import from a file'
              }
            </Typography>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<i className="ri-add-line" />}
                onClick={handleOpenCreateContact}
                sx={{ bgcolor: '#ff5100', '&:hover': { bgcolor: '#e64a00' } }}
              >
                Add Contact
              </Button>
              <Button
                variant="outlined"
                startIcon={<i className="ri-upload-line" />}
                onClick={() => setImportDialogOpen(true)}
              >
                Import Contacts
              </Button>
            </Box>
          </CardContent>
        )}
      </Card>

      {/* Create/Edit Contact Dialog */}
      <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingContact ? 'Edit Contact' : 'Create Contact'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={contactForm.firstName}
                onChange={handleContactFormChange('firstName')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={contactForm.lastName}
                onChange={handleContactFormChange('lastName')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={contactForm.email}
                onChange={handleContactFormChange('email')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Country Code"
                value={contactForm.countryCode}
                onChange={handleContactFormChange('countryCode')}
                placeholder="+91"
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Phone Number"
                value={contactForm.phone}
                onChange={handleContactFormChange('phone')}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company"
                value={contactForm.company}
                onChange={handleContactFormChange('company')}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Assign to Group</InputLabel>
                <Select
                  value={contactForm.groupId}
                  label="Assign to Group"
                  onChange={handleContactFormChange('groupId')}
                >
                  <MenuItem value="">No Group</MenuItem>
                  {groups.map(group => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          {editingContact && (
            <Button
              color="error"
              onClick={() => { setContactDialogOpen(false); setDeleteDialogOpen(true) }}
            >
              Delete
            </Button>
          )}
          <Box flex={1} />
          <Button onClick={() => setContactDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveContact}
            disabled={formLoading || !contactForm.firstName || !contactForm.phone}
            sx={{ bgcolor: '#ff5100', '&:hover': { bgcolor: '#e64a00' } }}
          >
            {formLoading ? <CircularProgress size={24} /> : editingContact ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Group Dialog */}
      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingGroup ? 'Edit Group' : 'Create Group'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Group Name"
                value={groupForm.name}
                onChange={handleGroupFormChange('name')}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={groupForm.description}
                onChange={handleGroupFormChange('description')}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveGroup}
            disabled={formLoading || !groupForm.name}
            sx={{ bgcolor: '#ff5100', '&:hover': { bgcolor: '#e64a00' } }}
          >
            {formLoading ? <CircularProgress size={24} /> : editingGroup ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Contact Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Contact</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{' '}
            <strong>
              {editingContact?.first_name || editingContact?.firstName} {editingContact?.last_name || editingContact?.lastName}
            </strong>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteContact}
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={deleteGroupDialogOpen} onClose={() => setDeleteGroupDialogOpen(false)}>
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Warning: Deleting this group will also delete all contacts in this group!
          </Alert>
          <Typography>
            Are you sure you want to delete <strong>{selectedGroup?.name}</strong>?
            This will permanently delete <strong>{selectedGroup?.contact_count || 0} contact(s)</strong> in this group.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteGroupDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteGroup}
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Delete Group & Contacts'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Contacts Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Contacts</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Upload a CSV file with columns: first_name, last_name, email, phone, country_code, company
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                startIcon={<i className="ri-file-upload-line" />}
                sx={{ py: 2 }}
              >
                {importData.file ? importData.file.name : 'Select CSV File'}
              </Button>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Assign to Group (Optional)</InputLabel>
                <Select
                  value={importData.groupId}
                  label="Assign to Group (Optional)"
                  onChange={(e) => setImportData({ ...importData, groupId: e.target.value })}
                >
                  <MenuItem value="">No Group</MenuItem>
                  {groups.map(group => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleImportContacts}
            disabled={formLoading || !importData.file}
            sx={{ bgcolor: '#ff5100', '&:hover': { bgcolor: '#e64a00' } }}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Import'}
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
    </Box>
  )
}

export default ContactsGroupsPage
