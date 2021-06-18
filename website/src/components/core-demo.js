import React from 'react'
import { useAtom } from 'jotai'

import { textAtom, uppercaseAtom } from '../atoms'
import { Code } from '../components'

export const CoreDemo = () => {
  const Input = () => {
    const [text, setText] = useAtom(textAtom)

    return (
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="w-full focus:outline-none"
      />
    )
  }

  const Uppercase = () => {
    const [uppercase] = useAtom(uppercaseAtom)

    return <span className="flex-shrink-0 font-bold">{uppercase}</span>
  }

  const code = `import { atom, useAtom } from 'jotai'

// Create your atoms and derivatives
const textAtom = atom('hello')
const uppercaseAtom = atom((get) => get(textAtom).toUpperCase())

// Use them anywhere in your app
const Input = () => {
  const [text, setText] = useAtom(textAtom)
  return <input value={text} onChange={(e) => setText(e.target.value)} />
}

const Uppercase = () => {
  const [uppercase] = useAtom(uppercaseAtom)
  return <div>Uppercase: {uppercase}</div>
}

// Now you have the components
const MyApp = () => {
  return (
    <>
      <Input />
      <Uppercase />
    </>
  )
}`

  return (
    <>
      <div className="py-8 text-sm">
        <div className="flex items-center px-4 py-2 focus:outline-none focus:shadow-outline border border-gray-300 rounded-lg bg-white text-lg">
          <Input />
          <Uppercase />
        </div>
      </div>
      <Code code={code} />
    </>
  )
}
