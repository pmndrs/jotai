import React from 'react'

export const InlineCode = ({ children }) => {
  return (
    <code className="relative -top-px px-1 py-0.5 bg-gray-100 rounded text-black">
      {children}
    </code>
  )
}
