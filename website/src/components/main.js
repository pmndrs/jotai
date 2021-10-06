import React from 'react'

export const Main = ({ children, ...rest }) => {
  return (
    <main
      className="lg:flex-shrink lg:max-w-5xl p-8 lg:p-16 lg:pl-8 lg:pt-20"
      {...rest}>
      {children}
    </main>
  )
}
