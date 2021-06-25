import React from 'react'
import { Popover } from '@headlessui/react'

import { Button, Navigation } from '../components'

export const Menu = () => {
  return (
    <div className="fixed bottom-0 right-0 lg:hidden p-4">
      <Popover className="relative z-10 flex flex-col items-end space-y-4">
        <Popover.Panel className="relative z-20">
          <Navigation className="relative z-30 flex flex-col p-4 space-y-4 border border-gray-700 rounded-lg bg-gray-900 shadow-2xl" />
        </Popover.Panel>
        <Popover.Button className="relative z-40 focus:outline-none shadow-2xl">
          <Button
            icon="menu"
            dark={true}
            className="font-bold tracking-wider uppercase">
            Menu
          </Button>
        </Popover.Button>
      </Popover>
    </div>
  )
}
