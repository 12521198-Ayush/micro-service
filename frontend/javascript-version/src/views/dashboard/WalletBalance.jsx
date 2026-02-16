'use client'

// React Imports
import { useState, useEffect } from 'react'

// Next Auth Imports
import { useSession, signOut } from 'next-auth/react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'

// Service Imports
import { getWalletBalance } from '@/libs/user-service'

const WalletBalance = () => {
    // States
    const [loading, setLoading] = useState(true)
    const [walletData, setWalletData] = useState(null)

    // Hooks
    const { data: session } = useSession()

    useEffect(() => {
        const fetchWalletBalance = async () => {
            if (!session?.accessToken) return

            try {
                const response = await getWalletBalance(session.accessToken)

                setWalletData(response)
            } catch (err) {
                console.error('Failed to fetch wallet balance:', err)

                if (err.status === 401 || err.status === 403) {
                    signOut({ callbackUrl: '/login' })
                }
            } finally {
                setLoading(false)
            }
        }

        fetchWalletBalance()
    }, [session?.accessToken])

    if (loading) {
        return (
            <Card>
                <CardHeader title='Wallet Balance' />
                <CardContent>
                    <Skeleton variant='text' width='60%' height={40} />
                    <Skeleton variant='text' width='80%' height={30} />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader
                title='Wallet Balance'
                action={
                    <Chip
                        label='Active'
                        color='success'
                        size='small'
                        variant='tonal'
                    />
                }
            />
            <CardContent>
                <div className='flex flex-col gap-4'>
                    <div>
                        <Typography variant='h3' color='primary'>
                            ₹{walletData?.balance?.toFixed(2) || '0.00'}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            Available Balance
                        </Typography>
                    </div>

                    {walletData?.pricing && (
                        <div className='flex flex-col gap-2 mt-4'>
                            <Typography variant='subtitle2' color='text.secondary'>
                                Message Pricing
                            </Typography>
                            <div className='flex justify-between items-center'>
                                <Typography variant='body2'>Marketing Message</Typography>
                                <Typography variant='body2' fontWeight='medium'>
                                    ₹{walletData.pricing.marketingMessage?.toFixed(2) || '0.00'}
                                </Typography>
                            </div>
                            <div className='flex justify-between items-center'>
                                <Typography variant='body2'>Utility Message</Typography>
                                <Typography variant='body2' fontWeight='medium'>
                                    ₹{walletData.pricing.utilityMessage?.toFixed(2) || '0.00'}
                                </Typography>
                            </div>
                            <div className='flex justify-between items-center'>
                                <Typography variant='body2'>Auth Message</Typography>
                                <Typography variant='body2' fontWeight='medium'>
                                    ₹{walletData.pricing.authMessage?.toFixed(2) || '0.00'}
                                </Typography>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default WalletBalance
