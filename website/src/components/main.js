import React from 'react'

export const Main = ({ children }) => {
  return (
    <main className="lg:flex-shrink w-full lg:max-w-5xl p-8 lg:p-16 lg:pl-8 lg:pt-24 space-y-16">
      {children}
    </main>
  )
}
