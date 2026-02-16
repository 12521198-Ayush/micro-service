// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

const Award = () => {
  return (
    <Card>
      <CardContent className='flex flex-col gap-2 relative items-start'>
        <div>
          <Typography variant='h5'>Great job, Team! 🎉</Typography>
          <Typography>Highest message delivery rate this month</Typography>
        </div>
        <div>
          <Typography variant='h4' color='primary'>
            98.2%
          </Typography>
          <Typography>Delivery ratio across all channels 🚀</Typography>
        </div>
        <Button size='small' variant='contained'>
          View Messaging Analytics
        </Button>
        <img
          src='/images/pages/trophy.png'
          alt='trophy image'
          height={102}
          className='absolute inline-end-7 bottom-6'
        />
      </CardContent>
    </Card>
  )
}

export default Award
