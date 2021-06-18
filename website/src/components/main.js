import React from 'react'

export const Main = ({ children }) => {
  return (
    <main className="lg:flex-shrink w-full lg:max-w-4xl p-8 lg:p-16 lg:pl-8 pt-26 lg:pt-32 space-y-16">
      {children}
    </main>
  )
}
