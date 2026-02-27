'use client'

// React Imports
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// Next Imports
import { useSession, signOut } from 'next-auth/react'

// Socket.IO
import { io } from 'socket.io-client'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import List from '@mui/material/List'
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
import Tooltip from '@mui/material/Tooltip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Skeleton from '@mui/material/Skeleton'
import { useTheme, alpha } from '@mui/material/styles'

// API Imports
import { getChats, getChatMessages, sendChatMessage, markChatAsRead, closeChat, getChatStats } from '@/libs/chat-service'
import { listTemplates } from '@/libs/template-service'

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3006'

// ============================================================
// Helper: format relative time
// ============================================================
function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHr < 24) return `${diffHr}h`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatMessageTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateSeparator(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

// Status icon for delivery
function StatusIcon({ status }) {
  if (status === 'read') return <i className="ri-check-double-line" style={{ fontSize: 14, color: '#53bdeb' }} />
  if (status === 'delivered') return <i className="ri-check-double-line" style={{ fontSize: 14, opacity: 0.6 }} />
  if (status === 'sent') return <i className="ri-check-line" style={{ fontSize: 14, opacity: 0.6 }} />
  if (status === 'failed') return <i className="ri-error-warning-line" style={{ fontSize: 14, color: '#f44336' }} />
  return <i className="ri-time-line" style={{ fontSize: 14, opacity: 0.4 }} />
}

// ============================================================
// Parse message content for display
// ============================================================
function getMessageDisplay(msg) {
  const content = msg.content
  if (!content) return { text: msg.message_type === 'template' ? '📋 Template message' : '', type: msg.message_type }

  let parsed = content
  if (typeof content === 'string') {
    try { parsed = JSON.parse(content) } catch (e) { return { text: content, type: msg.message_type } }
  }

  if (parsed.text) return { text: parsed.text, type: 'text' }
  if (parsed.body) return { text: parsed.body, type: 'text' }
  if (parsed.name) return { text: `📋 Template: ${parsed.name}`, type: 'template' }
  if (msg.message_type === 'image') return { text: `📷 ${parsed.caption || 'Photo'}`, type: 'image' }
  if (msg.message_type === 'video') return { text: `🎬 ${parsed.caption || 'Video'}`, type: 'video' }
  if (msg.message_type === 'audio') return { text: '🎵 Audio message', type: 'audio' }
  if (msg.message_type === 'document') return { text: `📄 ${parsed.filename || 'Document'}`, type: 'document' }
  if (msg.message_type === 'location') return { text: `📍 Location`, type: 'location' }
  if (msg.message_type === 'sticker') return { text: '🎨 Sticker', type: 'sticker' }
  if (msg.message_type === 'contacts') return { text: '👤 Contact card', type: 'contacts' }

  return { text: JSON.stringify(parsed).substring(0, 100), type: msg.message_type }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
const Inbox = () => {
  const { data: session, status: authStatus } = useSession()
  const theme = useTheme()
  const messagesEndRef = useRef(null)
  const chatListRef = useRef(null)
  const socketRef = useRef(null)
  
  // Core state
  const [chats, setChats] = useState([])
  const [messages, setMessages] = useState([])
  const [templates, setTemplates] = useState([])
  const [stats, setStats] = useState({})

  // Loading states
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  // Selection
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState(0) // 0=all, 1=unread, 2=inbound, 3=outbound

  // Template dialog
  const [templateDialog, setTemplateDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // Pagination
  const [chatPage, setChatPage] = useState(1)
  const [hasMoreChats, setHasMoreChats] = useState(true)
  const [msgPage, setMsgPage] = useState(1)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)

  // ============================================================
  // Socket.IO Connection
  // ============================================================
  useEffect(() => {
    if (!session?.accessToken || !session?.user?.id) return

    const socket = io(WHATSAPP_SERVICE_URL, {
      path: '/whatsapp-service/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token: session.accessToken }
    })

    socket.on('connect', () => {
      console.log('[Inbox] Socket connected')
      socket.emit('join', { userId: session.user.id })
    })

    socket.on('new_message', (data) => {
      fetchChats(1, true)
      if (selectedChat && data.phoneNumber === selectedChat.phone_number) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          phone_number: data.phoneNumber,
          direction: 'inbound',
          message_type: data.messageType || 'text',
          content: data.content || { text: data.text },
          status: 'received',
          whatsapp_message_id: data.messageId,
          created_at: new Date().toISOString()
        }])
        scrollToBottom()
      }
    })

    socket.on('message_status', (data) => {
      setMessages(prev => prev.map(msg =>
        msg.whatsapp_message_id === data.messageId
          ? { ...msg, status: data.status }
          : msg
      ))
      fetchChats(1, true)
    })

    socket.on('chat_message', (data) => {
      if (selectedChat && data.phoneNumber === selectedChat.phone_number) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          phone_number: data.phoneNumber,
          direction: data.direction || 'inbound',
          message_type: data.messageType || 'text',
          content: data.content || { text: data.text },
          status: data.status || 'received',
          whatsapp_message_id: data.messageId,
          created_at: new Date().toISOString()
        }])
        scrollToBottom()
      }
    })

    socket.on('chat_status', (data) => {
      setMessages(prev => prev.map(msg =>
        msg.whatsapp_message_id === data.messageId
          ? { ...msg, status: data.status }
          : msg
      ))
    })

    socket.on('disconnect', () => {
      console.log('[Inbox] Socket disconnected')
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, session?.user?.id])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    if (selectedChat) {
      socket.emit('join_chat', { phoneNumber: selectedChat.phone_number })
    }
    return () => {
      if (selectedChat) {
        socket.emit('leave_chat', { phoneNumber: selectedChat.phone_number })
      }
    }
  }, [selectedChat])

  // ============================================================
  // Data Fetching
  // ============================================================
  const fetchChats = useCallback(async (page = 1, silent = false) => {
    if (!session?.accessToken) return
    if (!silent) setLoadingChats(true)

    try {
      const params = { page, limit: 50, search: searchQuery || undefined }
      if (activeTab === 2) params.direction = 'inbound'
      if (activeTab === 3) params.direction = 'outbound'

      const response = await getChats(session.accessToken, params)
      const newChats = response.data || []

      if (page === 1) {
        setChats(newChats)
      } else {
        setChats(prev => [...prev, ...newChats])
      }

      setHasMoreChats(newChats.length >= 50)
      setChatPage(page)
    } catch (error) {
      if (error.status === 401) {
        signOut({ callbackUrl: '/login' })
        return
      }
      console.error('Failed to fetch chats:', error)
    } finally {
      if (!silent) setLoadingChats(false)
    }
  }, [session?.accessToken, searchQuery, activeTab])

  const fetchMessages = useCallback(async (phoneNumber, page = 1) => {
    if (!session?.accessToken || !phoneNumber) return
    setLoadingMessages(true)

    try {
      const response = await getChatMessages(session.accessToken, phoneNumber, { page, limit: 100 })
      const newMsgs = response.data || []

      if (page === 1) {
        setMessages(newMsgs)
      } else {
        setMessages(prev => [...newMsgs, ...prev])
      }

      setHasMoreMessages(newMsgs.length >= 100)
      setMsgPage(page)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }, [session?.accessToken])

  const fetchTemplates = useCallback(async () => {
    if (!session?.accessToken) return
    try {
      const response = await listTemplates(session.accessToken, { status: 'APPROVED' })
      setTemplates(response.data || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }, [session?.accessToken])

  const fetchStats = useCallback(async () => {
    if (!session?.accessToken) return
    try {
      const response = await getChatStats(session.accessToken)
      setStats(response.data || {})
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (session?.accessToken) {
      fetchChats(1)
      fetchTemplates()
      fetchStats()
    }
  }, [session?.accessToken, fetchChats, fetchTemplates, fetchStats])

  useEffect(() => {
    if (session?.accessToken) fetchChats(1)
  }, [activeTab, searchQuery, session?.accessToken, fetchChats])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages.length, scrollToBottom])

  // ============================================================
  // Event Handlers
  // ============================================================
  const handleSelectChat = async (chat) => {
    setSelectedChat(chat)
    setMessages([])
    setMsgPage(1)
    await fetchMessages(chat.phone_number, 1)

    if (chat.unread_count > 0) {
      try {
        await markChatAsRead(session.accessToken, chat.phone_number)
        setChats(prev => prev.map(c =>
          c.id === chat.id ? { ...c, unread_count: 0 } : c
        ))
        fetchStats()
      } catch (e) {
        console.error('Failed to mark as read:', e)
      }
    }
  }

  const handleSendMessage = async () => {
    if (!session?.accessToken || !selectedChat || !messageText.trim()) return

    try {
      setSendingMessage(true)
      const response = await sendChatMessage(session.accessToken, selectedChat.phone_number, {
        type: 'text',
        text: messageText.trim()
      })

      setMessages(prev => [...prev, {
        id: Date.now(),
        phone_number: selectedChat.phone_number,
        direction: 'outbound',
        message_type: 'text',
        content: { text: messageText.trim() },
        status: 'sent',
        whatsapp_message_id: response.data?.whatsappMessageId,
        created_at: new Date().toISOString()
      }])

      setMessageText('')
      scrollToBottom()

      setChats(prev => prev.map(c =>
        c.id === selectedChat.id
          ? { ...c, last_message: messageText.trim(), last_message_at: new Date().toISOString(), direction: 'outbound', status: 'sent' }
          : c
      ))
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to send message', severity: 'error' })
    } finally {
      setSendingMessage(false)
    }
  }

  const handleSendTemplate = async () => {
    if (!session?.accessToken || !selectedChat || !selectedTemplate) return

    try {
      setSendingMessage(true)
      const template = templates.find(t => t.uuid === selectedTemplate || t.id === selectedTemplate)

      await sendChatMessage(session.accessToken, selectedChat.phone_number, {
        type: 'template',
        templateName: template.name,
        language: template.language || 'en_US',
        components: []
      })

      setSnackbar({ open: true, message: 'Template message sent', severity: 'success' })
      setTemplateDialog(false)
      setSelectedTemplate('')
      await fetchMessages(selectedChat.phone_number, 1)
      scrollToBottom()
      fetchChats(1, true)
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to send template', severity: 'error' })
    } finally {
      setSendingMessage(false)
    }
  }

  const handleCloseChat = async () => {
    if (!session?.accessToken || !selectedChat) return

    try {
      await closeChat(session.accessToken, selectedChat.phone_number)
      setSnackbar({ open: true, message: 'Chat archived', severity: 'success' })
      setSelectedChat(null)
      setMessages([])
      fetchChats(1)
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to close chat', severity: 'error' })
    }
  }

  // ============================================================
  // Computed values
  // ============================================================
  const filteredChats = useMemo(() => {
    let result = chats
    if (activeTab === 1) result = result.filter(c => c.unread_count > 0)
    return result
  }, [chats, activeTab])

  const groupedMessages = useMemo(() => {
    const groups = []
    let lastDate = ''
    messages.forEach(msg => {
      const msgDate = new Date(msg.created_at).toDateString()
      if (msgDate !== lastDate) {
        groups.push({ type: 'date', date: msg.created_at })
        lastDate = msgDate
      }
      groups.push({ type: 'message', ...msg })
    })
    return groups
  }, [messages])

  if (authStatus === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <Grid container spacing={0} sx={{ height: 'calc(100vh - 170px)', minHeight: 500 }}>
        {/* ============================== LEFT: Chat List ============================== */}
        <Grid item xs={12} md={4} lg={3.5}>
          <Card sx={{ height: '100%', borderRadius: '12px 0 0 12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ p: 2, pb: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" fontWeight={700}>Inbox</Typography>
                {stats.total_unread > 0 && (
                  <Chip size="small" label={`${stats.total_unread} unread`} color="primary" sx={{ fontWeight: 600 }} />
                )}
              </Box>
              <TextField
                size="small"
                fullWidth
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <i className="ri-search-line" style={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  ),
                  ...(searchQuery && {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                          <i className="ri-close-line" />
                        </IconButton>
                      </InputAdornment>
                    )
                  })
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>

            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons={false}
              sx={{ minHeight: 36, px: 1, '& .MuiTab-root': { minHeight: 36, py: 0, textTransform: 'none', fontSize: '0.8rem' } }}
            >
              <Tab label="All" />
              <Tab label={
                <Box display="flex" alignItems="center" gap={0.5}>
                  Unread
                  {stats.total_unread > 0 && (
                    <Badge badgeContent={stats.total_unread} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }} />
                  )}
                </Box>
              } />
              <Tab label="Inbound" />
              <Tab label="Outbound" />
            </Tabs>
            <Divider />

            <Box ref={chatListRef} sx={{ flex: 1, overflow: 'auto' }}>
              {loadingChats ? (
                <Box p={2}>
                  {[...Array(6)].map((_, i) => (
                    <Box key={i} display="flex" gap={2} mb={2} alignItems="center">
                      <Skeleton variant="circular" width={44} height={44} />
                      <Box flex={1}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="80%" />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : filteredChats.length === 0 ? (
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6}>
                  <i className="ri-chat-3-line" style={{ fontSize: 48, color: theme.palette.text.disabled }} />
                  <Typography color="textSecondary" sx={{ mt: 1 }}>
                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                  </Typography>
                  <Typography variant="caption" color="textDisabled">
                    {searchQuery ? 'Try a different search' : 'Incoming messages will appear here'}
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {filteredChats.map((chat) => {
                    const isSelected = selectedChat?.id === chat.id
                    const hasUnread = chat.unread_count > 0
                    return (
                      <ListItemButton
                        key={chat.id}
                        selected={isSelected}
                        onClick={() => handleSelectChat(chat)}
                        sx={{
                          py: 1.5, px: 2,
                          ...(isSelected && { bgcolor: alpha(theme.palette.primary.main, 0.08), borderLeft: `3px solid ${theme.palette.primary.main}` }),
                          ...(hasUnread && !isSelected && { bgcolor: alpha(theme.palette.primary.main, 0.03) }),
                          '&:hover': { bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.action.hover, 0.04) }
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 52 }}>
                          <Badge badgeContent={chat.unread_count || 0} color="primary" invisible={!hasUnread} max={99}>
                            <Avatar sx={{ width: 44, height: 44, bgcolor: isSelected ? theme.palette.primary.main : theme.palette.grey[300], color: isSelected ? '#fff' : theme.palette.text.primary, fontWeight: 600 }}>
                              {(chat.contact_name || chat.phone_number || '?')[0].toUpperCase()}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" fontWeight={hasUnread ? 700 : 500} noWrap sx={{ maxWidth: '60%' }}>
                                {chat.contact_name || chat.phone_number}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                                {formatRelativeTime(chat.last_message_at)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box display="flex" alignItems="center" gap={0.5}>
                              {chat.direction === 'outbound' && <StatusIcon status={chat.status} />}
                              <Typography variant="caption" color={hasUnread ? 'text.primary' : 'text.secondary'} fontWeight={hasUnread ? 600 : 400} noWrap component="span" sx={{ flex: 1 }}>
                                {chat.last_message || (chat.last_message_type === 'template' ? '📋 Template' : 'No messages')}
                              </Typography>
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItemButton>
                    )
                  })}
                  {hasMoreChats && filteredChats.length >= 50 && (
                    <Box textAlign="center" py={2}>
                      <Button size="small" onClick={() => fetchChats(chatPage + 1)} startIcon={<i className="ri-arrow-down-line" />}>Load more</Button>
                    </Box>
                  )}
                </List>
              )}
            </Box>
          </Card>
        </Grid>

        {/* ============================== RIGHT: Messages ============================== */}
        <Grid item xs={12} md={8} lg={8.5}>
          <Card sx={{ height: '100%', borderRadius: '0 12px 12px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2, bgcolor: theme.palette.background.paper }}>
                  <IconButton size="small" onClick={() => { setSelectedChat(null); setMessages([]) }} sx={{ display: { xs: 'flex', md: 'none' } }}>
                    <i className="ri-arrow-left-line" />
                  </IconButton>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: theme.palette.primary.main, fontWeight: 600 }}>
                    {(selectedChat.contact_name || selectedChat.phone_number || '?')[0].toUpperCase()}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {selectedChat.contact_name || selectedChat.phone_number}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      {selectedChat.phone_number}
                      {selectedChat.status && (
                        <Chip
                          size="small"
                          label={selectedChat.status}
                          sx={{ height: 18, fontSize: '0.65rem', ml: 0.5, bgcolor: selectedChat.status === 'read' ? alpha('#4caf50', 0.1) : selectedChat.status === 'delivered' ? alpha('#2196f3', 0.1) : alpha(theme.palette.grey[500], 0.1) }}
                        />
                      )}
                    </Typography>
                  </Box>
                  <Tooltip title="Send Template">
                    <IconButton size="small" onClick={() => setTemplateDialog(true)}>
                      <i className="ri-file-list-2-line" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Archive Chat">
                    <IconButton size="small" onClick={handleCloseChat}>
                      <i className="ri-archive-line" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Messages Area */}
                <Box sx={{
                  flex: 1, overflow: 'auto', px: 2, py: 1,
                  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.5) : '#f0f2f5',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}>
                  {loadingMessages ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <CircularProgress size={32} />
                    </Box>
                  ) : groupedMessages.length === 0 ? (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%">
                      <i className="ri-message-3-line" style={{ fontSize: 48, color: theme.palette.text.disabled }} />
                      <Typography color="textSecondary" sx={{ mt: 1 }}>No messages yet</Typography>
                      <Typography variant="caption" color="textDisabled">Send a template to start the conversation</Typography>
                    </Box>
                  ) : (
                    <>
                      {hasMoreMessages && messages.length >= 100 && (
                        <Box textAlign="center" py={1}>
                          <Button size="small" onClick={() => fetchMessages(selectedChat.phone_number, msgPage + 1)}>Load older messages</Button>
                        </Box>
                      )}
                      {groupedMessages.map((item, index) => {
                        if (item.type === 'date') {
                          return (
                            <Box key={`date-${index}`} display="flex" justifyContent="center" my={2}>
                              <Chip size="small" label={formatDateSeparator(item.date)} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9), fontSize: '0.7rem', fontWeight: 500, height: 24 }} />
                            </Box>
                          )
                        }
                        const isOutbound = item.direction === 'outbound'
                        const display = getMessageDisplay(item)
                        return (
                          <Box key={item.id || `msg-${index}`} sx={{ display: 'flex', justifyContent: isOutbound ? 'flex-end' : 'flex-start', mb: 0.5, px: 1 }}>
                            <Paper elevation={0} sx={{
                              p: 1, px: 1.5, maxWidth: '70%', minWidth: 80,
                              bgcolor: isOutbound ? (theme.palette.mode === 'dark' ? '#005c4b' : '#d9fdd3') : theme.palette.background.paper,
                              borderRadius: 2, borderTopRightRadius: isOutbound ? 4 : undefined, borderTopLeftRadius: !isOutbound ? 4 : undefined
                            }}>
                              {item.message_type === 'template' && (
                                <Chip size="small" label="Template" sx={{ height: 18, fontSize: '0.6rem', mb: 0.5, bgcolor: alpha(theme.palette.info.main, 0.1) }} />
                              )}
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: theme.palette.text.primary, lineHeight: 1.4 }}>
                                {display.text}
                              </Typography>
                              <Box display="flex" justifyContent="flex-end" alignItems="center" gap={0.5} mt={0.25}>
                                <Typography variant="caption" sx={{ opacity: 0.55, fontSize: '0.65rem' }}>
                                  {formatMessageTime(item.created_at)}
                                </Typography>
                                {isOutbound && <StatusIcon status={item.status} />}
                              </Box>
                            </Paper>
                          </Box>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </Box>

                {/* Message Input */}
                <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
                  <Box display="flex" gap={1} alignItems="flex-end">
                    <Tooltip title="Send Template">
                      <IconButton size="small" onClick={() => setTemplateDialog(true)} sx={{ mb: 0.5 }}>
                        <i className="ri-file-list-2-line" />
                      </IconButton>
                    </Tooltip>
                    <TextField
                      fullWidth size="small" multiline maxRows={4}
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.5) : '#f0f2f5' } }}
                    />
                    <IconButton
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !messageText.trim()}
                      sx={{ mb: 0.5, bgcolor: theme.palette.primary.main, color: '#fff', '&:hover': { bgcolor: theme.palette.primary.dark }, '&:disabled': { bgcolor: theme.palette.action.disabledBackground, color: theme.palette.action.disabled }, width: 40, height: 40 }}
                    >
                      {sendingMessage ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <i className="ri-send-plane-fill" />}
                    </IconButton>
                  </Box>
                </Box>
              </>
            ) : (
              <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%" sx={{ bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.5) : '#f0f2f5' }}>
                <Box textAlign="center" p={4}>
                  <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                    <i className="ri-chat-3-line" style={{ fontSize: 36, color: theme.palette.primary.main }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>WhatsApp Inbox</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 320, mx: 'auto' }}>
                    Select a conversation from the left to view messages and reply. New incoming messages will appear automatically.
                  </Typography>
                  <Box mt={3} display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight={700} color="primary">{stats.total_chats || 0}</Typography>
                      <Typography variant="caption" color="textSecondary">Total Chats</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight={700} color="warning.main">{stats.unread_chats || 0}</Typography>
                      <Typography variant="caption" color="textSecondary">Unread</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight={700} color="success.main">{stats.open_chats || 0}</Typography>
                      <Typography variant="caption" color="textSecondary">Open</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Template Dialog */}
      <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <i className="ri-file-list-2-line" />
            Send Template Message
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Send a pre-approved WhatsApp template to <strong>{selectedChat?.contact_name || selectedChat?.phone_number}</strong>.
            Templates are required for the first message or after 24h of inactivity.
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select Template</InputLabel>
            <Select value={selectedTemplate} label="Select Template" onChange={(e) => setSelectedTemplate(e.target.value)}>
              {templates.length === 0 && <MenuItem disabled>No approved templates found</MenuItem>}
              {templates.map((template) => (
                <MenuItem key={template.uuid || template.id} value={template.uuid || template.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>{template.name}</Typography>
                    <Typography variant="caption" color="textSecondary">{template.category} • {template.language}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedTemplate && (
            <Alert severity="info" sx={{ mt: 2 }}>
              The template will be sent with default parameters. Variable substitution is handled by campaign execution.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setTemplateDialog(false); setSelectedTemplate('') }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSendTemplate}
            disabled={sendingMessage || !selectedTemplate}
            startIcon={sendingMessage ? <CircularProgress size={16} /> : <i className="ri-send-plane-fill" />}
          >
            Send Template
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
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default Inbox
