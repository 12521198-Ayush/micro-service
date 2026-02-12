'use client'

import { useState, useCallback, useRef } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

const VARIABLES = [
  '{first_name}', '{last_name}', '{full_name}',
  '{phone_number}', '{email}', '{city}', '{country}'
]

const MAX_CHARS = 1098

const ACCEPTED_TYPES = {
  image: '.jpg,.png',
  video: '.mp4,.3gp',
  audio: '.aac,.mp3,.amr,.m4a',
  document: '.pdf,.txt,.xls,.xlsx,.doc,.docx,.ppt,.pptx'
}

const MediaNode = ({ id, data }) => {
  const { setNodes, getNodes, getEdges, setEdges } = useReactFlow()
  const { data: session } = useSession()
  const fields = data?.metadata?.fields || {}
  const mediaType = fields.mediaType || ''
  const caption = fields.caption || ''
  const media = fields.media || []
  const title = data?.label || 'Media Message'
  const flowUuid = data?.flowUuid || ''
  const textRef = useRef(null)

  const [menuAnchor, setMenuAnchor] = useState(null)
  const [varAnchor, setVarAnchor] = useState(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(title)
  const [uploading, setUploading] = useState(false)

  const updateFields = useCallback((updates) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              metadata: {
                ...node.data.metadata,
                fields: { ...node.data.metadata.fields, ...updates }
              }
            }
          }
        }
        return node
      })
    )
  }, [id, setNodes])

  const updateLabel = useCallback((label) => {
    setNodes((nds) => nds.map((node) => node.id === id ? { ...node, data: { ...node.data, label } } : node))
  }, [id, setNodes])

  const handleCaptionChange = (e) => {
    const val = e.target.value.slice(0, MAX_CHARS)
    updateFields({ caption: val })
  }

  const insertFormat = (wrapper) => {
    const el = textRef.current?.querySelector('textarea')
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = caption.substring(start, end)
    const newText = caption.substring(0, start) + wrapper + selected + wrapper + caption.substring(end)
    if (newText.length <= MAX_CHARS) updateFields({ caption: newText })
  }

  const insertVariable = (variable) => {
    if (caption.includes(variable)) return
    const el = textRef.current?.querySelector('textarea')
    const pos = el ? el.selectionStart : caption.length
    const newText = caption.substring(0, pos) + variable + caption.substring(pos)
    if (newText.length <= MAX_CHARS) updateFields({ caption: newText })
    setVarAnchor(null)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !flowUuid) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('step_id', id)

      const token = session?.accessToken
      const baseUrl = process.env.NEXT_PUBLIC_AUTOMATION_SERVICE_URL || ''
      const res = await fetch(`${baseUrl}/api/flows/${flowUuid}/upload-media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const result = await res.json()
      if (result.success) {
        updateFields({ media: [...media, result.data] })
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const removeMedia = (index) => {
    updateFields({ media: media.filter((_, i) => i !== index) })
  }

  const handleDuplicate = () => {
    setMenuAnchor(null)
    const nodes = getNodes()
    const current = nodes.find(n => n.id === id)
    if (!current) return
    const newNode = {
      ...current,
      id: `${Date.now()}`,
      position: { x: current.position.x + 50, y: current.position.y + 50 },
      data: { ...JSON.parse(JSON.stringify(current.data)), label: `${title} (copy)` },
      selected: false
    }
    setNodes((nds) => [...nds, newNode])
  }

  const handleDelete = () => {
    setMenuAnchor(null)
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
  }

  const handleRename = () => {
    setMenuAnchor(null)
    setIsRenaming(true)
    setRenameValue(title)
  }

  const confirmRename = () => {
    updateLabel(renameValue || 'Media Message')
    setIsRenaming(false)
  }

  const showWarning = !mediaType || media.length === 0

  return (
    <Box
      sx={{
        bgcolor: 'white',
        border: '2px solid #8b5cf6',
        borderRadius: 3,
        minWidth: 300,
        maxWidth: 340,
        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)'
      }}
    >
      <Handle type='target' position={Position.Left} style={{ background: '#8b5cf6', width: 10, height: 10 }} />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, pb: 1, borderBottom: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className='ri-image-line' style={{ color: 'white', fontSize: 14 }} />
          </Box>
          {isRenaming ? (
            <TextField
              size='small' value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              onBlur={confirmRename} onKeyDown={(e) => e.key === 'Enter' && confirmRename()} autoFocus
              sx={{ '& .MuiInputBase-input': { py: 0.5, fontSize: '0.875rem' } }}
            />
          ) : (
            <Typography variant='subtitle2' fontWeight='bold' noWrap sx={{ maxWidth: 180 }}>{title}</Typography>
          )}
        </Box>
        <IconButton size='small' onClick={(e) => setMenuAnchor(e.currentTarget)}>
          <i className='ri-more-2-fill' style={{ fontSize: 18 }} />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={handleDuplicate}>Duplicate</MenuItem>
          <MenuItem onClick={handleRename}>Rename</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>Delete</MenuItem>
        </Menu>
      </Box>

      {/* Warning */}
      {showWarning && (
        <Box sx={{ bgcolor: '#fef2f2', color: '#dc2626', px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
          Please select a media type and upload a file
        </Box>
      )}

      <Box sx={{ p: 1.5 }}>
        {/* Media Type */}
        <FormControl fullWidth size='small' sx={{ mb: 1.5 }}>
          <InputLabel>Media Type</InputLabel>
          <Select
            value={mediaType}
            label='Media Type'
            onChange={(e) => updateFields({ mediaType: e.target.value, media: [] })}
          >
            <MenuItem value='image'>Image</MenuItem>
            <MenuItem value='video'>Video</MenuItem>
            <MenuItem value='audio'>Audio</MenuItem>
            <MenuItem value='document'>Document</MenuItem>
          </Select>
        </FormControl>

        {/* File Upload */}
        {mediaType && (
          <Box sx={{ mb: 1.5 }}>
            {media.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {media.map((m, i) => (
                  <Chip
                    key={i}
                    label={m.original_name || m.path || 'File'}
                    size='small'
                    onDelete={() => removeMedia(i)}
                    color='secondary'
                    variant='outlined'
                  />
                ))}
              </Box>
            ) : (
              <Button
                variant='outlined'
                size='small'
                component='label'
                fullWidth
                disabled={uploading}
                startIcon={uploading ? <CircularProgress size={16} /> : <i className='ri-upload-2-line' />}
              >
                {uploading ? 'Uploading...' : 'Upload File'}
                <input
                  type='file'
                  hidden
                  accept={ACCEPTED_TYPES[mediaType] || '*'}
                  onChange={handleFileUpload}
                />
              </Button>
            )}
          </Box>
        )}

        {/* Caption */}
        <Box ref={textRef}>
          <TextField
            multiline
            rows={2}
            fullWidth
            size='small'
            placeholder='Caption (optional)'
            value={caption}
            onChange={handleCaptionChange}
            sx={{ '& .MuiInputBase-root': { fontSize: '0.85rem' } }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant='caption' color='text.secondary'>
              {(caption || '').length}/{MAX_CHARS}
            </Typography>
          </Box>

          {/* Toolbar */}
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            <Tooltip title='Bold'><IconButton size='small' onClick={() => insertFormat('*')}><b>B</b></IconButton></Tooltip>
            <Tooltip title='Italic'><IconButton size='small' onClick={() => insertFormat('_')}><i>I</i></IconButton></Tooltip>
            <Tooltip title='Strikethrough'><IconButton size='small' onClick={() => insertFormat('~')}><s>S</s></IconButton></Tooltip>
            <Tooltip title='Monospace'><IconButton size='small' onClick={() => insertFormat('```')}>{'</>'}</IconButton></Tooltip>
            <Tooltip title='Insert Variable'>
              <IconButton size='small' onClick={(e) => setVarAnchor(e.currentTarget)}>
                <i className='ri-braces-line' style={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={varAnchor} open={Boolean(varAnchor)} onClose={() => setVarAnchor(null)}>
              {VARIABLES.map((v) => (
                <MenuItem key={v} onClick={() => insertVariable(v)} disabled={caption.includes(v)}>
                  <Chip label={v} size='small' variant='outlined' />
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>
      </Box>

      <Handle type='source' position={Position.Right} style={{ background: '#8b5cf6', width: 10, height: 10 }} />
    </Box>
  )
}

export default MediaNode
