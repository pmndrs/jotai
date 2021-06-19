import React from 'react'

import { Logo, Menu } from '../components'

export const Header = () => {
  return (
    <header>
      <h1 className="flex items-center w-full max-w-xs mt-8 lg:mt-0 text-gray-800">
        <img
          src="/ghost_DRAFT.png"
          alt="Jotai mascot"
          className="lg:hidden w-1/3 pr-2"
        />
        <Logo className="w-2/3 lg:w-full pl-2 lg:pl-0" />
        <span className="sr-only">Jotai</span>
      </h1>
      <h2 className="flex items-center mt-8 text-gray-400">
        <div className="lg:hidden">
          <Menu />
        </div>
        <div className="hidden lg:block lg:text-xl whitespace-nowrap">状態</div>
        <div className="ml-8 text-sm lg:text-xl leading-snug">
          Primitive and flexible state management for React
        </div>
      </h2>
      <h3 className="mt-8 text-lg lg:text-3xl text-gray-600 leading-relaxed">
        No extra re-renders, state resides within React, you get the full
        benefits from suspense and concurrent features.
        <br />
        <br />
        It’s scalable from a simple React.useState replacement to a large scale
        application with complex requirements.
      </h3>
    </header>
  )
}
