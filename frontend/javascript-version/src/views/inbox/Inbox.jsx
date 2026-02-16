'use client'

// React Imports
import { useState, useEffect, useCallback, useRef } from 'react'

// Next Imports
import { useSession, signOut } from 'next-auth/react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import ListItemButton from '@mui/material/ListItemButton'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Badge from '@mui/material/Badge'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

// API Imports
import { getMessages, sendTextMessage, sendTemplateMessage } from '@/libs/whatsapp-service'
import { getContacts } from '@/libs/contact-service'
import { listTemplates } from '@/libs/template-service'

const Inbox = () => {
  const { data: session, status } = useSession()
  const messagesEndRef = useRef(null)
  
  // State
  const [contacts, setContacts] = useState([])
  const [messages, setMessages] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  
  // Selected state
  const [selectedContact, setSelectedContact] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [searchContact, setSearchContact] = useState('')
  
  // Template dialog
  const [templateDialog, setTemplateDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  
  // Notification state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      const response = await getContacts(session.accessToken, { limit: 100 })
      setContacts(response.data || [])
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        signOut({ callbackUrl: '/login' })
      }
      console.error('Failed to fetch contacts:', error)
    }
  }, [session?.accessToken])

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setLoading(true)
      const response = await getMessages(session.accessToken, { limit: 100 })
      setMessages(response.data || [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken])

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      const response = await listTemplates(session.accessToken, { status: 'approve' })
      setTemplates(response.data || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (session?.accessToken) {
      fetchContacts()
      fetchMessages()
      fetchTemplates()
    }
  }, [session?.accessToken, fetchContacts, fetchMessages, fetchTemplates])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedContact])

  // Get messages for selected contact
  const getContactMessages = () => {
    if (!selectedContact) return []
    
    const contactPhone = selectedContact.phone?.replace(/\D/g, '')
    return messages.filter(msg => {
      const msgPhone = (msg.to || msg.from || '').replace(/\D/g, '')
      return msgPhone.includes(contactPhone) || contactPhone.includes(msgPhone)
    }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }

  // Send text message
  const handleSendMessage = async () => {
    if (!session?.accessToken || !selectedContact || !messageText.trim()) return

    try {
      setSendingMessage(true)
      
      const phoneNumber = `${selectedContact.country_code || ''}${selectedContact.phone}`.replace(/\D/g, '')
      
      await sendTextMessage(session.accessToken, phoneNumber, messageText.trim())
      
      setSnackbar({ open: true, message: 'Message sent successfully', severity: 'success' })
      setMessageText('')
      fetchMessages()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to send message', severity: 'error' })
    } finally {
      setSendingMessage(false)
    }
  }

  // Send template message
  const handleSendTemplate = async () => {
    if (!session?.accessToken || !selectedContact || !selectedTemplate) return

    try {
      setSendingMessage(true)
      
      const template = templates.find(t => t.id === selectedTemplate || t.uuid === selectedTemplate)
      const phoneNumber = `${selectedContact.country_code || ''}${selectedContact.phone}`.replace(/\D/g, '')
      
      await sendTemplateMessage(
        session.accessToken,
        phoneNumber,
        template.name,
        template.language || 'en',
        []
      )
      
      setSnackbar({ open: true, message: 'Template message sent successfully', severity: 'success' })
      setTemplateDialog(false)
      setSelectedTemplate('')
      fetchMessages()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to send template', severity: 'error' })
    } finally {
      setSendingMessage(false)
    }
  }

  // Filter contacts by search
  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchContact.toLowerCase()
    return (
      (contact.first_name || '').toLowerCase().includes(searchLower) ||
      (contact.last_name || '').toLowerCase().includes(searchLower) ||
      (contact.phone || '').includes(searchLower)
    )
  })

  // Get last message for a contact
  const getLastMessage = (contact) => {
    const contactPhone = contact.phone?.replace(/\D/g, '')
    const contactMessages = messages.filter(msg => {
      const msgPhone = (msg.to || msg.from || '').replace(/\D/g, '')
      return msgPhone.includes(contactPhone) || contactPhone.includes(msgPhone)
    })
    
    if (contactMessages.length === 0) return null
    return contactMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
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
      <Grid container spacing={0} sx={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
        {/* Contacts List */}
        <Grid item xs={12} md={4} lg={3}>
          <Card sx={{ height: '100%', borderRadius: '8px 0 0 8px' }}>
            <CardHeader
              title="Conversations"
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2, pb: 2 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search contacts..."
                  value={searchContact}
                  onChange={(e) => setSearchContact(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <i className="ri-search-line" />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
              <Divider />
              <List sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 350px)' }}>
                {filteredContacts.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No contacts found"
                      secondary="Add contacts to start messaging"
                      primaryTypographyProps={{ color: 'textSecondary', align: 'center' }}
                      secondaryTypographyProps={{ align: 'center' }}
                    />
                  </ListItem>
                ) : (
                  filteredContacts.map((contact) => {
                    const lastMsg = getLastMessage(contact)
                    return (
                      <ListItemButton
                        key={contact.id}
                        selected={selectedContact?.id === contact.id}
                        onClick={() => setSelectedContact(contact)}
                      >
                        <ListItemAvatar>
                          <Badge
                            color="success"
                            variant="dot"
                            invisible={!lastMsg}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          >
                            <Avatar>
                              {(contact.first_name || 'C')[0].toUpperCase()}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${contact.first_name || ''} ${contact.last_name || ''}`}
                          secondary={
                            lastMsg
                              ? lastMsg.text?.substring(0, 30) + (lastMsg.text?.length > 30 ? '...' : '')
                              : contact.phone
                          }
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                        {lastMsg && (
                          <Typography variant="caption" color="textSecondary">
                            {new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        )}
                      </ListItemButton>
                    )
                  })
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Chat Area */}
        <Grid item xs={12} md={8} lg={9}>
          <Card sx={{ height: '100%', borderRadius: '0 8px 8px 0', display: 'flex', flexDirection: 'column' }}>
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar>{(selectedContact.first_name || 'C')[0].toUpperCase()}</Avatar>
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {selectedContact.first_name} {selectedContact.last_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {selectedContact.country_code} {selectedContact.phone}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setTemplateDialog(true)}
                    startIcon={<i className="ri-file-list-2-line" />}
                  >
                    Send Template
                  </Button>
                </Box>

                {/* Messages Area */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'action.hover' }}>
                  {getContactMessages().length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="textSecondary">
                        No messages yet. Start a conversation!
                      </Typography>
                    </Box>
                  ) : (
                    getContactMessages().map((msg, index) => {
                      const isOutgoing = msg.direction === 'outgoing' || msg.type === 'sent'
                      return (
                        <Box
                          key={msg.id || index}
                          sx={{
                            display: 'flex',
                            justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
                            mb: 2
                          }}
                        >
                          <Paper
                            sx={{
                              p: 1.5,
                              maxWidth: '70%',
                              bgcolor: isOutgoing ? 'primary.main' : 'background.paper',
                              color: isOutgoing ? 'primary.contrastText' : 'text.primary',
                              borderRadius: 2
                            }}
                          >
                            <Typography variant="body2">
                              {msg.text || msg.template_name || 'Template message'}
                            </Typography>
                            <Box display="flex" justifyContent="flex-end" alignItems="center" gap={0.5} mt={0.5}>
                              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                              {isOutgoing && (
                                <i
                                  className={msg.status === 'delivered' || msg.status === 'read' ? 'ri-check-double-line' : 'ri-check-line'}
                                  style={{ fontSize: 14, opacity: 0.7 }}
                                />
                              )}
                            </Box>
                          </Paper>
                        </Box>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Message Input */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Box display="flex" gap={1}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small">
                              <i className="ri-emotion-line" />
                            </IconButton>
                            <IconButton size="small">
                              <i className="ri-attachment-2" />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !messageText.trim()}
                    >
                      {sendingMessage ? <CircularProgress size={24} /> : <i className="ri-send-plane-fill" />}
                    </Button>
                  </Box>
                </Box>
              </>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Box textAlign="center">
                  <i className="ri-chat-3-line" style={{ fontSize: 64, color: '#999' }} />
                  <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>
                    Select a conversation
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Choose a contact to start messaging
                  </Typography>
                </Box>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Template Dialog */}
      <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Template Message</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Send a pre-approved template to {selectedContact?.first_name}
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select Template</InputLabel>
            <Select
              value={selectedTemplate}
              label="Select Template"
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.uuid || template.id}>
                  {template.name} - {template.category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedTemplate && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Template messages are required for the first message to a contact or after 24 hours of inactivity.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSendTemplate}
            disabled={sendingMessage || !selectedTemplate}
          >
            {sendingMessage ? <CircularProgress size={24} /> : 'Send Template'}
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

export default Inbox
