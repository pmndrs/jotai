import React from 'react'
import { Popover } from '@headlessui/react'

import { Button, Navigation } from '../components'

export const Menu = () => {
  return (
    <Popover className="relative">
      <Popover.Button className="focus:outline-none">
        <Button icon="menu" className="font-bold tracking-wider uppercase">
          Menu
        </Button>
      </Popover.Button>
      <Popover.Panel className="absolute z-10 mt-2">
        <Navigation className="flex flex-col p-4 space-y-4 border border-gray-200 rounded-lg bg-white shadow-2xl" />
      </Popover.Panel>
    </Popover>
  )
}
