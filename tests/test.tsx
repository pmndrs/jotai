import React from 'react'
import { fireEvent, cleanup, render } from '@testing-library/react'
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

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(c => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
})

it('uses a read-only derived atom', async () => {
  const countAtom = atom(0)
  const doubledCountAtom = atom(get => get(countAtom) * 2)

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const [doubledCount] = useAtom(doubledCountAtom)
    return (
      <>
        <div>count: {count}</div>
        <div>doubledCount: {doubledCount}</div>
        <button onClick={() => setCount(c => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0')
  await findByText('doubledCount: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
  await findByText('doubledCount: 2')
})

it('uses a read-write derived atom', async () => {
  const countAtom = atom(0)
  const doubledCountAtom = atom(
    get => get(countAtom) * 2,
    (get, set, writeValue: number) =>
      set(countAtom, get(countAtom) + writeValue)
  )

  const Counter: React.FC = () => {
    const [count] = useAtom(countAtom)
    const [doubledCount, increaseCount] = useAtom(doubledCountAtom)
    return (
      <>
        <div>count: {count}</div>
        <div>doubledCount: {doubledCount}</div>
        <button onClick={() => increaseCount(2)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0')
  await findByText('doubledCount: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  await findByText('doubledCount: 4')
})

it('uses a write-only derived atom', async () => {
  const countAtom = atom(0)
  const incrementCountAtom = atom(null, (get, set) =>
    set(countAtom, get(countAtom) + 1)
  )

  const Counter: React.FC = () => {
    const [count] = useAtom(countAtom)
    return <div>count: {count}</div>
  }

  const Control: React.FC = () => {
    const [, increment] = useAtom(incrementCountAtom)
    return <button onClick={increment}>button</button>
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
      <Control />
    </Provider>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
})

it('only re-renders if value has changed', async () => {
  const count1Atom = atom(0)
  const count2Atom = atom(0)
  const productAtom = atom(get => get(count1Atom) * get(count2Atom))

  type Props = { countAtom: typeof count1Atom; name: string }
  const Counter: React.FC<Props> = ({ countAtom, name }) => {
    const [count, setCount] = useAtom(countAtom)
    const renderCount = React.useRef(0)
    return (
      <>
        <div>
          renderCount: {++renderCount.current}, {name}: {count}
        </div>
        <button onClick={() => setCount(c => c + 1)}>button-{name}</button>
      </>
    )
  }

  const Product: React.FC = () => {
    const [product] = useAtom(productAtom)
    const renderCount = React.useRef(0)
    return (
      <>
        <div>
          renderCount: {++renderCount.current}, product: {product}
        </div>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter countAtom={count1Atom} name="count1" />
      <Counter countAtom={count2Atom} name="count2" />
      <Product />
    </Provider>
  )

  await findByText('renderCount: 1, count1: 0')
  await findByText('renderCount: 1, count2: 0')
  await findByText('renderCount: 1, product: 0')

  fireEvent.click(getByText('button-count1'))
  await findByText('renderCount: 2, count1: 1')
  await findByText('renderCount: 1, count2: 0')
  await findByText('renderCount: 1, product: 0')

  fireEvent.click(getByText('button-count2'))
  await findByText('renderCount: 2, count1: 1')
  await findByText('renderCount: 2, count2: 1')
  await findByText('renderCount: 2, product: 1')
})
