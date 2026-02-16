// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

// Components Imports
import OptionMenu from '@core/components/option-menu'

// Vars
const data = [
  {
    progress: 75,
    title: 'Zipcar',
    amount: '$24,895.65',
    subtitle: 'Vuejs, React & HTML',
    imgSrc: '/images/cards/zipcar.png'
  },
  {
    progress: 50,
    color: 'info',
    title: 'Bitbank',
    amount: '$8,650.20',
    subtitle: 'Sketch, Figma & XD',
    imgSrc: '/images/cards/bitbank.png'
  },
  {
    progress: 20,
    title: 'Aviato',
    color: 'secondary',
    amount: '$1,245.80',
    subtitle: 'HTML & Angular',
    imgSrc: '/images/cards/aviato.png'
  }
]

const TotalEarning = () => {
  return (
    <Card>
      <CardHeader
        title='Replied Customers'
        action={<OptionMenu iconClassName='text-textPrimary' options={['Last 28 Days', 'Last Month', 'Last Year']} />}
      ></CardHeader>
      <CardContent className='flex flex-col gap-11 md:mbs-2.5'>
        <div>
          <div className='flex items-center'>
            <Typography variant='h3'>2,300</Typography>
            <i className='ri-arrow-up-s-line align-bottom text-success'></i>
            <Typography component='span' color='success.main'>
              12%
            </Typography>
          </div>
          <Typography>Compared to 2,050 last month</Typography>
        </div>
        <div className='flex flex-col gap-6'>
          <div className='flex items-center gap-3'>
            <Avatar src='/images/cards/whatsapp.png' variant='rounded' className='bg-actionHover' />
            <div className='flex flex-col gap-0.5'>
              <Typography color='text.primary' className='font-medium'>WhatsApp</Typography>
              <Typography>Replied: 1,200</Typography>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Avatar src='/images/cards/sms.png' variant='rounded' className='bg-actionHover' />
            <div className='flex flex-col gap-0.5'>
              <Typography color='text.primary' className='font-medium'>SMS</Typography>
              <Typography>Replied: 800</Typography>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Avatar src='/images/cards/rcs.png' variant='rounded' className='bg-actionHover' />
            <div className='flex flex-col gap-0.5'>
              <Typography color='text.primary' className='font-medium'>RCS</Typography>
              <Typography>Replied: 300</Typography>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TotalEarning
