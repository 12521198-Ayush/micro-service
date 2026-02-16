'use client'

// React Imports
import { useState, useEffect } from 'react'

// Next Auth Imports
import { useSession, signOut } from 'next-auth/react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'

// Service Imports
import { getProfile, updateProfile } from '@/libs/auth-service'
import { saveOrganizationDetails } from '@/libs/user-service'

const AccountDetails = () => {
  // States
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fileInput, setFileInput] = useState('')
  const [imgSrc, setImgSrc] = useState('/images/avatars/1.png')

  // Profile form data
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  })

  // Organization form data
  const [orgData, setOrgData] = useState({
    organizationName: '',
    physicalAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  })

  // Hooks
  const { data: session, update: updateSession } = useSession()

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.accessToken) return

      try {
        const response = await getProfile(session.accessToken)

        // Set profile data
        setProfileData({
          name: response.user?.name || '',
          email: response.user?.email || ''
        })

        // Set organization data
        if (response.organization) {
          setOrgData({
            organizationName: response.organization.organizationName || '',
            physicalAddress: response.organization.physicalAddress || '',
            city: response.organization.city || '',
            state: response.organization.state || '',
            zipCode: response.organization.zipCode || '',
            country: response.organization.country || ''
          })
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)

        if (err.status === 401 || err.status === 403) {
          signOut({ callbackUrl: '/login' })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [session?.accessToken])

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const handleOrgChange = (field, value) => {
    setOrgData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileInputChange = file => {
    const reader = new FileReader()
    const { files } = file.target

    if (files && files.length !== 0) {
      reader.onload = () => setImgSrc(reader.result)
      reader.readAsDataURL(files[0])

      if (reader.result !== null) {
        setFileInput(reader.result)
      }
    }
  }

  const handleFileInputReset = () => {
    setFileInput('')
    setImgSrc('/images/avatars/1.png')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      // Update profile
      const profileResponse = await updateProfile(session.accessToken, profileData)

      // Update session with new token if provided
      if (profileResponse.token) {
        await updateSession({
          accessToken: profileResponse.token,
          name: profileData.name,
          email: profileData.email
        })
      }

      // Update organization details
      if (orgData.organizationName) {
        await saveOrganizationDetails(session.accessToken, orgData)
      }

      setSuccess('Profile updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update profile')

      if (err.status === 401 || err.status === 403) {
        signOut({ callbackUrl: '/login' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant='rectangular' height={100} className='mb-4' />
          <Skeleton variant='text' height={56} className='mb-2' />
          <Skeleton variant='text' height={56} className='mb-2' />
          <Skeleton variant='text' height={56} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader title='Account Details' />
      <CardContent className='mbe-5'>
        <div className='flex max-sm:flex-col items-center gap-6'>
          <img height={100} width={100} className='rounded' src={imgSrc} alt='Profile' />
          <div className='flex flex-grow flex-col gap-4'>
            <div className='flex flex-col sm:flex-row gap-4'>
              <Button component='label' size='small' variant='contained' htmlFor='account-settings-upload-image'>
                Upload New Photo
                <input
                  hidden
                  type='file'
                  value={fileInput}
                  accept='image/png, image/jpeg'
                  onChange={handleFileInputChange}
                  id='account-settings-upload-image'
                />
              </Button>
              <Button size='small' variant='outlined' color='error' onClick={handleFileInputReset}>
                Reset
              </Button>
            </div>
            <Typography>Allowed JPG, GIF or PNG. Max size of 800K</Typography>
          </div>
        </div>
      </CardContent>
      <CardContent>
        {error && (
          <Alert severity='error' className='mb-4' onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity='success' className='mb-4' onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={5}>
            <Grid item xs={12}>
              <Typography variant='h6' className='mb-2'>
                Personal Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Full Name'
                value={profileData.name}
                placeholder='John Doe'
                onChange={e => handleProfileChange('name', e.target.value)}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Email'
                type='email'
                value={profileData.email}
                placeholder='john.doe@example.com'
                onChange={e => handleProfileChange('email', e.target.value)}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant='h6' className='mb-2 mt-4'>
                Organization Details
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Organization Name'
                value={orgData.organizationName}
                placeholder='Your Company'
                onChange={e => handleOrgChange('organizationName', e.target.value)}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Physical Address'
                value={orgData.physicalAddress}
                placeholder='123 Business Street'
                onChange={e => handleOrgChange('physicalAddress', e.target.value)}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='City'
                value={orgData.city}
                placeholder='New York'
                onChange={e => handleOrgChange('city', e.target.value)}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='State'
                value={orgData.state}
                placeholder='New York'
                onChange={e => handleOrgChange('state', e.target.value)}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Zip Code'
                value={orgData.zipCode}
                placeholder='10001'
                onChange={e => handleOrgChange('zipCode', e.target.value)}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Country</InputLabel>
                <Select
                  label='Country'
                  value={orgData.country}
                  onChange={e => handleOrgChange('country', e.target.value)}
                  disabled={saving}
                >
                  <MenuItem value=''>Select Country</MenuItem>
                  <MenuItem value='India'>India</MenuItem>
                  <MenuItem value='USA'>USA</MenuItem>
                  <MenuItem value='UK'>UK</MenuItem>
                  <MenuItem value='Australia'>Australia</MenuItem>
                  <MenuItem value='Germany'>Germany</MenuItem>
                  <MenuItem value='Canada'>Canada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} className='flex gap-4 flex-wrap'>
              <Button variant='contained' type='submit' disabled={saving}>
                {saving ? <CircularProgress size={24} color='inherit' /> : 'Save Changes'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default AccountDetails
