// MUI Imports
import Tooltip from '@mui/material/Tooltip'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CardActions from '@mui/material/CardActions'
import Button from '@mui/material/Button'

// Third-party Imports
import classnames from 'classnames'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Style Imports
import styles from './styles.module.css'

const TooltipContent = () => {
  return (
    <Card>
      <CardHeader title={`${themeConfig.templateName} - Premium Features`} />
      <CardContent>
        <Typography color='textSecondary' className='mbe-4'>
          {`Upgrade to ${themeConfig.templateName} Premium for advanced features and priority support.`}
        </Typography>
        <Typography color='textSecondary'>Click below to learn more about premium features.</Typography>
      </CardContent>
      <CardActions>
        <Button variant='contained' href='#'>
          Learn More
        </Button>
      </CardActions>
    </Card>
  )
}

const UpgradeToProButton = () => {
  return (
    <div className={classnames(styles.wrapper, 'mui-fixed')}>
      <Tooltip
        title={<TooltipContent />}
        placement='top-end'
        slotProps={{ tooltip: { style: { padding: 0, backgroundColor: 'transparent', maxInlineSize: 400 } } }}
      >
        <a
          className={styles.button}
          role='button'
          href='#'
        >
          Upgrade to Pro
          <span className={styles.buttonInner} />
        </a>
      </Tooltip>
    </div>
  )
}

export default UpgradeToProButton
