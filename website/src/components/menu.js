import React, { useRef } from 'react'
import { atom, useAtom } from 'jotai'

import { Button, Navigation } from '../components'
import { useOnClickOutside } from '../hooks'

const menuAtom = atom(false)

export const Menu = () => {
  const [isMenuOpen, setIsMenuOpen] = useAtom(menuAtom)
  const node = useRef()

  useOnClickOutside(node, () => {
    setIsMenuOpen(false)
  })

  return (
    <div ref={node} className="fixed bottom-0 right-0 lg:hidden p-4">
      <div className="relative z-10 flex flex-col items-end space-y-4">
        {isMenuOpen && (
          <div className="relative z-20">
            <Navigation className="relative z-30 flex flex-col p-4 space-y-4 border border-gray-700 rounded-lg bg-gray-900 shadow-2xl" />
          </div>
        )}
        <div className="relative z-40 focus:outline-none shadow-2xl">
          <Button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            icon="menu"
            dark={true}
            className="font-bold tracking-wider uppercase">
            Menu
          </Button>
        </div>
      </div>
    </div>
  )
}
