import React from 'react'

import { Panel, Navigation } from '../components'

export const Footer = () => {
  return (
    <footer className="lg:hidden">
      <Panel headline="Resources" />
      <Navigation className="flex flex-col mt-4 space-y-4" />
      <a
        href="https://jessiewaters.com"
        target="_blank"
        title="Jessie Waters"
        className="block mt-6 text-xs text-gray-400 tracking-widest uppercase">
        Art by Jessie Waters
      </a>
    </footer>
  )
}
