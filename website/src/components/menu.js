import React from 'react'
import cx from 'classnames'
import { useAtom } from 'jotai'

import { menuAtom } from '../atoms'
import { Button, Navigation } from '../components'

export const Menu = () => {
  const [isMenuOpen, setIsMenuOpen] = useAtom(menuAtom)

  return (
    <>
      <div className="fixed bottom-0 right-0 lg:hidden p-4">
        <div className="relative z-10 flex flex-col items-end space-y-4">
          <div className="relative z-40 focus:outline-none shadow-2xl">
            <Button
              onClick={() => setIsMenuOpen(true)}
              icon="menu"
              dark
              className="font-bold tracking-wider uppercase">
              Menu
            </Button>
          </div>
        </div>
      </div>
      <div
        className={cx(
          isMenuOpen
            ? 'opacity-100 lg:opacity-0 pointer-events-auto lg:pointer-events-none'
            : 'opacity-0 pointer-events-none',
          'fixed inset-0 z-50 flex items-end max-h-screen p-4 sm:p-8 bg-black/75 transition ease-in-out duration-300'
        )}>
        <div className="w-full max-h-full overflow-y-scroll p-4 sm:p-8 border border-gray-300 rounded-lg bg-white shadow-2xl !overscroll-none">
          <div className="pb-16 sm:pb-20">
            <Navigation
              className="flex flex-col space-y-4 sm:space-y-8"
              docsNavClassName="px-3"
            />
          </div>
          <div className="fixed left-8 sm:left-auto right-8 sm:right-16 bottom-8 sm:bottom-16 z-70">
            <Button
              onClick={() => setIsMenuOpen(false)}
              icon="close"
              dark
              className="w-full font-bold tracking-wider uppercase">
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
