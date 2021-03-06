import { atom, useAtom } from 'jotai'

import PrismCode from 'react-prism'
import 'prismjs'
import 'prismjs/components/prism-jsx.min'

const textAtom = atom<string>('hello')
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

const Uppercase = () => {
  const [uppercase] = useAtom(uppercaseAtom)
  return <>{uppercase}</>
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
const MyApp = () => (
  <div>
    <Input />
    <Uppercase />
  </div>
)
`

const App = () => (
  <div>
    <p>A simple example:</p>
    <div>
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
      <div>
        <PrismCode component="pre" className="language-jsx" children={code} />
      </div>
    </div>
  </div>
)

export default App
