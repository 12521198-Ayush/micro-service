'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'

import embeddedSignupService from '@/services/embeddedSignupService'

// Industry options matching nyife-dev
const industryOptions = [
  { label: 'Automotive', value: 'AUTO' },
  { label: 'Beauty, spa and salon', value: 'BEAUTY' },
  { label: 'Clothing', value: 'APPAREL' },
  { label: 'Education', value: 'EDU' },
  { label: 'Entertainment', value: 'ENTERTAIN' },
  { label: 'Event planning and service', value: 'EVENT_PLAN' },
  { label: 'Finance and banking', value: 'FINANCE' },
  { label: 'Food and groceries', value: 'GROCERY' },
  { label: 'Public service', value: 'GOVT' },
  { label: 'Hotel and lodging', value: 'HOTEL' },
  { label: 'Medical and health', value: 'HEALTH' },
  { label: 'Charity', value: 'NONPROFIT' },
  { label: 'Professional services', value: 'PROF_SERVICES' },
  { label: 'Shopping and retail', value: 'RETAIL' },
  { label: 'Travel and transportation', value: 'TRAVEL' },
  { label: 'Restaurant', value: 'RESTAURANT' },
  { label: 'Not a business', value: 'NOT_A_BIZ' },
  { label: 'Other', value: 'OTHER' },
]

const WhatsAppSetup = () => {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [signupSession, setSignupSession] = useState(null)
  const [disconnectDialog, setDisconnectDialog] = useState({ open: false, account: null })
  const [activeTab, setActiveTab] = useState(0)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [businessProfile, setBusinessProfile] = useState(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    about: '',
    address: '',
    description: '',
    email: '',
    industry: ''
  })
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [syncingTemplates, setSyncingTemplates] = useState(false)
  const [refreshingData, setRefreshingData] = useState(false)
  const [tokenSynced, setTokenSynced] = useState(false)

  // Sync NextAuth token to localStorage for API calls
  useEffect(() => {
    if (session?.accessToken) {
      localStorage.setItem('token', session.accessToken)
      setTokenSynced(true)
    }
  }, [session?.accessToken])

  // Load connected accounts
  const loadAccounts = useCallback(async () => {
    if (!session?.accessToken || !tokenSynced) return
    
    try {
      setLoading(true)
      const response = await embeddedSignupService.getConnectedAccounts()
      setAccounts(response.data || [])
      if (response.data?.length > 0 && !selectedAccount) {
        setSelectedAccount(response.data[0])
      }
    } catch (err) {
      console.error('Failed to load accounts:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedAccount, session?.accessToken, tokenSynced])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  // Initialize Facebook SDK
  useEffect(() => {
    // Load Facebook SDK
    if (typeof window !== 'undefined' && !window.FB) {
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: process.env.NEXT_PUBLIC_META_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v24.0'
        })
        console.log('Facebook SDK initialized successfully')
      };

      (function (d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0]
        if (d.getElementById(id)) return
        js = d.createElement(s)
        js.id = id
        js.src = 'https://connect.facebook.net/en_US/sdk.js'
        js.async = true
        js.defer = true
        fjs.parentNode.insertBefore(js, fjs)
      }(document, 'script', 'facebook-jssdk'))
    }
  }, [])

  // Session info listener for embedded signup
  const sessionInfoListener = useCallback((event) => {
    if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
      return
    }

    try {
      const data = JSON.parse(event.data)
      if (data.type === 'WA_EMBEDDED_SIGNUP') {
        if (data.event === 'FINISH') {
          const { phone_number_id, waba_id } = data.data
          console.log('Embedded signup completed:', { phone_number_id, waba_id })
        } else {
          const { current_step } = data.data
          console.log('Embedded signup cancelled at step:', current_step)
        }
      }
    } catch {
      // Not a JSON message
    }
  }, [])

  // Start Embedded Signup - Similar to nyife-dev EmbeddedSignupBtn
  const startEmbeddedSignup = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if Facebook SDK is loaded
      if (!window.FB) {
        setError('Facebook SDK is not loaded yet. Please wait a moment and try again.')
        setLoading(false)
        return
      }

      // Add session info listener
      window.addEventListener('message', sessionInfoListener)

      // Initialize signup session to get config
      const initResponse = await embeddedSignupService.initializeSignup()
      const session = initResponse.data
      setSignupSession(session)

      console.log('Starting FB.login with config:', {
        config_id: session.configId,
        appId: session.appId
      })

      // Launch Facebook Login with WhatsApp Embedded Signup
      window.FB.login(
        function(response) {
          console.log('FB.login response:', response)
          if (response.authResponse) {
            const { code } = response.authResponse
            
            // Handle async code exchange separately
            embeddedSignupService.exchangeCode({ code })
              .then((result) => {
                console.log('Exchange code result:', result)
                
                // Set the newly connected account as selected
                if (result.data) {
                  const newAccount = {
                    wabaId: result.data.wabaId,
                    businessName: result.data.businessName,
                    phoneNumberId: result.data.phoneNumberId,
                    displayPhoneNumber: result.data.displayPhoneNumber,
                    verifiedName: result.data.verifiedName,
                    qualityRating: result.data.qualityRating,
                    nameStatus: result.data.nameStatus,
                    messagingLimitTier: result.data.messagingLimitTier,
                    accountReviewStatus: result.data.accountReviewStatus,
                    businessVerificationStatus: result.data.businessVerificationStatus,
                    status: 'ACTIVE'
                  }
                  setAccounts([newAccount])
                  setSelectedAccount(newAccount)
                }
                
                setSuccess(`WhatsApp Business Account "${result.data?.businessName || 'Unknown'}" connected successfully!`)
                setSnackbar({
                  open: true,
                  message: `Connected: ${result.data?.displayPhoneNumber || 'WhatsApp account'}`,
                  severity: 'success'
                })
                loadAccounts()
                setLoading(false)
              })
              .catch((err) => {
                console.error('Exchange code error:', err)
                setError(err.response?.data?.error || err.response?.data?.details || 'Failed to complete WhatsApp setup')
                setLoading(false)
              })
          } else {
            console.log('FB login cancelled or failed:', response)
            setError('Facebook login was cancelled or failed')
            setLoading(false)
          }
        },
        {
          config_id: session.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {},
            featureType: '',
            sessionInfoVersion: 2
          }
        }
      )
    } catch (err) {
      console.error('Embedded signup error:', err)
      setError(err.response?.data?.error || err.message || 'Failed to start embedded signup')
      setLoading(false)
    }
  }

  // Load business profile
  const loadBusinessProfile = async (phoneNumberId) => {
    try {
      const response = await embeddedSignupService.getBusinessProfile(phoneNumberId)
      setBusinessProfile(response.data)
      setProfileForm({
        about: response.data.about || '',
        address: response.data.address || '',
        description: response.data.description || '',
        email: response.data.email || '',
        industry: response.data.industry || ''
      })
    } catch (err) {
      console.error('Failed to load business profile:', err)
    }
  }

  // Update business profile
  const handleUpdateBusinessProfile = async () => {
    try {
      setLoading(true)
      const phoneNumberId = selectedAccount?.phoneNumbers?.[0]?.phoneNumberId
      if (!phoneNumberId) return

      await embeddedSignupService.updateBusinessProfile(phoneNumberId, profileForm)
      setSnackbar({
        open: true,
        message: 'Business profile updated successfully!',
        severity: 'success'
      })
      setProfileDialogOpen(false)
      loadBusinessProfile(phoneNumberId)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update business profile')
    } finally {
      setLoading(false)
    }
  }

  // Refresh WABA data
  const handleRefreshData = async () => {
    if (!selectedAccount) return
    
    try {
      setRefreshingData(true)
      await embeddedSignupService.refreshWabaData(selectedAccount.wabaId)
      setSnackbar({
        open: true,
        message: 'Data refreshed successfully!',
        severity: 'success'
      })
      loadAccounts()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to refresh data')
    } finally {
      setRefreshingData(false)
    }
  }

  // Sync templates
  const handleSyncTemplates = async () => {
    if (!selectedAccount) return
    
    try {
      setSyncingTemplates(true)
      const response = await embeddedSignupService.syncTemplates(selectedAccount.wabaId)
      setSnackbar({
        open: true,
        message: `Templates synced! ${response.data.created} created, ${response.data.updated} updated.`,
        severity: 'success'
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sync templates')
    } finally {
      setSyncingTemplates(false)
    }
  }

  // Disconnect account
  const handleDisconnect = async () => {
    try {
      setLoading(true)
      await embeddedSignupService.disconnectAccount(disconnectDialog.account.wabaId)
      setSnackbar({
        open: true,
        message: 'Account disconnected successfully',
        severity: 'success'
      })
      setDisconnectDialog({ open: false, account: null })
      setSelectedAccount(null)
      loadAccounts()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to disconnect account')
    } finally {
      setLoading(false)
    }
  }

  // Refresh token
  const handleRefreshToken = async (wabaId) => {
    try {
      setLoading(true)
      await embeddedSignupService.refreshToken(wabaId)
      setSnackbar({
        open: true,
        message: 'Access token refreshed successfully',
        severity: 'success'
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to refresh token')
    } finally {
      setLoading(false)
    }
  }

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbar({
        open: true,
        message: 'Copied to clipboard!',
        severity: 'success'
      })
    })
  }

  // Quality rating color
  const getQualityColor = (rating) => {
    switch (rating) {
      case 'GREEN': return 'success'
      case 'YELLOW': return 'warning'
      case 'RED': return 'error'
      default: return 'default'
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'success'
      case 'PENDING': return 'warning'
      case 'REJECTED': return 'error'
      default: return 'default'
    }
  }

  // Show loading while session is loading
  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Error/Success Alerts */}
      {error && (
        <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity='success' sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Setup Card - Show when no accounts connected */}
      {accounts.length === 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              p: 3,
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e8f5e9 100%)',
              borderRadius: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: '#25D366', 
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                }}>
                  <i className='ri-whatsapp-line' style={{ fontSize: '32px', color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant='h5' fontWeight='bold' gutterBottom>
                    Setup WhatsApp Account
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Setup your integration to be able to receive and send messages via WhatsApp.
                  </Typography>
                </Box>
              </Box>
              
              <Button
                variant='contained'
                size='large'
                onClick={startEmbeddedSignup}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color='inherit' /> : (
                  <i className='ri-arrow-right-line' />
                )}
                sx={{ 
                  bgcolor: '#ff5100',
                  '&:hover': { bgcolor: '#e64a00' },
                  px: 4,
                  py: 1.5,
                  boxShadow: '0 4px 12px rgba(255, 81, 0, 0.3)'
                }}
              >
                {loading ? 'Connecting...' : 'Setup WhatsApp'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant='subtitle2' color='text.secondary' gutterBottom>
              What you'll need:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <i className='ri-checkbox-circle-fill' style={{ color: '#25D366', fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary='A Facebook Business Manager account' />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <i className='ri-checkbox-circle-fill' style={{ color: '#25D366', fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary='A phone number not registered on WhatsApp' />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <i className='ri-checkbox-circle-fill' style={{ color: '#25D366', fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary='Access to receive SMS or calls on that number' />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      {/* Connected Account Details */}
      {accounts.length > 0 && selectedAccount && (
        <>
          {/* Connection Status Card */}
          <Card sx={{ mb: 3 }}>
            <Box sx={{ 
              p: 2, 
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              borderBottom: '1px solid #c8e6c9'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    p: 1.5, 
                    bgcolor: '#25D366', 
                    borderRadius: 1.5,
                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.2)'
                  }}>
                    <i className='ri-checkbox-circle-fill' style={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant='h6' fontWeight='bold'>
                      WhatsApp Connected
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Your account is successfully configured
                    </Typography>
                  </Box>
                </Box>
                
                <Button
                  variant='outlined'
                  size='small'
                  onClick={handleRefreshData}
                  disabled={refreshingData}
                  startIcon={refreshingData ? <CircularProgress size={16} /> : <i className='ri-refresh-line' />}
                >
                  {refreshingData ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Box>
            </Box>

            <CardContent>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant='caption' color='text.secondary'>Display Name</Typography>
                    <Typography variant='body2' fontWeight='bold' noWrap>
                      {selectedAccount.phoneNumbers?.[0]?.verifiedName || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                    <Typography variant='caption' color='primary'>Connected Number</Typography>
                    <Typography variant='body2' fontWeight='bold'>
                      {selectedAccount.phoneNumbers?.[0]?.displayPhoneNumber || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#f3e5f5', borderRadius: 2 }}>
                    <Typography variant='caption' color='secondary'>Message Limits</Typography>
                    <Typography variant='body2' fontWeight='bold'>
                      {selectedAccount.phoneNumbers?.[0]?.messagingLimitTier || 'TIER_1K'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 2 }}>
                    <Typography variant='caption' sx={{ color: 'success.main' }}>Number Status</Typography>
                    <Chip 
                      size='small' 
                      label={selectedAccount.phoneNumbers?.[0]?.status || 'CONNECTED'}
                      color='success'
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                    <Typography variant='caption' sx={{ color: 'warning.main' }}>WABA ID</Typography>
                    <Typography variant='body2' fontWeight='bold' noWrap>
                      {selectedAccount.wabaId}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#e8eaf6', borderRadius: 2 }}>
                    <Typography variant='caption' color='text.secondary'>Phone Verification</Typography>
                    <Chip 
                      size='small' 
                      label={selectedAccount.phoneNumbers?.[0]?.codeVerificationStatus || 'VERIFIED'}
                      color='info'
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#fce4ec', borderRadius: 2 }}>
                    <Typography variant='caption' sx={{ color: 'error.light' }}>Quality Rating</Typography>
                    <Chip 
                      size='small' 
                      label={selectedAccount.phoneNumbers?.[0]?.qualityRating || 'GREEN'}
                      color={getQualityColor(selectedAccount.phoneNumbers?.[0]?.qualityRating)}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#e0f7fa', borderRadius: 2 }}>
                    <Typography variant='caption' sx={{ color: 'info.main' }}>Account Status</Typography>
                    <Chip 
                      size='small' 
                      label={selectedAccount.reviewStatus || 'APPROVED'}
                      color={getStatusColor(selectedAccount.reviewStatus)}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Tabs for different sections */}
          <Card sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label='Business Profile' />
              <Tab label='Webhook Settings' />
              <Tab label='Templates' />
              <Tab label='Danger Zone' />
            </Tabs>

            {/* Business Profile Tab */}
            {activeTab === 0 && (
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant='h6' fontWeight='bold'>Business Profile Settings</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Setup the WhatsApp business profile for your number
                    </Typography>
                  </Box>
                  <Button
                    variant='contained'
                    onClick={() => {
                      const phoneNumberId = selectedAccount?.phoneNumbers?.[0]?.phoneNumberId
                      if (phoneNumberId) {
                        loadBusinessProfile(phoneNumberId)
                        setProfileDialogOpen(true)
                      }
                    }}
                    sx={{ bgcolor: '#ff5100', '&:hover': { bgcolor: '#e64a00' } }}
                  >
                    Edit Profile
                  </Button>
                </Box>

                {businessProfile ? (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle2' color='text.secondary'>About</Typography>
                      <Typography variant='body1'>{businessProfile.about || 'Not set'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle2' color='text.secondary'>Email</Typography>
                      <Typography variant='body1'>{businessProfile.email || 'Not set'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle2' color='text.secondary'>Address</Typography>
                      <Typography variant='body1'>{businessProfile.address || 'Not set'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle2' color='text.secondary'>Industry</Typography>
                      <Typography variant='body1'>
                        {industryOptions.find(o => o.value === businessProfile.industry)?.label || businessProfile.industry || 'Not set'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant='subtitle2' color='text.secondary'>Description</Typography>
                      <Typography variant='body1'>{businessProfile.description || 'Not set'}</Typography>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant='body2' color='text.secondary'>
                    Click "Edit Profile" to load and update your business profile
                  </Typography>
                )}
              </CardContent>
            )}

            {/* Webhook Settings Tab */}
            {activeTab === 1 && (
              <CardContent>
                <Typography variant='h6' fontWeight='bold' gutterBottom>
                  Meta Webhook Settings
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                  These webhook settings are automatically configured for your account
                </Typography>

                <Box sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant='subtitle2' fontWeight='bold' gutterBottom>Webhook URL</Typography>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {`${window.location.origin}/webhook/whatsapp/${selectedAccount?.organizationId || 'your-org-id'}`}
                      </Typography>
                    </Box>
                    <Tooltip title='Copy to clipboard'>
                      <IconButton 
                        onClick={() => copyToClipboard(`${window.location.origin}/webhook/whatsapp/${selectedAccount?.organizationId || 'your-org-id'}`)}
                      >
                        <i className='ri-file-copy-line' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant='subtitle2' fontWeight='bold' gutterBottom>Verify Token</Typography>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {`org_${selectedAccount?.organizationId || 'your-org-id'}`}
                      </Typography>
                    </Box>
                    <Tooltip title='Copy to clipboard'>
                      <IconButton 
                        onClick={() => copyToClipboard(`org_${selectedAccount?.organizationId || 'your-org-id'}`)}
                      >
                        <i className='ri-file-copy-line' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            )}

            {/* Templates Tab */}
            {activeTab === 2 && (
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant='h6' fontWeight='bold'>Message Templates</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Sync your approved message templates from Meta
                    </Typography>
                  </Box>
                  <Button
                    variant='contained'
                    onClick={handleSyncTemplates}
                    disabled={syncingTemplates}
                    startIcon={syncingTemplates ? <CircularProgress size={16} color='inherit' /> : <i className='ri-refresh-line' />}
                    sx={{ bgcolor: '#ff5100', '&:hover': { bgcolor: '#e64a00' } }}
                  >
                    {syncingTemplates ? 'Syncing...' : 'Sync Templates'}
                  </Button>
                </Box>

                <Alert severity='info'>
                  Templates are automatically synced when you connect your account. Use the sync button to fetch the latest templates from Meta.
                </Alert>
              </CardContent>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 3 && (
              <CardContent>
                <Box sx={{ 
                  p: 3, 
                  bgcolor: '#ffebee', 
                  borderRadius: 2,
                  border: '1px solid #ffcdd2'
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.5, bgcolor: '#ffcdd2', borderRadius: 2 }}>
                        <i className='ri-delete-bin-line' style={{ color: '#d32f2f', fontSize: 24 }} />
                      </Box>
                      <Box>
                        <Typography variant='h6' fontWeight='bold' color='error.dark'>
                          Remove WhatsApp Account
                        </Typography>
                        <Typography variant='body2' color='error.light'>
                          This will completely delete your WhatsApp integration. Your contacts & messages will be unaffected.
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant='contained'
                      color='error'
                      onClick={() => setDisconnectDialog({ open: true, account: selectedAccount })}
                    >
                      Delete Integration
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Button
                    variant='outlined'
                    onClick={() => handleRefreshToken(selectedAccount.wabaId)}
                    disabled={loading}
                    startIcon={<i className='ri-key-line' />}
                  >
                    Refresh Access Token
                  </Button>
                </Box>
              </CardContent>
            )}
          </Card>
        </>
      )}

      {/* Business Profile Edit Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Edit Business Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label='About'
              value={profileForm.about}
              onChange={(e) => setProfileForm({ ...profileForm, about: e.target.value })}
              helperText='Brief description shown in your profile (max 139 characters)'
              inputProps={{ maxLength: 139 }}
              fullWidth
            />
            <TextField
              label='Business Email'
              type='email'
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              fullWidth
            />
            <TextField
              label='Business Address'
              value={profileForm.address}
              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label='Industry'
              value={profileForm.industry}
              onChange={(e) => setProfileForm({ ...profileForm, industry: e.target.value })}
              fullWidth
            >
              {industryOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label='Description'
              value={profileForm.description}
              onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
              multiline
              rows={3}
              helperText='Detailed description of your business (max 512 characters)'
              inputProps={{ maxLength: 512 }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
          <Button 
            variant='contained' 
            onClick={handleUpdateBusinessProfile}
            disabled={loading}
            sx={{ bgcolor: '#ff5100', '&:hover': { bgcolor: '#e64a00' } }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialog.open} onClose={() => setDisconnectDialog({ open: false, account: null })}>
        <DialogTitle>Disconnect WhatsApp Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disconnect <strong>{disconnectDialog.account?.businessName}</strong>? 
            You will no longer be able to send or receive WhatsApp messages with this account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialog({ open: false, account: null })}>
            Cancel
          </Button>
          <Button color='error' variant='contained' onClick={handleDisconnect} disabled={loading}>
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default WhatsAppSetup
