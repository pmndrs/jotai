import React from 'react'
import { useAtom } from 'jotai'

import { countAtom } from '../atoms'
import { Button, Code } from '../components'

export const IntegrationsDemo = () => {
  const [count, setCount] = useAtom(countAtom)

  const increment = () => setCount((c) => (c = c + 1))

  const code = `import { useAtom } from 'jotai'
import { atomWithImmer } from 'jotai/immer'

// Create a new atom with an immer-based write function
const countAtom = atomWithImmer(0)

const Counter = () => {
  const [count] = useAtom(countAtom)
  return <div>count: {count}</div>
}

const Controls = () => {
  // setCount === update: (draft: Draft<Value>) => void
  const [, setCount] = useAtom(countAtom)
  const increment = () => setCount((c) => (c = c + 1))
  return <button onClick={increment}>+1</button>
}`

  return (
    <>
      <div className="flex items-center py-8 space-x-8">
        <Button onClick={increment} icon="plus">
          Increment
        </Button>
        <span className="font-bold text-3xl ordinal slashed-zero tabular-nums">
          {count}
        </span>
      </div>
      <Code code={code} />
    </>
  )
}
