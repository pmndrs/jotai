import React from 'react'

import { Navigation } from '../components'

export const Footer = () => {
  return (
    <footer className="lg:hidden mt-8">
      <div className="prose">
        <h2>Resources</h2>
      </div>
      <Navigation
        isFooter
        className="flex flex-col mt-4 space-y-4 text-gray-700 !no-underline"
      />
      <a
        href="https://jessiewaters.com"
        target="_blank"
        title="Jessie Waters"
        className="block mt-6 text-xs !text-gray-400 tracking-widest uppercase">
        Art by Jessie Waters
      </a>
    </footer>
  )
}
