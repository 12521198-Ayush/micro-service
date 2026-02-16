'use client'

import { useState, useCallback } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

// ============================================================
// ACTION SUB-COMPONENTS (inline, all modal-based editing)
// ============================================================

// ----- AddToGroup / RemoveFromGroup (shared layout) -----
const GroupActionContent = ({ id, data, actionLabel, setNodes, setEdges, getNodes, contactGroups = [] }) => {
  const config = data?.config || {}
  const isActive = data?.is_active !== false
  const [open, setOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState({ group_id: config.group_id || '' })
  const [localActive, setLocalActive] = useState(isActive)

  const saveData = () => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? {
        ...n, data: { ...n.data, config: localConfig, is_active: localActive }
      } : n)
    )
    setOpen(false)
  }

  const handleDelete = () => {
    if (confirm('Delete this action?')) {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    }
  }

  const groupName = contactGroups.find(g => String(g.value) === String(localConfig.group_id))?.label || 'Not selected'

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant='body2'>{actionLabel}: <b>{groupName}</b></Typography>
        <Chip size='small' label={isActive ? 'Active' : 'Inactive'}
          color={isActive ? 'success' : 'default'} variant='outlined' />
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button size='small' variant='outlined' onClick={() => { setLocalConfig({ group_id: config.group_id || '' }); setLocalActive(isActive); setOpen(true) }}>Edit</Button>
        <Button size='small' variant='outlined' color='error' onClick={handleDelete}>Delete</Button>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Edit {actionLabel} Action</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size='small' sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Select Group</InputLabel>
            <Select value={localConfig.group_id} label='Select Group'
              onChange={(e) => setLocalConfig({ ...localConfig, group_id: e.target.value })}>
              {contactGroups.map((g) => (
                <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={localActive} onChange={(e) => setLocalActive(e.target.checked)} />}
            label='Active' />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={saveData}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ----- UpdateContact -----
const CONTACT_FIELDS = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'address.street', label: 'Street' },
  { value: 'address.city', label: 'City' },
  { value: 'address.state', label: 'State' },
  { value: 'address.zip', label: 'ZIP' },
  { value: 'address.country', label: 'Country' }
]

const UpdateContactContent = ({ id, data, setNodes, setEdges }) => {
  const config = data?.config || {}
  const isActive = data?.is_active !== false
  const [open, setOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState({
    target_field: config.target_field || '',
    invalid_email_message: config.invalid_email_message || 'Please provide a valid email address.'
  })
  const [localActive, setLocalActive] = useState(isActive)

  const saveData = () => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? {
        ...n, data: { ...n.data, config: localConfig, is_active: localActive }
      } : n)
    )
    setOpen(false)
  }

  const handleDelete = () => {
    if (confirm('Delete this action?')) {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    }
  }

  const fieldLabel = CONTACT_FIELDS.find(f => f.value === config.target_field)?.label || config.target_field || 'Not selected'

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant='body2'>Update: <b>{fieldLabel}</b></Typography>
        <Chip size='small' label={isActive ? 'Active' : 'Inactive'}
          color={isActive ? 'success' : 'default'} variant='outlined' />
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button size='small' variant='outlined' onClick={() => { setLocalConfig({ target_field: config.target_field || '', invalid_email_message: config.invalid_email_message || 'Please provide a valid email address.' }); setLocalActive(isActive); setOpen(true) }}>Edit</Button>
        <Button size='small' variant='outlined' color='error' onClick={handleDelete}>Delete</Button>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Edit Update Contact Action</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size='small' sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Contact Field</InputLabel>
            <Select value={localConfig.target_field} label='Contact Field'
              onChange={(e) => setLocalConfig({ ...localConfig, target_field: e.target.value })}>
              {CONTACT_FIELDS.map((f) => (
                <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {localConfig.target_field === 'email' && (
            <TextField fullWidth size='small' multiline rows={2} label='Invalid Email Message'
              value={localConfig.invalid_email_message}
              onChange={(e) => setLocalConfig({ ...localConfig, invalid_email_message: e.target.value })}
              sx={{ mb: 2 }} />
          )}
          <FormControlLabel
            control={<Switch checked={localActive} onChange={(e) => setLocalActive(e.target.checked)} />}
            label='Active' />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={saveData}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ----- SendEmail -----
const SendEmailContent = ({ id, data, setNodes, setEdges }) => {
  const config = data?.config || {}
  const isActive = data?.is_active !== false
  const [open, setOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState({
    subject: config.subject || '',
    body: config.body || '',
    smtp_host: config.smtp_host || '',
    smtp_port: config.smtp_port || 587,
    smtp_username: config.smtp_username || '',
    smtp_password: config.smtp_password || '',
    smtp_encryption: config.smtp_encryption || 'tls',
    from_name: config.from_name || '',
    from_email: config.from_email || ''
  })
  const [localActive, setLocalActive] = useState(isActive)

  const saveData = () => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? {
        ...n, data: { ...n.data, config: localConfig, is_active: localActive }
      } : n)
    )
    setOpen(false)
  }

  const handleDelete = () => {
    if (confirm('Delete this action?')) {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant='body2'>Subject: <b>{config.subject || 'Not set'}</b></Typography>
        <Chip size='small' label={isActive ? 'Active' : 'Inactive'}
          color={isActive ? 'success' : 'default'} variant='outlined' />
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button size='small' variant='outlined' onClick={() => { setLocalConfig({ subject: config.subject || '', body: config.body || '', smtp_host: config.smtp_host || '', smtp_port: config.smtp_port || 587, smtp_username: config.smtp_username || '', smtp_password: config.smtp_password || '', smtp_encryption: config.smtp_encryption || 'tls', from_name: config.from_name || '', from_email: config.from_email || '' }); setLocalActive(isActive); setOpen(true) }}>Edit</Button>
        <Button size='small' variant='outlined' color='error' onClick={handleDelete}>Delete</Button>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Edit Send Email Action</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            <TextField fullWidth size='small' label='Subject *' value={localConfig.subject}
              onChange={(e) => setLocalConfig({ ...localConfig, subject: e.target.value })} />
            <TextField fullWidth size='small' multiline rows={3} label='Body *' value={localConfig.body}
              onChange={(e) => setLocalConfig({ ...localConfig, body: e.target.value })} />
            <TextField fullWidth size='small' label='SMTP Host *' placeholder='smtp.gmail.com'
              value={localConfig.smtp_host}
              onChange={(e) => setLocalConfig({ ...localConfig, smtp_host: e.target.value })} />
            <TextField fullWidth size='small' label='SMTP Port *' type='number' placeholder='587'
              value={localConfig.smtp_port}
              onChange={(e) => setLocalConfig({ ...localConfig, smtp_port: Number(e.target.value) })} />
            <TextField fullWidth size='small' label='Username *' value={localConfig.smtp_username}
              onChange={(e) => setLocalConfig({ ...localConfig, smtp_username: e.target.value })} />
            <TextField fullWidth size='small' label='Password *' type='password' value={localConfig.smtp_password}
              onChange={(e) => setLocalConfig({ ...localConfig, smtp_password: e.target.value })} />
            <FormControl fullWidth size='small'>
              <InputLabel>Encryption</InputLabel>
              <Select value={localConfig.smtp_encryption} label='Encryption'
                onChange={(e) => setLocalConfig({ ...localConfig, smtp_encryption: e.target.value })}>
                <MenuItem value='tls'>TLS</MenuItem>
                <MenuItem value='ssl'>SSL</MenuItem>
                <MenuItem value='none'>None</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth size='small' label='From Name *' value={localConfig.from_name}
              onChange={(e) => setLocalConfig({ ...localConfig, from_name: e.target.value })} />
            <TextField fullWidth size='small' label='From Email *' type='email' value={localConfig.from_email}
              onChange={(e) => setLocalConfig({ ...localConfig, from_email: e.target.value })} />
            <FormControlLabel
              control={<Switch checked={localActive} onChange={(e) => setLocalActive(e.target.checked)} />}
              label='Active' />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={saveData}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ----- Delay -----
const DelayContent = ({ id, data, setNodes, setEdges }) => {
  const config = data?.config || {}
  const isActive = data?.is_active !== false
  const [open, setOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState({ duration: config.duration || 5 })
  const [localActive, setLocalActive] = useState(isActive)

  const saveData = () => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? {
        ...n, data: { ...n.data, config: localConfig, is_active: localActive }
      } : n)
    )
    setOpen(false)
  }

  const handleDelete = () => {
    if (confirm('Delete this action?')) {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant='body2'>Duration: <b>{config.duration || 5} min</b></Typography>
        <Chip size='small' label={isActive ? 'Active' : 'Inactive'}
          color={isActive ? 'success' : 'default'} variant='outlined' />
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button size='small' variant='outlined' onClick={() => { setLocalConfig({ duration: config.duration || 5 }); setLocalActive(isActive); setOpen(true) }}>Edit</Button>
        <Button size='small' variant='outlined' color='error' onClick={handleDelete}>Delete</Button>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Edit Delay Action</DialogTitle>
        <DialogContent>
          <TextField fullWidth size='small' label='Duration (minutes) *' type='number'
            inputProps={{ min: 1, max: 1440 }}
            value={localConfig.duration}
            onChange={(e) => setLocalConfig({ ...localConfig, duration: Math.min(1440, Math.max(1, Number(e.target.value))) })}
            sx={{ mt: 1, mb: 2 }} />
          <FormControlLabel
            control={<Switch checked={localActive} onChange={(e) => setLocalActive(e.target.checked)} />}
            label='Active' />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={saveData}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ----- Webhook -----
const WebhookContent = ({ id, data, setNodes, setEdges }) => {
  const config = data?.config || {}
  const isActive = data?.is_active !== false
  const [open, setOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState({ url: config.url || '', method: config.method || 'POST' })
  const [localActive, setLocalActive] = useState(isActive)

  const saveData = () => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? {
        ...n, data: { ...n.data, config: localConfig, is_active: localActive }
      } : n)
    )
    setOpen(false)
  }

  const handleDelete = () => {
    if (confirm('Delete this action?')) {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant='body2' noWrap sx={{ maxWidth: 250 }}>
          {config.method || 'POST'}: <b>{config.url || 'Not set'}</b>
        </Typography>
        <Chip size='small' label={isActive ? 'Active' : 'Inactive'}
          color={isActive ? 'success' : 'default'} variant='outlined' />
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button size='small' variant='outlined' onClick={() => { setLocalConfig({ url: config.url || '', method: config.method || 'POST' }); setLocalActive(isActive); setOpen(true) }}>Edit</Button>
        <Button size='small' variant='outlined' color='error' onClick={handleDelete}>Delete</Button>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Edit Webhook Action</DialogTitle>
        <DialogContent>
          <TextField fullWidth size='small' label='URL *' type='url' value={localConfig.url}
            onChange={(e) => setLocalConfig({ ...localConfig, url: e.target.value })} sx={{ mt: 1, mb: 1.5 }} />
          <FormControl fullWidth size='small' sx={{ mb: 2 }}>
            <InputLabel>Method</InputLabel>
            <Select value={localConfig.method} label='Method'
              onChange={(e) => setLocalConfig({ ...localConfig, method: e.target.value })}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={localActive} onChange={(e) => setLocalActive(e.target.checked)} />}
            label='Active' />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={saveData}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ----- Conditional -----
const ConditionalContent = ({ id, data, setNodes, setEdges }) => {
  const config = data?.config || {}
  const isActive = data?.is_active !== false
  const [open, setOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState({
    condition_type: config.condition_type || 'message_contains',
    field_name: config.field_name || '',
    field_operator: config.field_operator || 'equals',
    conditions: config.conditions || [{ value: '' }]
  })
  const [localActive, setLocalActive] = useState(isActive)

  const saveData = () => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? {
        ...n, data: { ...n.data, config: localConfig, is_active: localActive }
      } : n)
    )
    setOpen(false)
  }

  const handleDelete = () => {
    if (confirm('Delete this action?')) {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    }
  }

  const addCondition = () => {
    setLocalConfig(c => ({ ...c, conditions: [...c.conditions, { value: '' }] }))
  }

  const removeCondition = (idx) => {
    if (localConfig.conditions.length <= 1) return
    setLocalConfig(c => ({ ...c, conditions: c.conditions.filter((_, i) => i !== idx) }))
  }

  const updateConditionValue = (idx, value) => {
    setLocalConfig(c => ({
      ...c, conditions: c.conditions.map((cond, i) => i === idx ? { ...cond, value } : cond)
    }))
  }

  const conditions = config.conditions || [{ value: '' }]

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant='body2'>
          Type: <b>{(config.condition_type || 'message_contains').replace(/_/g, ' ')}</b>
        </Typography>
        <Chip size='small' label={isActive ? 'Active' : 'Inactive'}
          color={isActive ? 'success' : 'default'} variant='outlined' />
      </Box>

      {/* Condition labels with source handles */}
      <Box sx={{ mb: 1 }}>
        {conditions.map((c, idx) => (
          <Typography key={idx} variant='caption' display='block' sx={{ py: 0.25 }}>
            Condition {idx + 1}: {c.value || '(empty)'}
          </Typography>
        ))}
        <Typography variant='caption' display='block' sx={{ py: 0.25, fontStyle: 'italic' }}>
          Default path
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button size='small' variant='outlined' onClick={() => {
          setLocalConfig({
            condition_type: config.condition_type || 'message_contains',
            field_name: config.field_name || '',
            field_operator: config.field_operator || 'equals',
            conditions: config.conditions || [{ value: '' }]
          })
          setLocalActive(isActive)
          setOpen(true)
        }}>Edit</Button>
        <Button size='small' variant='outlined' color='error' onClick={handleDelete}>Delete</Button>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Edit Conditional Action</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            <FormControl fullWidth size='small'>
              <InputLabel>Condition Type</InputLabel>
              <Select value={localConfig.condition_type} label='Condition Type'
                onChange={(e) => setLocalConfig({ ...localConfig, condition_type: e.target.value })}>
                <MenuItem value='message_contains'>Message Contains</MenuItem>
                <MenuItem value='message_equals'>Message Equals</MenuItem>
                <MenuItem value='contact_field'>Contact Field</MenuItem>
              </Select>
            </FormControl>

            {localConfig.condition_type === 'contact_field' && (
              <>
                <FormControl fullWidth size='small'>
                  <InputLabel>Contact Field</InputLabel>
                  <Select value={localConfig.field_name} label='Contact Field'
                    onChange={(e) => setLocalConfig({ ...localConfig, field_name: e.target.value })}>
                    {CONTACT_FIELDS.map(f => (
                      <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size='small'>
                  <InputLabel>Operator</InputLabel>
                  <Select value={localConfig.field_operator} label='Operator'
                    onChange={(e) => setLocalConfig({ ...localConfig, field_operator: e.target.value })}>
                    <MenuItem value='equals'>Equals</MenuItem>
                    <MenuItem value='contains'>Contains</MenuItem>
                    <MenuItem value='not_equals'>Not Equals</MenuItem>
                    <MenuItem value='is_empty'>Is Empty</MenuItem>
                    <MenuItem value='is_not_empty'>Is Not Empty</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

            <Typography variant='subtitle2'>Condition Values</Typography>
            {localConfig.conditions.map((cond, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField fullWidth size='small' label={`Value ${idx + 1}`} value={cond.value}
                  onChange={(e) => updateConditionValue(idx, e.target.value)} />
                {localConfig.conditions.length > 1 && (
                  <IconButton size='small' color='error' onClick={() => removeCondition(idx)}>
                    <i className='ri-delete-bin-line' />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button size='small' variant='text' onClick={addCondition}
              startIcon={<i className='ri-add-line' />}>
              Add Value
            </Button>

            <FormControlLabel
              control={<Switch checked={localActive} onChange={(e) => setLocalActive(e.target.checked)} />}
              label='Active' />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={saveData}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ============================================================
// MAIN ACTION NODE COMPONENT
// ============================================================
const ACTION_LABELS = {
  add_to_group: { label: 'Add to Group', icon: 'ri-group-line', color: '#0d9488' },
  remove_from_group: { label: 'Remove from Group', icon: 'ri-user-unfollow-line', color: '#0d9488' },
  update_contact: { label: 'Update Contact', icon: 'ri-user-settings-line', color: '#0d9488' },
  send_email: { label: 'Send Email', icon: 'ri-mail-send-line', color: '#0d9488' },
  delay: { label: 'Delay', icon: 'ri-time-line', color: '#0d9488' },
  webhook: { label: 'Webhook', icon: 'ri-links-line', color: '#0d9488' },
  conditional: { label: 'Conditional', icon: 'ri-git-branch-line', color: '#0d9488' }
}

const ActionNode = ({ id, data }) => {
  const { setNodes, getNodes, getEdges, setEdges } = useReactFlow()
  const rawType = data?.actionType || 'add_to_group'
  const actionType = rawType.replace(/-/g, '_')
  const meta = ACTION_LABELS[actionType] || ACTION_LABELS.add_to_group
  const contactGroups = data?.contactGroups || []
  const isConditional = actionType === 'conditional'

  const config = data?.config || {}
  const conditions = config.conditions || [{ value: '' }]

  const renderContent = () => {
    const commonProps = { id, data, setNodes, setEdges, getNodes }

    switch (actionType) {
      case 'add_to_group':
        return <GroupActionContent {...commonProps} actionLabel='Add to' contactGroups={contactGroups} />
      case 'remove_from_group':
        return <GroupActionContent {...commonProps} actionLabel='Remove from' contactGroups={contactGroups} />
      case 'update_contact':
        return <UpdateContactContent {...commonProps} />
      case 'send_email':
        return <SendEmailContent {...commonProps} />
      case 'delay':
        return <DelayContent {...commonProps} />
      case 'webhook':
        return <WebhookContent {...commonProps} />
      case 'conditional':
        return <ConditionalContent {...commonProps} />
      default:
        return <GroupActionContent {...commonProps} actionLabel='Add to' contactGroups={contactGroups} />
    }
  }

  return (
    <Box
      sx={{
        bgcolor: 'white',
        border: '2px solid #99f6e4',
        borderRadius: 3,
        width: 400,
        minWidth: 400,
        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.1)'
      }}
    >
      {/* Target Handle */}
      <Handle
        type='target'
        position={isConditional ? Position.Left : Position.Top}
        style={{ background: '#0d9488', width: 12, height: 12 }}
      />

      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        p: 1.5, borderBottom: '1px solid #e5e7eb'
      }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: '50%',
          bgcolor: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <i className={meta.icon} style={{ color: 'white', fontSize: 16 }} />
        </Box>
        <Typography variant='subtitle2' fontWeight='bold'>{meta.label}</Typography>
      </Box>

      {/* Content */}
      <Box sx={{ p: 1.5 }}>
        {renderContent()}
      </Box>

      {/* Source Handle(s) */}
      {isConditional ? (
        <>
          {conditions.map((c, idx) => (
            <Handle
              key={`condition-${idx}`}
              type='source'
              position={Position.Right}
              id={`condition-${idx}|${id}`}
              style={{
                background: '#0d9488',
                width: 10,
                height: 10,
                top: `${50 + idx * 30}px`,
                right: -5
              }}
            />
          ))}
          <Handle
            type='source'
            position={Position.Right}
            id={`default|${id}`}
            style={{
              background: '#6b7280',
              width: 10,
              height: 10,
              top: `${50 + conditions.length * 30}px`,
              right: -5
            }}
          />
        </>
      ) : (
        <Handle
          type='source'
          position={Position.Bottom}
          style={{ background: '#0d9488', width: 12, height: 12 }}
        />
      )}
    </Box>
  )
}

export default ActionNode
