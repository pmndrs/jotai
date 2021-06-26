import React from 'react'

import { Logo } from '../components'

export const Jotai = (props) => {
  return (
    <div {...props}>
      <h1 className="lg:px-2">
        <Logo className="w-full max-w-[12rem] lg:max-w-none" />
        <span className="sr-only">Jotai</span>
      </h1>
      <div className="flex items-center mt-6 lg:mt-8 space-x-6 lg:space-x-8 text-gray-600">
        <div className="text-xl lg:text-2xl whitespace-nowrap">状態</div>
        <h2 className="text-base lg:text-lg leading-snug">
          Primitive and flexible state management for React
        </h2>
      </div>
    </div>
  )
}
