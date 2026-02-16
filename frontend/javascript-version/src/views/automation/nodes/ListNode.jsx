'use client'

import { useState, useCallback, useMemo } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'

const ListNode = ({ id, data }) => {
  const { setNodes, getNodes, getEdges, setEdges } = useReactFlow()
  const fields = data?.metadata?.fields || {}
  const title = data?.label || 'Interactive List'

  const headerType = fields.headerType || 'none'
  const headerText = fields.headerText || ''
  const body = fields.body || ''
  const footer = fields.footer || ''
  const buttonLabel = fields.buttonLabel || ''
  const sections = fields.sections || [{ title: '', rows: [{ id: '', title: '', description: '' }] }]

  const [menuAnchor, setMenuAnchor] = useState(null)
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
    setNodes((nds) => nds.map((node) => node.id === id ? { ...node, data: { ...node.data, label } } : node))
  }, [id, setNodes])

  const updateSection = (sectionIdx, key, value) => {
    const newSections = sections.map((s, i) => i === sectionIdx ? { ...s, [key]: value } : s)
    updateFields({ sections: newSections })
  }

  const updateRow = (sectionIdx, rowIdx, key, value) => {
    const maxLen = key === 'id' ? 200 : key === 'title' ? 24 : key === 'description' ? 72 : Infinity
    const newSections = sections.map((s, si) => {
      if (si !== sectionIdx) return s
      return {
        ...s,
        rows: s.rows.map((r, ri) => ri === rowIdx ? { ...r, [key]: value.slice(0, maxLen) } : r)
      }
    })
    updateFields({ sections: newSections })
  }

  const addSection = () => {
    if (sections.length >= 10) return
    updateFields({
      sections: [...sections, { title: '', rows: [{ id: '', title: '', description: '' }] }]
    })
  }

  const removeSection = (idx) => {
    if (sections.length <= 1) return
    // Remove edges for handles in the removed section
    const removedRows = sections[idx].rows
    removedRows.forEach((_, ri) => {
      const handleId = `a${idx}${ri}`
      setEdges((eds) => eds.filter(e => !(e.source === id && e.sourceHandle === handleId)))
    })
    updateFields({ sections: sections.filter((_, i) => i !== idx) })
  }

  const addRow = (sectionIdx) => {
    if (sections[sectionIdx].rows.length >= 10) return
    const newSections = sections.map((s, i) => {
      if (i !== sectionIdx) return s
      return { ...s, rows: [...s.rows, { id: '', title: '', description: '' }] }
    })
    updateFields({ sections: newSections })
  }

  const removeRow = (sectionIdx, rowIdx) => {
    const section = sections[sectionIdx]
    if (section.rows.length <= 1) return
    const handleId = `a${sectionIdx}${rowIdx}`
    setEdges((eds) => eds.filter(e => !(e.source === id && e.sourceHandle === handleId)))
    const newSections = sections.map((s, si) => {
      if (si !== sectionIdx) return s
      return { ...s, rows: s.rows.filter((_, ri) => ri !== rowIdx) }
    })
    updateFields({ sections: newSections })
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
  const confirmRename = () => { updateLabel(renameValue || 'Interactive List'); setIsRenaming(false) }

  const showWarning = useMemo(() => {
    if (headerType === 'text' && !headerText) return true
    if (!body) return true
    if (!buttonLabel) return true
    if (sections.some(s => !s.title)) return true
    if (sections.some(s => s.rows.some(r => !r.title || !r.id))) return true
    return false
  }, [headerType, headerText, body, buttonLabel, sections])

  // Collect all row handles for positioning
  const allHandles = []
  sections.forEach((section, si) => {
    section.rows.forEach((row, ri) => {
      allHandles.push({ id: `a${si}${ri}`, label: row.title || `Row ${ri + 1}` })
    })
  })

  return (
    <Box
      sx={{
        bgcolor: 'white',
        border: '2px solid #06b6d4',
        borderRadius: 3,
        minWidth: 340,
        maxWidth: 400,
        boxShadow: '0 4px 12px rgba(6, 182, 212, 0.15)'
      }}
    >
      <Handle type='target' position={Position.Left} style={{ background: '#06b6d4', width: 10, height: 10 }} />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, pb: 1, borderBottom: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className='ri-list-check' style={{ color: 'white', fontSize: 14 }} />
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

      <Box sx={{ p: 1.5, maxHeight: 500, overflowY: 'auto' }}>
        {/* Header Type */}
        <FormControl fullWidth size='small' sx={{ mb: 1 }}>
          <InputLabel>Header Type</InputLabel>
          <Select value={headerType} label='Header Type'
            onChange={(e) => updateFields({ headerType: e.target.value })}>
            <MenuItem value='none'>None</MenuItem>
            <MenuItem value='text'>Text</MenuItem>
          </Select>
        </FormControl>

        {headerType === 'text' && (
          <TextField fullWidth size='small' label='Header Text' value={headerText}
            onChange={(e) => updateFields({ headerText: e.target.value })} sx={{ mb: 1 }} />
        )}

        {/* Body */}
        <TextField multiline rows={2} fullWidth size='small' label='Body *' value={body}
          onChange={(e) => updateFields({ body: e.target.value })}
          sx={{ mb: 1, '& .MuiInputBase-root': { fontSize: '0.85rem' } }} />

        {/* Footer */}
        <TextField fullWidth size='small' label='Footer' value={footer}
          onChange={(e) => updateFields({ footer: e.target.value })} sx={{ mb: 1 }} />

        {/* Button Label */}
        <TextField fullWidth size='small' label='Button Label *' value={buttonLabel}
          onChange={(e) => updateFields({ buttonLabel: e.target.value })} sx={{ mb: 1.5 }} />

        {/* Sections */}
        <Divider sx={{ mb: 1 }} />
        <Typography variant='caption' fontWeight='bold' sx={{ mb: 1, display: 'block' }}>
          Sections ({sections.length}/10)
        </Typography>

        {sections.map((section, si) => (
          <Box key={si} sx={{ mb: 1.5, p: 1, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant='caption' fontWeight='bold'>Section {si + 1}</Typography>
              {sections.length > 1 && (
                <IconButton size='small' onClick={() => removeSection(si)} sx={{ color: 'error.main' }}>
                  <i className='ri-delete-bin-line' style={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>

            <TextField fullWidth size='small' label='Section Title *' value={section.title}
              onChange={(e) => updateSection(si, 'title', e.target.value)} sx={{ mb: 1 }} />

            {/* Rows */}
            {section.rows.map((row, ri) => (
              <Box key={ri} sx={{ mb: 1, pl: 1, borderLeft: '2px solid #06b6d4' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.secondary'>Row {ri + 1}</Typography>
                  {section.rows.length > 1 && (
                    <IconButton size='small' onClick={() => removeRow(si, ri)} sx={{ color: 'error.main' }}>
                      <i className='ri-close-line' style={{ fontSize: 12 }} />
                    </IconButton>
                  )}
                </Box>
                <TextField fullWidth size='small' label='Row ID *' value={row.id}
                  onChange={(e) => updateRow(si, ri, 'id', e.target.value)}
                  helperText={`${(row.id || '').length}/200`}
                  FormHelperTextProps={{ sx: { textAlign: 'right', m: 0 } }}
                  sx={{ mb: 0.5 }} />
                <TextField fullWidth size='small' label='Row Title *' value={row.title}
                  onChange={(e) => updateRow(si, ri, 'title', e.target.value)}
                  helperText={`${(row.title || '').length}/24`}
                  FormHelperTextProps={{ sx: { textAlign: 'right', m: 0 } }}
                  sx={{ mb: 0.5 }} />
                <TextField fullWidth size='small' label='Description' value={row.description}
                  onChange={(e) => updateRow(si, ri, 'description', e.target.value)}
                  helperText={`${(row.description || '').length}/72`}
                  FormHelperTextProps={{ sx: { textAlign: 'right', m: 0 } }} />
              </Box>
            ))}

            {section.rows.length < 10 && (
              <Button size='small' variant='text' onClick={() => addRow(si)} startIcon={<i className='ri-add-line' />}>
                Add Row
              </Button>
            )}
          </Box>
        ))}

        {sections.length < 10 && (
          <Button size='small' variant='outlined' fullWidth onClick={addSection}
            startIcon={<i className='ri-add-line' />} sx={{ mt: 0.5 }}>
            Add Section
          </Button>
        )}
      </Box>

      {/* Source Handles - one per row */}
      {allHandles.map((h, idx) => (
        <Handle
          key={h.id}
          type='source'
          position={Position.Right}
          id={h.id}
          style={{
            background: '#06b6d4',
            width: 10,
            height: 10,
            top: `${60 + idx * 25}%`
          }}
        />
      ))}
    </Box>
  )
}

export default ListNode
