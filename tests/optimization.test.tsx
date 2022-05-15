import { useRef } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import ReactDOM from 'react-dom'
import { atom, useAtom } from 'jotai'
import { getTestProvider } from './testUtils'

const Provider = getTestProvider()

// FIXME this is a hacky workaround temporarily
const IS_REACT18 = !!(ReactDOM as any).createRoot

it('only relevant render function called (#156)', async () => {
  const count1Atom = atom(0)
  const count2Atom = atom(0)

  const Counter1 = () => {
    const [count, setCount] = useAtom(count1Atom)
    const renderCount = useRef(0)
    ++renderCount.current
    return (
      <>
        <div>
          count1: {count} ({renderCount.current})
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button1</button>
      </>
    )
  }

  const Counter2 = () => {
    const [count, setCount] = useAtom(count2Atom)
    const renderCount = useRef(0)
    ++renderCount.current
    return (
      <>
        <div>
          count2: {count} ({renderCount.current})
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button2</button>
      </>
    )
  }

  const { getByText } = render(
    <Provider>
      <Counter1 />
      <Counter2 />
    </Provider>
  )

  await waitFor(() => {
    getByText('count1: 0 (1)')
    getByText('count2: 0 (1)')
  })

  fireEvent.click(getByText('button1'))
  await waitFor(() => {
    if (IS_REACT18) {
      getByText('count1: 1 (3)')
    } else {
      getByText('count1: 1 (2)')
    }
    getByText('count2: 0 (1)')
  })

  fireEvent.click(getByText('button2'))
  await waitFor(() => {
    if (IS_REACT18) {
      getByText('count1: 1 (3)')
      getByText('count2: 1 (3)')
    } else {
      getByText('count1: 1 (2)')
      getByText('count2: 1 (2)')
    }
  })
})

it('only render once using atoms with write-only atom', async () => {
  const count1Atom = atom(0)
  const count2Atom = atom(0)
  const incrementAtom = atom(null, (_get, set, _arg) => {
    set(count1Atom, (c) => c + 1)
    set(count2Atom, (c) => c + 1)
  })

  const Counter = () => {
    const [count1] = useAtom(count1Atom)
    const [count2] = useAtom(count2Atom)
    const renderCount = useRef(0)
    ++renderCount.current
    return (
      <div>
        count1: {count1}, count2: {count2} ({renderCount.current})
      </div>
    )
  }

  const Control = () => {
    const [, increment] = useAtom(incrementAtom)
    return <button onClick={increment}>button</button>
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
      <Control />
    </Provider>
  )

  await findByText('count1: 0, count2: 0 (1)')

  fireEvent.click(getByText('button'))
  if (IS_REACT18) {
    await findByText('count1: 1, count2: 1 (3)')
  } else {
    await findByText('count1: 1, count2: 1 (2)')
  }

  fireEvent.click(getByText('button'))
  if (IS_REACT18) {
    await findByText('count1: 2, count2: 2 (4)')
  } else {
    await findByText('count1: 2, count2: 2 (3)')
  }
})

it('useless re-renders with static atoms (#355)', async () => {
  // check out https://codesandbox.io/s/m82r5 to see the expected re-renders
  const countAtom = atom(0)
  const unrelatedAtom = atom(0)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    useAtom(unrelatedAtom)
    const renderCount = useRef(0)
    ++renderCount.current

    return (
      <>
        <div>
          <p>
            count: {count} ({renderCount.current})
          </p>
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0 (1)')

  fireEvent.click(getByText('button'))
  if (IS_REACT18) {
    await findByText('count: 1 (3)')
  } else {
    await findByText('count: 1 (2)')
  }

  fireEvent.click(getByText('button'))
  if (IS_REACT18) {
    await findByText('count: 2 (4)')
  } else {
    await findByText('count: 2 (3)')
  }
})

it('does not re-render if value is the same (#1158)', async () => {
  const countAtom = atom(0)

  let renderCount = 0

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    ++renderCount
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c)}>noop</button>
        <button onClick={() => setCount((c) => c + 1)}>inc</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0')
  expect(renderCount).toBe(1)

  fireEvent.click(getByText('noop'))
  await findByText('count: 0')
  expect(renderCount).toBe(1)

  fireEvent.click(getByText('inc'))
  await findByText('count: 1')
  expect(renderCount).toBe(2)

  fireEvent.click(getByText('noop'))
  await findByText('count: 1')
  expect(renderCount).toBe(2)

  fireEvent.click(getByText('inc'))
  await findByText('count: 2')
  expect(renderCount).toBe(3)
})
