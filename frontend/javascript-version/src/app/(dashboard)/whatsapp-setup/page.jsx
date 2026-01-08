'use client'

import { useState, useEffect, useCallback } from 'react'
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

import embeddedSignupService from '@/services/embeddedSignupService'

const WhatsAppSetup = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [signupSession, setSignupSession] = useState(null)
  const [disconnectDialog, setDisconnectDialog] = useState({ open: false, account: null })

  // Load connected accounts
  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await embeddedSignupService.getConnectedAccounts()
      setAccounts(response.data || [])
    } catch (err) {
      console.error('Failed to load accounts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  // Initialize Facebook SDK
  useEffect(() => {
    // Load Facebook SDK
    if (!window.FB) {
      const script = document.createElement('script')
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      document.body.appendChild(script)

      window.fbAsyncInit = function() {
        window.FB.init({
          appId: process.env.NEXT_PUBLIC_META_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v24.0'
        })
      }
    }
  }, [])

  // Start Embedded Signup
  const startEmbeddedSignup = async () => {
    try {
      setLoading(true)
      setError(null)

      // Initialize signup session
      const initResponse = await embeddedSignupService.initializeSignup()
      const session = initResponse.data
      setSignupSession(session)

      // Launch Facebook Login with WhatsApp Embedded Signup
      window.FB.login(
        function(response) {
          if (response.authResponse) {
            handleFacebookCallback(response.authResponse, session.sessionId)
          } else {
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
      setError(err.response?.data?.error || 'Failed to start embedded signup')
      setLoading(false)
    }
  }

  // Handle Facebook OAuth callback
  const handleFacebookCallback = async (authResponse, sessionId) => {
    try {
      const { code } = authResponse

      // Exchange code for token
      await embeddedSignupService.handleCallback({
        code,
        sessionId
      })

      // Listen for message from embedded signup with WABA and Phone details
      window.addEventListener('message', async (event) => {
        if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
          return
        }

        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'WA_EMBEDDED_SIGNUP') {
            const { phone_number_id, waba_id } = data.data
            
            // Complete signup
            await completeSignup(sessionId, waba_id, phone_number_id)
          }
        } catch (e) {
          console.log('Non-JSON message received')
        }
      }, { once: true })

      setSuccess('Facebook authentication successful! Completing WhatsApp setup...')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to handle Facebook callback')
      setLoading(false)
    }
  }

  // Complete signup with WABA details
  const completeSignup = async (sessionId, wabaId, phoneNumberId) => {
    try {
      const response = await embeddedSignupService.completeSignup({
        sessionId,
        wabaId,
        phoneNumberId
      })

      setSuccess('WhatsApp Business Account connected successfully!')
      setLoading(false)
      loadAccounts()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete signup')
      setLoading(false)
    }
  }

  // Disconnect account
  const handleDisconnect = async () => {
    try {
      setLoading(true)
      await embeddedSignupService.disconnectAccount(disconnectDialog.account.wabaId)
      setSuccess('Account disconnected successfully')
      setDisconnectDialog({ open: false, account: null })
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
      setSuccess('Access token refreshed successfully')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to refresh token')
    } finally {
      setLoading(false)
    }
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

  return (
    <Box>
      <Card sx={{ mb: 4 }}>
        <CardHeader 
          title='WhatsApp Business Setup' 
          subheader='Connect your WhatsApp Business Account to start sending messages'
        />
        <CardContent>
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

          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant='h6' gutterBottom>
              Get Started with WhatsApp Business Platform
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              Connect your Facebook Business Manager and WhatsApp Business Account in just a few clicks.
            </Typography>
            
            <Button
              variant='contained'
              size='large'
              onClick={startEmbeddedSignup}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : (
                <i className='ri-whatsapp-line' />
              )}
              sx={{ 
                bgcolor: '#25D366', 
                '&:hover': { bgcolor: '#128C7E' },
                px: 4,
                py: 1.5
              }}
            >
              {loading ? 'Connecting...' : 'Connect WhatsApp Account'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant='subtitle2' color='text.secondary' gutterBottom>
            What you'll need:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <i className='ri-checkbox-circle-line' style={{ color: '#25D366' }} />
              </ListItemIcon>
              <ListItemText primary='A Facebook Business Manager account' />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <i className='ri-checkbox-circle-line' style={{ color: '#25D366' }} />
              </ListItemIcon>
              <ListItemText primary='A phone number not registered on WhatsApp' />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <i className='ri-checkbox-circle-line' style={{ color: '#25D366' }} />
              </ListItemIcon>
              <ListItemText primary='Access to receive SMS or calls on that number' />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader title='Connected Accounts' />
          <CardContent>
            {accounts.map((account) => (
              <Box 
                key={account.wabaId}
                sx={{ 
                  p: 2, 
                  mb: 2, 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant='h6'>{account.businessName}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      WABA ID: {account.wabaId}
                    </Typography>
                  </Box>
                  <Box>
                    <Chip 
                      label={account.reviewStatus} 
                      color={account.reviewStatus === 'APPROVED' ? 'success' : 'warning'}
                      size='small'
                    />
                  </Box>
                </Box>

                {/* Phone Numbers */}
                {account.phoneNumbers?.map((phone) => (
                  <Box 
                    key={phone.phoneNumberId}
                    sx={{ 
                      p: 1.5, 
                      bgcolor: 'background.default',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant='subtitle2'>
                          {phone.displayPhoneNumber}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {phone.verifiedName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip 
                          label={phone.qualityRating} 
                          color={getQualityColor(phone.qualityRating)}
                          size='small'
                        />
                        <Chip 
                          label={phone.status} 
                          color={phone.status === 'CONNECTED' ? 'success' : 'default'}
                          size='small'
                          variant='outlined'
                        />
                      </Box>
                    </Box>
                  </Box>
                ))}

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button 
                    size='small' 
                    variant='outlined'
                    onClick={() => handleRefreshToken(account.wabaId)}
                  >
                    Refresh Token
                  </Button>
                  <Button 
                    size='small' 
                    color='error'
                    onClick={() => setDisconnectDialog({ open: true, account })}
                  >
                    Disconnect
                  </Button>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialog.open} onClose={() => setDisconnectDialog({ open: false, account: null })}>
        <DialogTitle>Disconnect WhatsApp Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disconnect {disconnectDialog.account?.businessName}? 
            You will no longer be able to send or receive WhatsApp messages with this account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialog({ open: false, account: null })}>
            Cancel
          </Button>
          <Button color='error' onClick={handleDisconnect} disabled={loading}>
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default WhatsAppSetup
