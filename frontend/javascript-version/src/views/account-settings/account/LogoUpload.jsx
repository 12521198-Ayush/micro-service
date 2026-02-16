'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'

const LogoUpload = () => {
  const [imgSrc, setImgSrc] = useState('/images/logos/image.png')
  const [file, setFile] = useState(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileChange = e => {
    const file = e.target.files[0]

    if (!file) {
      return
    }

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Only PNG and JPG files are allowed.')

      return
    }

    if (file.size > 1024 * 1024) {
      setError('File size must be less than 1MB.')

      return
    }

    setFile(file)
    setImgSrc(URL.createObjectURL(file))
    setError('')
  }

  const handleUpload = async () => {
    if (!file) {
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      // This requires an API route to handle file upload to /public/images/logos/
      const formData = new FormData()

      formData.append('logo', file)

      const res = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        throw new Error('Upload failed')
      }

      setSuccess('Logo uploaded successfully!')
    } catch (err) {
      setError('Failed to upload logo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className='mb-6'>
      <CardHeader title='Upload Logo (PNG or JPG)' />
      <CardContent>
        <div className='flex items-center gap-6'>
          <img height={64} width={64} className='rounded' src={imgSrc} alt='Logo Preview' />
          <div className='flex flex-col gap-2'>
            <Button component='label' variant='contained' size='small'>
              Choose File
              <input hidden type='file' accept='image/png, image/jpeg' onChange={handleFileChange} />
            </Button>
            <Button variant='contained' size='small' color='success' disabled={!file || uploading} onClick={handleUpload}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Typography variant='body2'>Allowed PNG or JPG. Max size 1MB.</Typography>
            {error && <Alert severity='error'>{error}</Alert>}
            {success && <Alert severity='success'>{success}</Alert>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default LogoUpload
