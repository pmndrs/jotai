import React from 'react'
import cx from 'classnames'
import { useAtom } from 'jotai'

import { menuAtom } from '../atoms'
import { Button, Docs } from '../components'

export const Menu = () => {
  const [isMenuOpen, setIsMenuOpen] = useAtom(menuAtom)

  return (
    <>
      <div className="fixed left-0 bottom-0 right-0 lg:hidden">
        <div className="flex justify-center w-full p-4 space-x-4 border-t border-gray-700 bg-gray-900">
          <Button
            icon="github"
            to="https://github.com/pmndrs/jotai"
            external
            className="font-bold tracking-wider uppercase"
            dark
            small>
            GitHub
          </Button>
          <Button
            icon="npm"
            to="https://www.npmjs.com/package/jotai"
            external
            className="font-bold tracking-wider uppercase"
            dark
            small>
            npm
          </Button>
          <Button
            icon="book"
            onClick={() => setIsMenuOpen(true)}
            className="font-bold tracking-wider uppercase"
            dark
            small>
            Docs
          </Button>
        </div>
        <div className="w-full h-4 bg-black" />
      </div>
      <div
        className={cx(
          isMenuOpen
            ? 'opacity-100 lg:opacity-0 pointer-events-auto lg:pointer-events-none'
            : 'opacity-0 pointer-events-none',
          'fixed inset-0 z-50 flex items-end max-h-screen p-4 sm:p-6 bg-black/75 transition ease-in-out duration-300'
        )}>
        <div className="w-full max-h-full overflow-y-scroll p-8 border border-gray-300 rounded-lg bg-white shadow-2xl !overscroll-none">
          <div className="px-3 pb-16 sm:pb-0">
            <Docs />
          </div>
          <div className="fixed left-8 sm:left-auto right-8 sm:right-16 bottom-8 sm:bottom-16 z-70">
            <Button
              icon="close"
              onClick={() => setIsMenuOpen(false)}
              className="w-full font-bold tracking-wider uppercase"
              dark>
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
