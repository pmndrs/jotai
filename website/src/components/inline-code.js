import React from 'react'

export const InlineCode = ({ children }) => {
  return (
    <code className="px-1 py-0.5 bg-gray-50 rounded text-xs lg:text-sm text-gray-900">
      {children}
    </code>
  )
}
