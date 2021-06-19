import React from 'react'

import { Panel, Navigation } from '../components'

export const Sidebar = () => {
  return (
    <aside className="sticky top-0 hidden lg:flex flex-col flex-shrink-0 justify-between w-full max-w-sm min-h-full max-h-screen overflow-y-auto p-16 pr-8">
      <div>
        <img
          src="/ghost_DRAFT.png"
          alt="Jotai mascot"
          className="w-full max-w-full h-auto mx-auto object-contain"
        />
        <a
          href="https://jessiewaters.com"
          target="_blank"
          title="Jessie Waters"
          className="block mt-6 text-xs text-gray-400 text-center tracking-widest uppercase">
          Artwork by Jessie Waters
        </a>
      </div>
      <Navigation className="flex flex-col mt-6 space-y-4" />
    </aside>
  )
}
