import React from 'react'
import { Provider, atom, useAtom } from 'jotai'

import PrismCode from 'react-prism'
import 'prismjs'
import 'prismjs/components/prism-jsx.min'
import 'prismjs/themes/prism-okaidia.css'

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
  return <div>Uppercase: {uppercase}</div>
}

const code = `const textAtom = atom('hello')
const textLenAtom = atom((get) => get(textAtom).length)
const uppercaseAtom = atom((get) => get(textAtom).toUpperCase())

const Input = () => {
  const [text, setText] = useAtom(textAtom)
  return <input 
    value={text} 
    onChange={(e) => setText(e.target.value)} 
  />
}

const CharCount = () => {
  const [len] = useAtom(textLenAtom)
  return <div>Length: {len}</div>
}

const Uppercase = () => {
  const [uppercase] = useAtom(uppercaseAtom)
  return <div>Uppercase: {uppercase}</div>
}`

const App = () => (
  <div>
    <h3 className="font-bold text-2xl">A simple example.</h3>
    <div
      className="
        lg:flex
        lg:space-x-20
      ">
      <div className="lg:w-7/12 py-8 text-sm">
        <PrismCode component="pre" className="language-jsx" children={code} />
      </div>

      <div className="lg:w-5/12">
        <Provider>
          <Input />
          <CharCount />
          <Uppercase />
        </Provider>
      </div>
    </div>
  </div>
)

export default App
