'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
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
import RadioGroup from '@mui/material/RadioGroup'
import Radio from '@mui/material/Radio'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'

const ACCEPTED_TYPES = {
  image: '.jpg,.png',
  video: '.mp4,.3gp',
  audio: '.aac,.mp3,.amr,.m4a',
  document: '.pdf,.txt,.xls,.xlsx,.doc,.docx,.ppt,.pptx'
}

const URL_REGEX = /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/\S*)?$/

const ButtonsNode = ({ id, data }) => {
  const { setNodes, getNodes, getEdges, setEdges } = useReactFlow()
  const { data: session } = useSession()
  const fields = data?.metadata?.fields || {}
  const title = data?.label || 'Interactive Buttons'
  const flowUuid = data?.flowUuid || ''

  const headerType = fields.headerType || 'none'
  const headerText = fields.headerText || ''
  const headerMedia = fields.headerMedia || []
  const body = fields.body || ''
  const footer = fields.footer || ''
  const buttonType = fields.buttonType || 'buttons'
  const buttons = fields.buttons || { button1: '', button2: '', button3: '' }
  const ctaUrlButton = fields.ctaUrlButton || { displayText: '', url: '' }

  const [menuAnchor, setMenuAnchor] = useState(null)
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

  const handleButtonTypeChange = (newType) => {
    if (newType === 'cta_url') {
      // Remove edges for button handles a, b, c
      setEdges((eds) => eds.filter((e) => !(e.source === id && ['a', 'b', 'c'].includes(e.sourceHandle))))
    } else {
      // Remove edges for cta handle d
      setEdges((eds) => eds.filter((e) => !(e.source === id && e.sourceHandle === 'd')))
    }
    updateFields({ buttonType: newType })
  }

  const handleButtonTextChange = (key, value) => {
    const newButtons = { ...buttons, [key]: value.slice(0, 20) }
    // If button text cleared, remove its handle edges
    if (!value) {
      const handleId = key === 'button1' ? 'a' : key === 'button2' ? 'b' : 'c'
      setEdges((eds) => eds.filter((e) => !(e.source === id && e.sourceHandle === handleId)))
    }
    updateFields({ buttons: newButtons })
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
      if (result.success) updateFields({ headerMedia: [...headerMedia, result.data] })
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDuplicate = () => {
    setMenuAnchor(null)
    const nodes = getNodes()
    const current = nodes.find(n => n.id === id)
    if (!current) return
    setNodes((nds) => [...nds, {
      ...current, id: `${Date.now()}`,
      position: { x: current.position.x + 50, y: current.position.y + 50 },
      data: { ...JSON.parse(JSON.stringify(current.data)), label: `${title} (copy)` }, selected: false
    }])
  }

  const handleDelete = () => {
    setMenuAnchor(null)
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
  }

  const handleRename = () => { setMenuAnchor(null); setIsRenaming(true); setRenameValue(title) }
  const confirmRename = () => { updateLabel(renameValue || 'Interactive Buttons'); setIsRenaming(false) }

  const showWarning = useMemo(() => {
    if (headerType === 'text' && !headerText) return true
    if (!['none', 'text'].includes(headerType) && headerMedia.length === 0) return true
    if (!body) return true
    if (buttonType === 'buttons' && !buttons.button1 && !buttons.button2 && !buttons.button3) return true
    if (buttonType === 'cta_url' && (!ctaUrlButton.displayText || !ctaUrlButton.url || !URL_REGEX.test(ctaUrlButton.url))) return true
    return false
  }, [headerType, headerText, headerMedia, body, buttonType, buttons, ctaUrlButton])

  return (
    <Box
      sx={{
        bgcolor: 'white',
        border: '2px solid #f59e0b',
        borderRadius: 3,
        minWidth: 320,
        maxWidth: 380,
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
      }}
    >
      <Handle type='target' position={Position.Left} style={{ background: '#f59e0b', width: 10, height: 10 }} />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, pb: 1, borderBottom: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className='ri-radio-button-line' style={{ color: 'white', fontSize: 14 }} />
          </Box>
          {isRenaming ? (
            <TextField size='small' value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              onBlur={confirmRename} onKeyDown={(e) => e.key === 'Enter' && confirmRename()} autoFocus
              sx={{ '& .MuiInputBase-input': { py: 0.5, fontSize: '0.875rem' } }} />
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

      {showWarning && (
        <Box sx={{ bgcolor: '#fef2f2', color: '#dc2626', px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
          Please complete all required fields
        </Box>
      )}

      <Box sx={{ p: 1.5 }}>
        {/* Header Type */}
        <FormControl fullWidth size='small' sx={{ mb: 1 }}>
          <InputLabel>Header Type</InputLabel>
          <Select value={headerType} label='Header Type' onChange={(e) => updateFields({ headerType: e.target.value, headerMedia: [] })}>
            <MenuItem value='none'>None</MenuItem>
            <MenuItem value='text'>Text</MenuItem>
            <MenuItem value='image'>Image</MenuItem>
            <MenuItem value='video'>Video</MenuItem>
            <MenuItem value='audio'>Audio</MenuItem>
            <MenuItem value='document'>Document</MenuItem>
          </Select>
        </FormControl>

        {headerType === 'text' && (
          <TextField fullWidth size='small' label='Header Text' value={headerText}
            onChange={(e) => updateFields({ headerText: e.target.value })} sx={{ mb: 1 }} />
        )}

        {!['none', 'text'].includes(headerType) && (
          <Box sx={{ mb: 1 }}>
            {headerMedia.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {headerMedia.map((m, i) => (
                  <Chip key={i} label={m.original_name || 'File'} size='small'
                    onDelete={() => updateFields({ headerMedia: headerMedia.filter((_, idx) => idx !== i) })}
                    color='warning' variant='outlined' />
                ))}
              </Box>
            ) : (
              <Button variant='outlined' size='small' component='label' fullWidth disabled={uploading}
                startIcon={uploading ? <CircularProgress size={16} /> : <i className='ri-upload-2-line' />}>
                {uploading ? 'Uploading...' : 'Upload Header'}
                <input type='file' hidden accept={ACCEPTED_TYPES[headerType] || '*'} onChange={handleFileUpload} />
              </Button>
            )}
          </Box>
        )}

        {/* Body */}
        <TextField multiline rows={2} fullWidth size='small' label='Body *' placeholder='Message body text'
          value={body} onChange={(e) => updateFields({ body: e.target.value })} sx={{ mb: 1, '& .MuiInputBase-root': { fontSize: '0.85rem' } }} />

        {/* Footer */}
        <TextField fullWidth size='small' label='Footer' placeholder='Optional footer text'
          value={footer} onChange={(e) => updateFields({ footer: e.target.value })} sx={{ mb: 1.5 }} />

        {/* Button Type */}
        <Typography variant='caption' fontWeight='bold' sx={{ mb: 0.5, display: 'block' }}>Button Type</Typography>
        <RadioGroup row value={buttonType} onChange={(e) => handleButtonTypeChange(e.target.value)} sx={{ mb: 1 }}>
          <FormControlLabel value='buttons' control={<Radio size='small' />} label={<Typography variant='caption'>Reply Buttons</Typography>} />
          <FormControlLabel value='cta_url' control={<Radio size='small' />} label={<Typography variant='caption'>CTA URL</Typography>} />
        </RadioGroup>

        {/* Reply Buttons */}
        {buttonType === 'buttons' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {['button1', 'button2', 'button3'].map((key, idx) => (
              <Box key={key} sx={{ position: 'relative' }}>
                <TextField
                  fullWidth size='small'
                  label={`Button ${idx + 1}${idx === 0 ? ' *' : ''}`}
                  value={buttons[key] || ''}
                  onChange={(e) => handleButtonTextChange(key, e.target.value)}
                  inputProps={{ maxLength: 20 }}
                  helperText={`${(buttons[key] || '').length}/20`}
                  FormHelperTextProps={{ sx: { textAlign: 'right', m: 0 } }}
                />
              </Box>
            ))}
          </Box>
        )}

        {/* CTA URL */}
        {buttonType === 'cta_url' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField fullWidth size='small' label='Display Text *'
              value={ctaUrlButton.displayText}
              onChange={(e) => updateFields({ ctaUrlButton: { ...ctaUrlButton, displayText: e.target.value } })} />
            <TextField fullWidth size='small' label='URL *' type='url'
              value={ctaUrlButton.url}
              onChange={(e) => updateFields({ ctaUrlButton: { ...ctaUrlButton, url: e.target.value } })}
              error={ctaUrlButton.url && !URL_REGEX.test(ctaUrlButton.url)}
              helperText={ctaUrlButton.url && !URL_REGEX.test(ctaUrlButton.url) ? 'Invalid URL' : ''} />
          </Box>
        )}
      </Box>

      {/* Source Handles for Reply Buttons */}
      {buttonType === 'buttons' && (
        <>
          {buttons.button1 && (
            <Handle type='source' position={Position.Right} id='a'
              style={{ background: '#f59e0b', width: 10, height: 10, top: '70%' }} />
          )}
          {buttons.button2 && (
            <Handle type='source' position={Position.Right} id='b'
              style={{ background: '#f59e0b', width: 10, height: 10, top: '80%' }} />
          )}
          {buttons.button3 && (
            <Handle type='source' position={Position.Right} id='c'
              style={{ background: '#f59e0b', width: 10, height: 10, top: '90%' }} />
          )}
        </>
      )}

      {/* Source Handle for CTA URL */}
      {buttonType === 'cta_url' && (
        <Handle type='source' position={Position.Right} id='d'
          style={{ background: '#f59e0b', width: 10, height: 10 }} />
      )}
    </Box>
  )
}

export default ButtonsNode
