'use client'

// React Imports
import { useState, useEffect, useCallback } from 'react'

// Next Imports
import { useSession, signOut } from 'next-auth/react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import InputAdornment from '@mui/material/InputAdornment'

// API Imports
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  assignAgentToDepartment
} from '@/libs/team-service'

const TeamManagement = () => {
  const { data: session, status } = useSession()
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0)
  
  // Data state
  const [departments, setDepartments] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Department dialog state
  const [deptDialog, setDeptDialog] = useState(false)
  const [deptDeleteDialog, setDeptDeleteDialog] = useState(false)
  const [selectedDept, setSelectedDept] = useState(null)
  const [deptForm, setDeptForm] = useState({ name: '' })
  
  // Agent dialog state
  const [agentDialog, setAgentDialog] = useState(false)
  const [agentDeleteDialog, setAgentDeleteDialog] = useState(false)
  const [assignDialog, setAssignDialog] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [agentForm, setAgentForm] = useState({
    name: '',
    email: '',
    password: '',
    department_id: ''
  })
  const [assignDeptId, setAssignDeptId] = useState('')
  
  // Notification state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [formLoading, setFormLoading] = useState(false)

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setLoading(true)
      const [deptRes, agentsRes] = await Promise.all([
        getDepartments(session.accessToken),
        getAgents(session.accessToken)
      ])
      
      setDepartments(deptRes.data || deptRes || [])
      setAgents(agentsRes.data || agentsRes || [])
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        signOut({ callbackUrl: '/login' })
      }
      setSnackbar({ open: true, message: error.message || 'Failed to fetch data', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (session?.accessToken) {
      fetchData()
    }
  }, [session?.accessToken, fetchData])

  // Department handlers
  const handleOpenDeptCreate = () => {
    setSelectedDept(null)
    setDeptForm({ name: '' })
    setDeptDialog(true)
  }

  const handleOpenDeptEdit = (dept) => {
    setSelectedDept(dept)
    setDeptForm({ name: dept.name || '' })
    setDeptDialog(true)
  }

  const handleSaveDept = async () => {
    if (!session?.accessToken) return

    try {
      setFormLoading(true)
      
      if (selectedDept) {
        await updateDepartment(session.accessToken, selectedDept.id, deptForm)
        setSnackbar({ open: true, message: 'Department updated successfully', severity: 'success' })
      } else {
        await createDepartment(session.accessToken, deptForm)
        setSnackbar({ open: true, message: 'Department created successfully', severity: 'success' })
      }
      
      setDeptDialog(false)
      fetchData()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to save department', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteDept = async () => {
    if (!session?.accessToken || !selectedDept) return

    try {
      setFormLoading(true)
      await deleteDepartment(session.accessToken, selectedDept.id)
      setSnackbar({ open: true, message: 'Department deleted successfully', severity: 'success' })
      setDeptDeleteDialog(false)
      fetchData()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete department', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  // Agent handlers
  const handleOpenAgentCreate = () => {
    setSelectedAgent(null)
    setAgentForm({ name: '', email: '', password: '', department_id: '' })
    setAgentDialog(true)
  }

  const handleOpenAgentEdit = (agent) => {
    setSelectedAgent(agent)
    setAgentForm({
      name: agent.name || '',
      email: agent.email || '',
      password: '',
      department_id: agent.department_id || ''
    })
    setAgentDialog(true)
  }

  const handleSaveAgent = async () => {
    if (!session?.accessToken) return

    try {
      setFormLoading(true)
      
      const data = { ...agentForm }
      if (selectedAgent && !data.password) {
        delete data.password
      }
      
      if (selectedAgent) {
        await updateAgent(session.accessToken, selectedAgent.id, data)
        setSnackbar({ open: true, message: 'Agent updated successfully', severity: 'success' })
      } else {
        await createAgent(session.accessToken, data)
        setSnackbar({ open: true, message: 'Agent created successfully', severity: 'success' })
      }
      
      setAgentDialog(false)
      fetchData()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to save agent', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteAgent = async () => {
    if (!session?.accessToken || !selectedAgent) return

    try {
      setFormLoading(true)
      await deleteAgent(session.accessToken, selectedAgent.id)
      setSnackbar({ open: true, message: 'Agent deleted successfully', severity: 'success' })
      setAgentDeleteDialog(false)
      fetchData()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete agent', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  const handleAssignAgent = async () => {
    if (!session?.accessToken || !selectedAgent || !assignDeptId) return

    try {
      setFormLoading(true)
      await assignAgentToDepartment(session.accessToken, selectedAgent.id, { department_id: parseInt(assignDeptId) })
      setSnackbar({ open: true, message: 'Agent assigned successfully', severity: 'success' })
      setAssignDialog(false)
      setAssignDeptId('')
      fetchData()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to assign agent', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  // Get department name by ID
  const getDeptName = (deptId) => {
    const dept = departments.find(d => d.id === deptId)
    return dept?.name || '-'
  }

  if (status === 'loading' || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Team Management" />
            <CardContent>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 4 }}>
                <Tab label="Departments" />
                <Tab label="Agents" />
              </Tabs>

              {/* Departments Tab */}
              {activeTab === 0 && (
                <>
                  <Box display="flex" justifyContent="flex-end" mb={3}>
                    <Button
                      variant="contained"
                      onClick={handleOpenDeptCreate}
                      startIcon={<i className="ri-add-line" />}
                    >
                      Create Department
                    </Button>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Department Name</TableCell>
                          <TableCell>Agents</TableCell>
                          <TableCell>Created At</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {departments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography color="textSecondary">No departments found</Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          departments.map((dept) => (
                            <TableRow key={dept.id} hover>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={2}>
                                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                                    <i className="ri-building-line" />
                                  </Avatar>
                                  <Typography fontWeight={500}>{dept.name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`${agents.filter(a => a.department_id === dept.id).length} agents`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                {dept.created_at ? new Date(dept.created_at).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleOpenDeptEdit(dept)}>
                                    <i className="ri-edit-line" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setSelectedDept(dept)
                                      setDeptDeleteDialog(true)
                                    }}
                                  >
                                    <i className="ri-delete-bin-line" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {/* Agents Tab */}
              {activeTab === 1 && (
                <>
                  <Box display="flex" justifyContent="flex-end" mb={3}>
                    <Button
                      variant="contained"
                      onClick={handleOpenAgentCreate}
                      startIcon={<i className="ri-add-line" />}
                    >
                      Create Agent
                    </Button>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Agent</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Department</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {agents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <Typography color="textSecondary">No agents found</Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          agents.map((agent) => (
                            <TableRow key={agent.id} hover>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={2}>
                                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                    {(agent.name || 'A')[0].toUpperCase()}
                                  </Avatar>
                                  <Typography fontWeight={500}>{agent.name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{agent.email}</TableCell>
                              <TableCell>
                                {agent.department_id ? (
                                  <Chip label={getDeptName(agent.department_id)} size="small" />
                                ) : (
                                  <Chip label="Unassigned" size="small" variant="outlined" />
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={agent.status || 'Active'}
                                  size="small"
                                  color={agent.status === 'inactive' ? 'default' : 'success'}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="Assign to Department">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedAgent(agent)
                                      setAssignDeptId(agent.department_id?.toString() || '')
                                      setAssignDialog(true)
                                    }}
                                  >
                                    <i className="ri-user-settings-line" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleOpenAgentEdit(agent)}>
                                    <i className="ri-edit-line" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setSelectedAgent(agent)
                                      setAgentDeleteDialog(true)
                                    }}
                                  >
                                    <i className="ri-delete-bin-line" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Department Dialog */}
      <Dialog open={deptDialog} onClose={() => setDeptDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Department Name"
            value={deptForm.name}
            onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
            sx={{ mt: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeptDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveDept}
            disabled={formLoading || !deptForm.name}
          >
            {formLoading ? <CircularProgress size={24} /> : selectedDept ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Delete Dialog */}
      <Dialog open={deptDeleteDialog} onClose={() => setDeptDeleteDialog(false)}>
        <DialogTitle>Delete Department</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedDept?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeptDeleteDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteDept} disabled={formLoading}>
            {formLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Agent Dialog */}
      <Dialog open={agentDialog} onClose={() => setAgentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedAgent ? 'Edit Agent' : 'Create Agent'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={agentForm.name}
                onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={agentForm.email}
                onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={selectedAgent ? 'New Password (leave empty to keep current)' : 'Password'}
                type="password"
                value={agentForm.password}
                onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
                required={!selectedAgent}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={agentForm.department_id}
                  label="Department"
                  onChange={(e) => setAgentForm({ ...agentForm, department_id: e.target.value })}
                >
                  <MenuItem value="">No Department</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAgentDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveAgent}
            disabled={formLoading || !agentForm.name || !agentForm.email || (!selectedAgent && !agentForm.password)}
          >
            {formLoading ? <CircularProgress size={24} /> : selectedAgent ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Agent Delete Dialog */}
      <Dialog open={agentDeleteDialog} onClose={() => setAgentDeleteDialog(false)}>
        <DialogTitle>Delete Agent</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedAgent?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAgentDeleteDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAgent} disabled={formLoading}>
            {formLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Agent Dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)}>
        <DialogTitle>Assign Agent to Department</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Assign <strong>{selectedAgent?.name}</strong> to a department
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select Department</InputLabel>
            <Select
              value={assignDeptId}
              label="Select Department"
              onChange={(e) => setAssignDeptId(e.target.value)}
            >
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssignAgent}
            disabled={formLoading || !assignDeptId}
          >
            {formLoading ? <CircularProgress size={24} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default TeamManagement
