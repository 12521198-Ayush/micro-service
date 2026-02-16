'use client'

import { useState, useCallback, useRef } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'

const VARIABLES = [
  '{first_name}', '{last_name}', '{full_name}',
  '{phone_number}', '{email}', '{city}', '{country}'
]

const MAX_CHARS = 1098

const TextNode = ({ id, data }) => {
  const { setNodes, getNodes, getEdges, setEdges } = useReactFlow()
  const fields = data?.metadata?.fields || {}
  const body = fields.body || ''
  const title = data?.label || 'Text Message'
  const textRef = useRef(null)

  const [menuAnchor, setMenuAnchor] = useState(null)
  const [varAnchor, setVarAnchor] = useState(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(title)

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
    setNodes((nds) =>
      nds.map((node) => node.id === id ? { ...node, data: { ...node.data, label } } : node)
    )
  }, [id, setNodes])

  const handleBodyChange = (e) => {
    const val = e.target.value.slice(0, MAX_CHARS)
    updateFields({ body: val })
  }

  const insertFormat = (wrapper) => {
    const el = textRef.current?.querySelector('textarea')
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = body.substring(start, end)
    const newText = body.substring(0, start) + wrapper + selected + wrapper + body.substring(end)
    if (newText.length <= MAX_CHARS) updateFields({ body: newText })
  }

  const insertVariable = (variable) => {
    if (body.includes(variable)) return
    const el = textRef.current?.querySelector('textarea')
    const pos = el ? el.selectionStart : body.length
    const newText = body.substring(0, pos) + variable + body.substring(pos)
    if (newText.length <= MAX_CHARS) updateFields({ body: newText })
    setVarAnchor(null)
  }

  const handleDuplicate = () => {
    setMenuAnchor(null)
    const nodes = getNodes()
    const current = nodes.find(n => n.id === id)
    if (!current) return
    const newId = `${Date.now()}`
    const newNode = {
      ...current,
      id: newId,
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
    updateLabel(renameValue || 'Text Message')
    setIsRenaming(false)
  }

  const showWarning = !body

  return (
    <Box
      sx={{
        bgcolor: 'white',
        border: '2px solid #3b82f6',
        borderRadius: 3,
        minWidth: 300,
        maxWidth: 340,
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
      }}
    >
      <Handle type='target' position={Position.Left} style={{ background: '#3b82f6', width: 10, height: 10 }} />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, pb: 1, borderBottom: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className='ri-message-2-line' style={{ color: 'white', fontSize: 14 }} />
          </Box>
          {isRenaming ? (
            <TextField
              size='small'
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={confirmRename}
              onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
              autoFocus
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
          Please add message body text
        </Box>
      )}

      {/* Body */}
      <Box sx={{ p: 1.5 }} ref={textRef}>
        <TextField
          multiline
          rows={4}
          fullWidth
          size='small'
          placeholder='Type your message...'
          value={body}
          onChange={handleBodyChange}
          sx={{ '& .MuiInputBase-root': { fontSize: '0.85rem' } }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
          <Typography variant='caption' color='text.secondary'>
            {(body || '').length}/{MAX_CHARS}
          </Typography>
        </Box>

        {/* Formatting Toolbar */}
        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
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
              <MenuItem key={v} onClick={() => insertVariable(v)} disabled={body.includes(v)}>
                <Chip label={v} size='small' variant='outlined' />
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      <Handle type='source' position={Position.Right} style={{ background: '#3b82f6', width: 10, height: 10 }} />
    </Box>
  )
}

export default TextNode
