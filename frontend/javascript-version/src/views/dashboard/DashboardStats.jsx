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
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Avatar from '@mui/material/Avatar'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Divider from '@mui/material/Divider'

// API Imports
import { getContacts, getGroups } from '@/libs/contact-service'
import { listTemplates } from '@/libs/template-service'
import { getCampaigns } from '@/libs/campaign-service'
import { getMessages } from '@/libs/whatsapp-service'
import { getWalletBalance } from '@/libs/user-service'
import { getAgents, getDepartments } from '@/libs/team-service'

const DashboardStats = () => {
  const { data: session, status } = useSession()
  
  // Stats state
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    contacts: 0,
    groups: 0,
    templates: 0,
    campaigns: 0,
    messages: 0,
    agents: 0,
    departments: 0,
    walletBalance: 0
  })
  const [recentCampaigns, setRecentCampaigns] = useState([])
  const [recentMessages, setRecentMessages] = useState([])

  // Fetch all stats
  const fetchStats = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [
        contactsRes,
        groupsRes,
        templatesRes,
        campaignsRes,
        messagesRes,
        walletRes,
        agentsRes,
        departmentsRes
      ] = await Promise.allSettled([
        getContacts(session.accessToken, { limit: 1 }),
        getGroups(session.accessToken),
        listTemplates(session.accessToken, {}),
        getCampaigns(session.accessToken, { limit: 5 }),
        getMessages(session.accessToken, { limit: 10 }),
        getWalletBalance(session.accessToken),
        getAgents(session.accessToken),
        getDepartments(session.accessToken)
      ])

      setStats({
        contacts: contactsRes.status === 'fulfilled' ? (contactsRes.value.pagination?.total || 0) : 0,
        groups: groupsRes.status === 'fulfilled' ? (groupsRes.value.data?.length || 0) : 0,
        templates: templatesRes.status === 'fulfilled' ? (templatesRes.value.count || templatesRes.value.data?.length || 0) : 0,
        campaigns: campaignsRes.status === 'fulfilled' ? (campaignsRes.value.pagination?.total || campaignsRes.value.data?.length || 0) : 0,
        messages: messagesRes.status === 'fulfilled' ? (messagesRes.value.pagination?.total || messagesRes.value.data?.length || 0) : 0,
        agents: agentsRes.status === 'fulfilled' ? (agentsRes.value.data?.length || agentsRes.value.length || 0) : 0,
        departments: departmentsRes.status === 'fulfilled' ? (departmentsRes.value.data?.length || departmentsRes.value.length || 0) : 0,
        walletBalance: walletRes.status === 'fulfilled' ? (walletRes.value.balance || 0) : 0
      })

      if (campaignsRes.status === 'fulfilled') {
        setRecentCampaigns(campaignsRes.value.data?.slice(0, 5) || [])
      }

      if (messagesRes.status === 'fulfilled') {
        setRecentMessages(messagesRes.value.data?.slice(0, 5) || [])
      }
    } catch (error) {
      if (error.status === 401) {
        signOut({ callbackUrl: '/login' })
      }
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (session?.accessToken) {
      fetchStats()
    }
  }, [session?.accessToken, fetchStats])

  // Stat Card Component
  const StatCard = ({ title, value, icon, color, href }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="textSecondary">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
          </Box>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: `${color}.lighter`,
              color: `${color}.main`
            }}
          >
            <i className={icon} style={{ fontSize: 28 }} />
          </Avatar>
        </Box>
        {href && (
          <Button size="small" href={href} sx={{ mt: 1 }}>
            View All →
          </Button>
        )}
      </CardContent>
    </Card>
  )

  // Get campaign status color
  const getCampaignStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success'
      case 'running': return 'info'
      case 'scheduled': return 'warning'
      case 'failed': return 'error'
      default: return 'default'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      {/* Welcome Card */}
      <Grid item xs={12} md={8}>
        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight="bold">
              Welcome back! 👋
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
              Your WhatsApp Business messaging platform is ready. 
              Manage contacts, create campaigns, and engage with your audience.
            </Typography>
            <Box display="flex" gap={2} mt={3}>
              <Button variant="contained" color="inherit" href="/campaigns/create" sx={{ color: '#667eea' }}>
                Create Campaign
              </Button>
              <Button variant="outlined" color="inherit" href="/inbox">
                Open Inbox
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Wallet Balance */}
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Avatar sx={{ bgcolor: 'success.lighter', color: 'success.main' }}>
                <i className="ri-wallet-3-line" />
              </Avatar>
              <Typography variant="body2" color="textSecondary">
                Wallet Balance
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight="bold" color="success.main">
              ₹{stats.walletBalance.toFixed(2)}
            </Typography>
            <Button size="small" href="/billing" sx={{ mt: 2 }}>
              Manage Billing →
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* Stats Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Contacts"
          value={stats.contacts}
          icon="ri-contacts-line"
          color="primary"
          href="/contacts"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Contact Groups"
          value={stats.groups}
          icon="ri-group-line"
          color="info"
          href="/groups"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Templates"
          value={stats.templates}
          icon="ri-file-list-2-line"
          color="warning"
          href="/message-template/list"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Campaigns"
          value={stats.campaigns}
          icon="ri-megaphone-line"
          color="error"
          href="/campaigns/list"
        />
      </Grid>

      {/* Recent Campaigns */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader
            title="Recent Campaigns"
            action={
              <Button size="small" href="/campaigns/list">
                View All
              </Button>
            }
          />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Campaign</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="textSecondary">No campaigns yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <Typography fontWeight={500}>{campaign.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={campaign.status || 'Draft'}
                          size="small"
                          color={getCampaignStatusColor(campaign.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ minWidth: 80 }}>
                          <LinearProgress
                            variant="determinate"
                            value={
                              campaign.total_count > 0
                                ? (campaign.sent_count / campaign.total_count) * 100
                                : 0
                            }
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {campaign.created_at
                          ? new Date(campaign.created_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      {/* Team Stats */}
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Team Overview" />
          <CardContent>
            <Box display="flex" flexDirection="column" gap={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main' }}>
                    <i className="ri-building-line" />
                  </Avatar>
                  <Typography>Departments</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {stats.departments}
                </Typography>
              </Box>
              
              <Divider />
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'secondary.lighter', color: 'secondary.main' }}>
                    <i className="ri-user-line" />
                  </Avatar>
                  <Typography>Agents</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {stats.agents}
                </Typography>
              </Box>
              
              <Divider />
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'success.lighter', color: 'success.main' }}>
                    <i className="ri-message-3-line" />
                  </Avatar>
                  <Typography>Messages</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {stats.messages}
                </Typography>
              </Box>
            </Box>

            <Button fullWidth variant="outlined" href="/team/list" sx={{ mt: 3 }}>
              Manage Team
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Quick Actions" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  href="/contacts"
                  sx={{ py: 2, flexDirection: 'column', gap: 1 }}
                >
                  <i className="ri-user-add-line" style={{ fontSize: 24 }} />
                  <Typography variant="body2">Add Contact</Typography>
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  href="/groups"
                  sx={{ py: 2, flexDirection: 'column', gap: 1 }}
                >
                  <i className="ri-group-line" style={{ fontSize: 24 }} />
                  <Typography variant="body2">Create Group</Typography>
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  href="/message-template/create"
                  sx={{ py: 2, flexDirection: 'column', gap: 1 }}
                >
                  <i className="ri-file-add-line" style={{ fontSize: 24 }} />
                  <Typography variant="body2">New Template</Typography>
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  href="/campaigns/create"
                  sx={{ py: 2, flexDirection: 'column', gap: 1 }}
                >
                  <i className="ri-megaphone-line" style={{ fontSize: 24 }} />
                  <Typography variant="body2">New Campaign</Typography>
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  href="/inbox"
                  sx={{ py: 2, flexDirection: 'column', gap: 1 }}
                >
                  <i className="ri-chat-3-line" style={{ fontSize: 24 }} />
                  <Typography variant="body2">Open Inbox</Typography>
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  href="/billing"
                  sx={{ py: 2, flexDirection: 'column', gap: 1 }}
                >
                  <i className="ri-wallet-line" style={{ fontSize: 24 }} />
                  <Typography variant="body2">Add Funds</Typography>
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default DashboardStats
