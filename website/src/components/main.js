import React from 'react'
import cx from 'classnames'

export const Main = ({ className = '', children, ...rest }) => {
  const mainClassNames = cx(
    'lg:flex-shrink w-full lg:max-w-2xl 2xl:max-w-5xl p-8 lg:p-16 lg:pl-8 lg:pt-20 prose',
    className
  )

  return (
    <main className={mainClassNames} {...rest}>
      {children}
    </main>
  )
}
