'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'

import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { getFlow, updateFlow } from '@/libs/automation-service'
import StartNode from '@/views/automation/nodes/StartNode'
import TextNode from '@/views/automation/nodes/TextNode'
import MediaNode from '@/views/automation/nodes/MediaNode'
import ButtonsNode from '@/views/automation/nodes/ButtonsNode'
import ListNode from '@/views/automation/nodes/ListNode'
import ActionNode from '@/views/automation/nodes/ActionNode'

const nodeTypes = {
  start: StartNode,
  text: TextNode,
  media: MediaNode,
  buttons: ButtonsNode,
  list: ListNode,
  action: ActionNode
}

let nodeId = 100

const FlowBuilderCanvas = () => {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const uuid = params?.uuid
  const reactFlowWrapper = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)

  const [flow, setFlow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [contactGroups, setContactGroups] = useState([])
  const [contactFields, setContactFields] = useState([])
  const [availableActions, setAvailableActions] = useState([])
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // Load flow data
  useEffect(() => {
    const loadFlow = async () => {
      try {
        setLoading(true)
        const token = session?.accessToken
        if (!token || !uuid) return

        const result = await getFlow(token, uuid)
        const flowData = result.data

        setFlow(flowData.flow)
        setContactGroups(flowData.contactGroups || [])
        setContactFields(flowData.contactFields || [])
        setAvailableActions(flowData.availableActions || [])

        // Load metadata (nodes/edges) if exists
        if (flowData.flow.metadata) {
          try {
            const metadata = JSON.parse(flowData.flow.metadata)
            if (metadata.nodes) setNodes(metadata.nodes)
            if (metadata.edges) setEdges(metadata.edges)

            // Track max node ID
            const maxId = Math.max(...(metadata.nodes || []).map(n => parseInt(n.id) || 0), 0)
            nodeId = maxId + 1
          } catch (e) {
            console.error('Error parsing metadata:', e)
          }
        } else {
          // Default start node
          setNodes([{
            id: '1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: {
              metadata: {
                fields: { type: null, keywords: [] }
              }
            }
          }])
        }
      } catch (error) {
        console.error('Error loading flow:', error)
        setSnackbar({ open: true, message: 'Error loading flow', severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    loadFlow()
  }, [uuid, session])

  // Connect nodes
  const onConnect = useCallback(
    (connection) => {
      // Store source/target node data in the edge
      const sourceNode = nodes.find(n => n.id === connection.source)
      const targetNode = nodes.find(n => n.id === connection.target)

      const newEdge = {
        ...connection,
        id: `e${connection.source}-${connection.target}-${Date.now()}`,
        sourceNode: sourceNode || null,
        targetNode: targetNode || null,
        animated: true,
        style: { stroke: '#ff5100', strokeWidth: 2 }
      }

      setEdges((eds) => addEdge(newEdge, eds))
    },
    [nodes, setEdges]
  )

  // Drag and drop
  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      const actionType = event.dataTransfer.getData('actionType')

      if (!type) return

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newId = String(nodeId++)
      let data = { metadata: { fields: {} } }

      // Set default data based on node type
      switch (type) {
        case 'text':
          data = { metadata: { fields: { type: 'text', body: '' } } }
          break
        case 'media':
          data = { metadata: { fields: { type: 'media', mediaType: 'image', media: {}, caption: '' } } }
          break
        case 'buttons':
          data = {
            metadata: {
              fields: {
                type: 'interactive buttons',
                buttonType: 'buttons',
                body: '',
                headerType: 'none',
                buttons: { button1: '', button2: '', button3: '' },
                footer: ''
              }
            }
          }
          break
        case 'list':
          data = {
            metadata: {
              fields: {
                type: 'interactive list',
                body: '',
                headerType: 'none',
                buttonLabel: '',
                sections: [{ title: '', rows: [{ id: '1', title: '', description: '' }] }],
                footer: ''
              }
            }
          }
          break
        case 'action':
          data = {
            actionType: actionType || '',
            is_active: true,
            config: getDefaultActionConfig(actionType),
            metadata: { fields: {} }
          }
          break
      }

      const newNode = {
        id: newId,
        type,
        position,
        data
      }

      setNodes((nds) => [...nds, newNode])
    },
    [reactFlowInstance, setNodes]
  )

  // Save flow
  const handleSave = async () => {
    try {
      setSaving(true)
      const token = session?.accessToken

      // Update edges with source/target node references
      const updatedEdges = edges.map(edge => ({
        ...edge,
        sourceNode: nodes.find(n => n.id === edge.source) || edge.sourceNode,
        targetNode: nodes.find(n => n.id === edge.target) || edge.targetNode
      }))

      const metadata = JSON.stringify({ nodes, edges: updatedEdges })

      const result = await updateFlow(token, uuid, {
        name: flow.name,
        metadata
      })

      if (result.success) {
        setSnackbar({ open: true, message: result.message || 'Flow saved!', severity: 'success' })
      } else {
        setSnackbar({ open: true, message: 'Failed to save flow', severity: 'error' })
      }
    } catch (error) {
      console.error('Error saving flow:', error)
      setSnackbar({ open: true, message: error.message || 'Error saving flow', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Publish/Unpublish
  const handlePublish = async (publish) => {
    try {
      setSaving(true)
      const token = session?.accessToken

      // Save first
      const updatedEdges = edges.map(edge => ({
        ...edge,
        sourceNode: nodes.find(n => n.id === edge.source) || edge.sourceNode,
        targetNode: nodes.find(n => n.id === edge.target) || edge.targetNode
      }))

      const metadata = JSON.stringify({ nodes, edges: updatedEdges })

      const result = await updateFlow(token, uuid, {
        name: flow.name,
        metadata,
        publish
      })

      if (result.success) {
        setFlow(prev => ({ ...prev, status: result.status }))
        setSnackbar({ open: true, message: result.message, severity: 'success' })
      } else {
        setSnackbar({
          open: true,
          message: result.errors ? Object.values(result.errors).flat().join(', ') : 'Validation failed',
          severity: 'error'
        })
      }
    } catch (error) {
      console.error('Error publishing flow:', error)
      setSnackbar({ open: true, message: error.message || 'Error publishing', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Update node data
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } }
        }
        return node
      })
    )
  }, [setNodes])

  // Delete node
  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter(node => node.id !== nodeId))
    setEdges((eds) => eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId))
  }, [setNodes, setEdges])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Toolbar */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push('/automation/list')}>
            <i className='ri-arrow-left-line' />
          </IconButton>
          <Typography variant='h6' fontWeight='bold'>{flow?.name || 'Automation Flow'}</Typography>
          <Chip
            label={flow?.status === 'active' ? 'Active' : 'Inactive'}
            size='small'
            color={flow?.status === 'active' ? 'success' : 'default'}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant='outlined'
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <i className='ri-save-line' />}
          >
            Save
          </Button>
          {flow?.status === 'active' ? (
            <Button
              variant='contained'
              color='warning'
              onClick={() => handlePublish(false)}
              disabled={saving}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              variant='contained'
              onClick={() => handlePublish(true)}
              disabled={saving}
              sx={{ background: 'linear-gradient(135deg, #ff5100, #ff7a3d)' }}
            >
              Publish
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Left Sidebar - Draggable Nodes */}
        <Box
          sx={{
            width: 260, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper',
            overflow: 'auto', p: 2
          }}
        >
          <Typography variant='subtitle2' fontWeight='bold' sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: 11 }}>
            Messages
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            {[
              { type: 'text', label: 'Text Message', icon: 'ri-chat-1-line', color: '#3b82f6' },
              { type: 'media', label: 'Media Message', icon: 'ri-image-line', color: '#8b5cf6' },
              { type: 'buttons', label: 'Buttons', icon: 'ri-checkbox-multiple-line', color: '#f97316' },
              { type: 'list', label: 'List Message', icon: 'ri-list-check-2', color: '#06b6d4' }
            ].map(item => (
              <Box
                key={item.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', item.type)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
                  borderRadius: 2, border: '1px solid', borderColor: 'divider',
                  cursor: 'grab', transition: 'all 0.2s',
                  '&:hover': { borderColor: item.color, bgcolor: `${item.color}08`, transform: 'translateX(2px)' }
                }}
              >
                <Box sx={{ color: item.color, display: 'flex', alignItems: 'center' }}>
                  <i className={item.icon} style={{ fontSize: 20 }} />
                </Box>
                <Typography variant='body2' fontWeight='500'>{item.label}</Typography>
              </Box>
            ))}
          </Box>

          <Typography variant='subtitle2' fontWeight='bold' sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: 11 }}>
            Actions
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              { type: 'add-to-group', label: 'Add to Group', icon: 'ri-group-line', color: '#22c55e' },
              { type: 'remove-from-group', label: 'Remove from Group', icon: 'ri-user-unfollow-line', color: '#ef4444' },
              { type: 'update-contact', label: 'Update Contact', icon: 'ri-user-settings-line', color: '#f59e0b' },
              { type: 'send-email', label: 'Send Email', icon: 'ri-mail-send-line', color: '#3b82f6' },
              { type: 'delay', label: 'Delay', icon: 'ri-time-line', color: '#8b5cf6' },
              { type: 'webhook', label: 'Webhook', icon: 'ri-webhook-line', color: '#06b6d4' },
              { type: 'conditional', label: 'Conditional', icon: 'ri-git-branch-line', color: '#f97316' }
            ].filter(a => availableActions.includes(a.type.replace(/-/g, '_'))).map(item => (
              <Box
                key={item.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', 'action')
                  e.dataTransfer.setData('actionType', item.type)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
                  borderRadius: 2, border: '1px solid', borderColor: 'divider',
                  cursor: 'grab', transition: 'all 0.2s',
                  '&:hover': { borderColor: item.color, bgcolor: `${item.color}08`, transform: 'translateX(2px)' }
                }}
              >
                <Box sx={{ color: item.color, display: 'flex', alignItems: 'center' }}>
                  <i className={item.icon} style={{ fontSize: 20 }} />
                </Box>
                <Typography variant='body2' fontWeight='500'>{item.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Flow Canvas */}
        <Box sx={{ flex: 1 }} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#ff5100', strokeWidth: 2 }
            }}
          >
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              nodeColor={(n) => {
                if (n.type === 'start') return '#22c55e'
                if (n.type === 'action') return '#f97316'
                return '#3b82f6'
              }}
            />
            <Background variant='dots' gap={16} size={1} />
          </ReactFlow>
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

// Default config for action types
function getDefaultActionConfig(actionType) {
  const configs = {
    'add-to-group': { group_id: '' },
    'remove-from-group': { group_id: '' },
    'update-contact': { target_field: '', invalid_email_message: 'Please provide a valid email address.' },
    'send-email': { subject: '', body: '', smtp_host: '', smtp_port: 587, smtp_username: '', smtp_password: '', smtp_encryption: 'tls', from_name: '', from_email: '' },
    'delay': { duration: 5 },
    'webhook': { url: '', method: 'POST' },
    'ai-response': { prompt: '', proceed_condition: 'always', confidence_threshold: 0.8 },
    'conditional': { condition_type: 'message_contains', conditions: [{ value: '' }], field_name: '', field_operator: 'equals' }
  }
  return configs[actionType] || {}
}

// Wrapper with ReactFlowProvider
const AutomationFlowBuilder = () => {
  return (
    <ReactFlowProvider>
      <FlowBuilderCanvas />
    </ReactFlowProvider>
  )
}

export default AutomationFlowBuilder
