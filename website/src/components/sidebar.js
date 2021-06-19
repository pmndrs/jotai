import React from 'react'
import { StaticImage } from 'gatsby-plugin-image'

import { Navigation } from '../components'

export const Sidebar = () => {
  return (
    <aside className="sticky top-0 hidden lg:flex flex-col flex-shrink-0 justify-between w-full max-w-sm min-h-full max-h-screen overflow-y-auto p-16 pr-8">
      <div>
        <StaticImage
          src="../images/ghost_DRAFT.png"
          className="w-full max-w-full h-auto mx-auto"
          imgStyle={{ objectFit: 'contain' }}
          placeholder="blurred"
          formats={['auto']}
          quality="90"
          alt="Jotai mascot"
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
