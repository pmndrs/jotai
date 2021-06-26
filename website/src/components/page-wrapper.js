import React from 'react'
import cx from 'classnames'
import { useAtom } from 'jotai'

import { darkModeAtom } from '../atoms'

export const PageWrapper = ({ children }) => {
  const [darkMode] = useAtom(darkModeAtom)

  return (
    <div
      className={cx(
        darkMode && 'dark',
        'relative flex flex-col lg:flex-row lg:justify-around lg:max-w-[1920px] lg:mx-auto'
      )}>
      {children}
    </div>
  )
}
