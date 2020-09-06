import React from 'react'
import { Provider, atom, useAtom } from 'jotai'

import PrismCode from 'react-prism'
import 'prismjs'
import 'prismjs/components/prism-jsx.min'

const textAtom = atom<string>('hello')
const textLenAtom = atom((get) => get(textAtom).length)
const uppercaseAtom = atom((get) => get(textAtom).toUpperCase())

const Input = () => {
  const [text, setText] = useAtom(textAtom)
  return (
    <input
      className="bg-white focus:outline-none focus:shadow-outline border border-gray-300 rounded py-2 px-4 block w-full appearance-none leading-normal"
      value={text}
      onChange={(e) => setText(e.target.value)}
    />
  )
}

const CharCount = () => {
  const [len] = useAtom(textLenAtom)
  return <div>Length: {len}</div>
}

const Uppercase = () => {
  const [uppercase] = useAtom(uppercaseAtom)
  return uppercase
}

const code = `import { Provider, atom, useAtom } from 'jotai'

// 1️⃣ create your atoms
const textAtom = atom('hello')
const uppercaseAtom = atom((get) => get(textAtom).toUpperCase())

// 2️⃣ use them anywhere in your app
const Input = () => {
  const [text, setText] = useAtom(textAtom)
  return <input value={text} onChange={(e) => setText(e.target.value)} />
}

const Uppercase = () => {
  const [uppercase] = useAtom(uppercaseAtom)
  return <div>Uppercase: {uppercase}</div>
}

// 3️⃣ Wrap your components in the Jotai provider
const MyApp = () => (
  <Provider>
    <Input />
    <Uppercase />
  </Provider>
)
`

const App = () => (
  <div>
    <p className="">A simple example:</p>
    <div
      className="
      ">
      <div className="py-8 text-sm">
        <Provider>
          <div className="relative">
            <Input />
            <div className="absolute top-0 right-0 h-full flex items-center mr-4 font-bold">
              <Uppercase />
            </div>
          </div>
        </Provider>
      </div>

      <div className="">
        <PrismCode component="pre" className="language-jsx" children={code} />
      </div>
    </div>
  </div>
)

export default App
