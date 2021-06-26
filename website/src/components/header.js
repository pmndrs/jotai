import React from 'react'
import { StaticImage } from 'gatsby-plugin-image'

import { Jotai } from '../components'

export const Header = () => {
  return (
    <header>
      <Jotai className="lg:hidden max-w-xs" />
      <div className="flex items-center mt-16 lg:mt-0 sm:px-16 lg:px-0 space-x-4 sm:space-x-8">
        <StaticImage
          src="../images/ghost_DRAFT.png"
          className="w-1/3 lg:w-1/4"
          imgStyle={{ objectFit: 'contain' }}
          layout="fullWidth"
          placeholder="blurred"
          formats={['auto']}
          sizes="50vw"
          outputPixelDensities={[1]}
          breakpoints={[240, 480, 640, 768, 1080]}
          alt="Jotai mascot"
        />
        <div className="relative w-2/3 lg:w-3/4 p-4 lg:p-8 space-y-4 bg-gray-100 rounded-xl text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 leading-relaxed speech-bubble">
          <p>
            No extra re-renders, state resides within React, you get the full
            benefits from suspense and concurrent features.
          </p>
          <p>
            It’s scalable from a simple React.useState replacement to a large
            scale application with complex requirements.
          </p>
        </div>
      </div>
    </header>
  )
}
