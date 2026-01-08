'use client'

// Third-party Imports
import Image from 'next/image'

import styled from '@emotion/styled'

// Config Imports
import themeConfig from '@configs/themeConfig'

const LogoText = styled.span`
  color: ${({ color }) => color ?? 'var(--mui-palette-text-primary)'};
  font-size: 1.25rem;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0.15px;
  text-transform: uppercase;
  margin-inline-start: 10px;
`


const Logo = () => {
  return (
    <div className='flex items-center '>
      <Image
        src='/images/logos/image.png'
        alt='Nyife Chat Logo'
        width={200}
        height={40}
        className='object-contain'
      />
    </div>
  )
}

export default Logo
