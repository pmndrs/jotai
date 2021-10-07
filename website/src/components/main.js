import React from 'react'

export const Main = ({ children, ...rest }) => {
  return (
    <main
      className="lg:flex-shrink lg:max-w-prose xl:max-w-4xl 2xl:max-w-5xl lg:mt-8 p-6 sm:p-8 xl:p-16"
      {...rest}>
      {children}
    </main>
  )
}
