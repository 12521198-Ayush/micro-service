// MUI Imports
import Chip from '@mui/material/Chip'
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Component Imports
import { Menu, SubMenu, MenuItem, MenuSection } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

const RenderExpandIcon = ({ open, transitionDuration }) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }) => {
  // Hooks
  const theme = useTheme()
  const { isBreakpointReached, transitionDuration } = useVerticalNav()
  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
          className: 'bs-full overflow-y-auto overflow-x-hidden',
          onScroll: container => scrollMenu(container, false)
        }
        : {
          options: { wheelPropagation: false, suppressScrollX: true },
          onScrollY: container => scrollMenu(container, true)
        })}
    >
      {/* Custom Sidebar Menu as per requirements */}
      <Menu
        menuItemStyles={menuItemStyles(theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
        menuSectionStyles={menuSectionStyles(theme)}
      >
        {/* Dashboard */}
        <MenuItem href='/' icon={<i className='ri-dashboard-line' />}>Dashboard</MenuItem>
        
        {/* WhatsApp Inbox - Chat with contacts */}
        <MenuItem href='/inbox' icon={<i className='ri-inbox-line' />}>Inbox</MenuItem>
        
        {/* Contacts Management */}
        <SubMenu label='Contacts' icon={<i className='ri-contacts-line' />}>
          <MenuItem href='/contacts'>All Contacts</MenuItem>
          <MenuItem href='/groups'>Contact Groups</MenuItem>
        </SubMenu>
        
        {/* Campaign Management */}
        <SubMenu label='Campaigns' icon={<i className='ri-megaphone-line' />}>
          <MenuItem href='/campaigns/list'>All Campaigns</MenuItem>
          <MenuItem href='/campaigns/create'>Create Campaign</MenuItem>
        </SubMenu>
        
        {/* Message Templates */}
        <SubMenu label='Message Templates' icon={<i className='ri-file-list-2-line' />}>
          <MenuItem href='/message-template/list'>All Templates</MenuItem>
          <MenuItem href='/message-template/create'>Create Template</MenuItem>
        </SubMenu>
        
        {/* Team Management */}
        <SubMenu label='Team' icon={<i className='ri-team-line' />}>
          <MenuItem href='/team/list'>Departments & Agents</MenuItem>
        </SubMenu>
        
        {/* Settings */}
        <SubMenu label='Settings' icon={<i className='ri-settings-4-line' />}>
          <MenuItem href='/whatsapp-setup' icon={<i className='ri-whatsapp-line' />}>WhatsApp Setup</MenuItem>
          <MenuItem href='/account-settings'>Account Settings</MenuItem>
        </SubMenu>
        
        {/* Billing */}
        <MenuItem href='/billing' icon={<i className='ri-bill-line' />}>Billing</MenuItem>
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
