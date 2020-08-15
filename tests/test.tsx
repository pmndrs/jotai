import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../src/index'

const consoleError = console.error
afterEach(() => {
  cleanup()
  console.error = consoleError
})

it('creates atoms', () => {
  // primitive atom
  const countAtom = atom(0)
  const anotherCountAtom = atom(1)
  // read-only derived atom
  const doubledCountAtom = atom(get => get(countAtom) * 2)
  // read-write derived atom
  const sumCountAtom = atom(
    get => get(countAtom) + get(anotherCountAtom),
    (get, set, value: number) => {
      set(countAtom, get(countAtom) + value / 2)
      set(anotherCountAtom, get(anotherCountAtom) + value / 2)
    }
  )
  // write-only derived atom
  const decrementCountAtom = atom(undefined, (get, set) => {
    set(countAtom, get(countAtom) - 1)
  })
  expect({
    countAtom,
    doubledCountAtom,
    sumCountAtom,
    decrementCountAtom,
  }).toMatchInlineSnapshot(`
    Object {
      "countAtom": Object {
        "initialValue": 0,
        "read": [Function],
        "write": [Function],
      },
      "decrementCountAtom": Object {
        "initialValue": undefined,
        "read": [Function],
        "write": [Function],
      },
      "doubledCountAtom": Object {
        "initialValue": 0,
        "read": [Function],
      },
      "sumCountAtom": Object {
        "initialValue": 1,
        "read": [Function],
        "write": [Function],
      },
    }
  `)
})

it('uses a primitive atom', async () => {
  const countAtom = atom(0)

  function Counter() {
    const [count, setCount] = useAtom(countAtom)
    React.useEffect(() => {
      setCount(c => c + 1)
    }, [setCount])
    return <div>count: {count}</div>
  }

  const { findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 1')
})

it('uses a read-only derived atom', async () => {
  const countAtom = atom(0)
  const doubledCountAtom = atom(get => get(countAtom) * 2)

  function Counter() {
    const [count, setCount] = useAtom(countAtom)
    const [doubledCount] = useAtom(doubledCountAtom)
    React.useEffect(() => {
      setCount(c => c + 1)
    }, [setCount])
    return (
      <>
        <div>count: {count}</div>
        <div>doubledCount: {doubledCount}</div>
      </>
    )
  }

  const { findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('doubledCount: 2')
})
