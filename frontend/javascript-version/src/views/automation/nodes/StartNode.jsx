'use client'

import { useState, useCallback } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'

const StartNode = ({ id, data }) => {
  const { setNodes } = useReactFlow()
  const fields = data?.metadata?.fields || {}
  const triggerType = fields.type || null
  const keywords = fields.keywords || []

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

  const [keywordInput, setKeywordInput] = useState('')

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      updateFields({ keywords: [...keywords, keywordInput.trim()] })
      setKeywordInput('')
    }
  }

  const removeKeyword = (keyword) => {
    updateFields({ keywords: keywords.filter(k => k !== keyword) })
  }

  return (
    <Box
      sx={{
        bgcolor: 'white',
        border: '2px solid #22c55e',
        borderRadius: 3,
        p: 2,
        minWidth: 280,
        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1.5, borderBottom: '1px solid #e5e7eb' }}>
        <Box
          sx={{
            width: 28, height: 28, borderRadius: '50%',
            bgcolor: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <i className='ri-play-fill' style={{ color: 'white', fontSize: 14 }} />
        </Box>
        <Typography variant='subtitle2' fontWeight='bold'>Start Trigger</Typography>
      </Box>

      {/* Trigger Type Select */}
      <FormControl fullWidth size='small' sx={{ mb: 2 }}>
        <InputLabel>Trigger Type</InputLabel>
        <Select
          value={triggerType || ''}
          label='Trigger Type'
          onChange={(e) => updateFields({ type: e.target.value })}
        >
          <MenuItem value='new_contact'>New Contact</MenuItem>
          <MenuItem value='keywords'>Keywords</MenuItem>
        </Select>
      </FormControl>

      {/* Keywords input */}
      {triggerType === 'keywords' && (
        <Box>
          <TextField
            size='small'
            fullWidth
            label='Add keyword'
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
            placeholder='Type and press Enter'
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {keywords.map((kw, i) => (
              <Chip key={i} label={kw} size='small' onDelete={() => removeKeyword(kw)} color='success' variant='outlined' />
            ))}
          </Box>
        </Box>
      )}

      {/* Output Handle */}
      <Handle
        type='source'
        position={Position.Bottom}
        style={{ background: '#22c55e', width: 10, height: 10 }}
      />
    </Box>
  )
}

export default StartNode
