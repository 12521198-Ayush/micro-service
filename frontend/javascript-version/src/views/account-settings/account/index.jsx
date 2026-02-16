// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import AccountDetails from './AccountDetails'
import ChangePassword from './ChangePassword'
import AccountDelete from './AccountDelete'
import LogoUpload from './LogoUpload'

const Account = () => {
  return (
    <Grid container spacing={6}>
      {/* <Grid item xs={12}>
        <LogoUpload />
      </Grid> */}
      <Grid item xs={12}>
        <AccountDetails />
      </Grid>
      <Grid item xs={12}>
        <ChangePassword />
      </Grid>
      <Grid item xs={12}>
        <AccountDelete />
      </Grid>
    </Grid>
  )
}

export default Account
