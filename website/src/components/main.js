import React from 'react'

export const Main = ({ children, ...rest }) => {
  return (
    <main
      className="lg:flex-shrink w-full lg:max-w-prose xl:max-w-4xl 2xl:max-w-5xl p-8 lg:p-16 lg:pl-8 lg:pt-20"
      {...rest}>
      {children}
    </main>
  )
}
