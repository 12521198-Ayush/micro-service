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
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
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
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import InputAdornment from '@mui/material/InputAdornment'

// API Imports
import { getWalletBalance, getWalletTransactions, addWalletBalance } from '@/libs/user-service'

const Billing = () => {
  const { data: session, status } = useSession()
  
  // State
  const [walletData, setWalletData] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalTransactions, setTotalTransactions] = useState(0)
  
  // Add funds dialog
  const [addFundsDialog, setAddFundsDialog] = useState(false)
  const [addAmount, setAddAmount] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  
  // Notification state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setLoading(true)
      const [balanceRes, transactionsRes] = await Promise.all([
        getWalletBalance(session.accessToken),
        getWalletTransactions(session.accessToken, { page: page + 1, limit: rowsPerPage })
      ])
      
      setWalletData(balanceRes)
      setTransactions(transactionsRes.transactions || transactionsRes.data || [])
      setTotalTransactions(transactionsRes.pagination?.total || transactionsRes.total || 0)
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        signOut({ callbackUrl: '/login' })
      }
      setSnackbar({ open: true, message: error.message || 'Failed to fetch wallet data', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken, page, rowsPerPage])

  useEffect(() => {
    if (session?.accessToken) {
      fetchWalletData()
    }
  }, [session?.accessToken, fetchWalletData])

  // Add funds
  const handleAddFunds = async () => {
    if (!session?.accessToken || !addAmount) return

    try {
      setFormLoading(true)
      
      await addWalletBalance(session.accessToken, {
        amount: parseFloat(addAmount),
        description: addDescription || 'Wallet top-up'
      })
      
      setSnackbar({ open: true, message: 'Funds added successfully', severity: 'success' })
      setAddFundsDialog(false)
      setAddAmount('')
      setAddDescription('')
      fetchWalletData()
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to add funds', severity: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  // Get transaction type color
  const getTransactionColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'credit':
      case 'add':
        return 'success'
      case 'debit':
      case 'deduct':
        return 'error'
      default:
        return 'default'
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
    <>
      <Grid container spacing={6}>
        {/* Wallet Balance Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="ri-wallet-3-line" style={{ fontSize: 24, color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Current Balance
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₹{walletData?.balance?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Box>
              
              <Button
                variant="contained"
                fullWidth
                onClick={() => setAddFundsDialog(true)}
                startIcon={<i className="ri-add-line" />}
              >
                Add Funds
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Pricing Info */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Message Pricing
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">
                    Marketing Messages
                  </Typography>
                  <Typography fontWeight={600}>
                    ₹{walletData?.pricing?.marketing || '0.80'} / msg
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">
                    Utility Messages
                  </Typography>
                  <Typography fontWeight={600}>
                    ₹{walletData?.pricing?.utility || '0.35'} / msg
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">
                    Authentication Messages
                  </Typography>
                  <Typography fontWeight={600}>
                    ₹{walletData?.pricing?.authentication || '0.30'} / msg
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Usage Stats */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                This Month
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">
                    Messages Sent
                  </Typography>
                  <Typography fontWeight={600}>
                    {walletData?.usage?.messagesSent || 0}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">
                    Amount Spent
                  </Typography>
                  <Typography fontWeight={600}>
                    ₹{walletData?.usage?.amountSpent?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">
                    Last Recharge
                  </Typography>
                  <Typography fontWeight={600}>
                    {walletData?.lastRecharge
                      ? new Date(walletData.lastRecharge).toLocaleDateString()
                      : '-'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Transaction History */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Transaction History" />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right">Balance After</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="textSecondary">No transactions found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction) => (
                        <TableRow key={transaction.id} hover>
                          <TableCell>
                            {transaction.created_at
                              ? new Date(transaction.created_at).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell>{transaction.description || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={transaction.type || 'N/A'}
                              size="small"
                              color={getTransactionColor(transaction.type)}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              color={
                                transaction.type === 'credit' || transaction.type === 'add'
                                  ? 'success.main'
                                  : 'error.main'
                              }
                              fontWeight={600}
                            >
                              {transaction.type === 'credit' || transaction.type === 'add' ? '+' : '-'}
                              ₹{Math.abs(transaction.amount || 0).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            ₹{(transaction.balance_after || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={totalTransactions}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10))
                  setPage(0)
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Funds Dialog */}
      <Dialog open={addFundsDialog} onClose={() => setAddFundsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Funds to Wallet</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>
                }}
                required
                helperText="Minimum amount: ₹100"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="e.g., Monthly recharge"
              />
            </Grid>
          </Grid>
          
          {/* Quick Amount Buttons */}
          <Box display="flex" gap={1} mt={3} flexWrap="wrap">
            {[500, 1000, 2000, 5000].map((amount) => (
              <Button
                key={amount}
                variant={addAmount === amount.toString() ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setAddAmount(amount.toString())}
              >
                ₹{amount}
              </Button>
            ))}
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            This is a demo. In production, this would integrate with a payment gateway.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddFundsDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddFunds}
            disabled={formLoading || !addAmount || parseFloat(addAmount) < 100}
          >
            {formLoading ? <CircularProgress size={24} /> : `Add ₹${addAmount || '0'}`}
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

export default Billing
