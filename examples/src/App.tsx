import React from 'react'
import { Provider, atom, useAtom } from 'jotai'

const textAtom = atom<string>('hello')
const textLenAtom = atom((get) => get(textAtom).length)
const uppercaseAtom = atom((get) => get(textAtom).toUpperCase())

const Input = () => {
  const [text, setText] = useAtom(textAtom)
  return <input value={text} onChange={(e) => setText(e.target.value)} />
}

const CharCount = () => {
  const [len] = useAtom(textLenAtom)
  return <div>Length: {len}</div>
}

const Uppercase = () => {
  const [uppercase] = useAtom(uppercaseAtom)
  return <div>Uppercase: {uppercase}</div>
}

const App = () => (
  <div className="container mx-auto px-8">
    <header className="mt-12 mb-12">
      <h1 className="text-6xl font-bold">Jōtai</h1>
      <h2
        className="
        text-3xl font-weight-500 text-gray-400 
        lg:flex justify-between">
        <div>Primitive and flexible state management for React.</div>
        <div className="text-xl font-weight-300 text-gray-900">状態 </div>
      </h2>
    </header>
    <Provider>
      <Input />
      <CharCount />
      <Uppercase />
    </Provider>
  </div>
)

export default App
