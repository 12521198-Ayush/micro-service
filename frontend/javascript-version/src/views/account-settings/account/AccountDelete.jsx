'use client'

// React Imports
import { useState } from 'react'

// Next Auth Imports
import { useSession, signOut } from 'next-auth/react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

// Service Imports
import { deleteAccount } from '@/libs/auth-service'

const AccountDelete = () => {
  // States
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Hooks
  const { data: session } = useSession()

  const handleOpenDialog = () => {
    if (!confirmDelete) return
    setDialogOpen(true)
    setPassword('')
    setError('')
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setPassword('')
    setError('')
  }

  const handleDeleteAccount = async () => {
    if (!password) {
      setError('Please enter your password to confirm')

      return
    }

    setLoading(true)
    setError('')

    try {
      await deleteAccount(session.accessToken, { password })

      // Sign out and redirect to login
      signOut({ callbackUrl: '/login' })
    } catch (err) {
      setError(err.message || 'Failed to delete account. Please check your password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader title='Delete Account' />
        <CardContent className='flex flex-col items-start gap-6'>
          <Alert severity='warning' className='w-full'>
            <strong>Warning:</strong> Once you delete your account, there is no going back. Please be certain.
          </Alert>
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmDelete}
                onChange={e => setConfirmDelete(e.target.checked)}
              />
            }
            label='I confirm my account deactivation'
          />
          <Button
            variant='contained'
            color='error'
            disabled={!confirmDelete}
            onClick={handleOpenDialog}
          >
            Deactivate Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth='sm' fullWidth>
        <DialogTitle>Confirm Account Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText className='mb-4'>
            This action cannot be undone. Please enter your password to confirm account deletion.
          </DialogContentText>
          {error && (
            <Alert severity='error' className='mb-4'>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            type='password'
            label='Password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color='error'
            variant='contained'
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color='inherit' /> : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AccountDelete
