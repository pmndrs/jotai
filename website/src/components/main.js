import React from 'react'

export const Main = ({ children, ...rest }) => {
  return (
    <main
      className="lg:flex-shrink lg:max-w-prose xl:max-w-5xl p-8 lg:p-12 xl:p-16"
      {...rest}>
      {children}
    </main>
  )
}
