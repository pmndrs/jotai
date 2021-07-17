import { FC, useRef } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom } from '../src/index'
import { getTestProvider } from './testUtils'

const Provider = getTestProvider()

it('only relevant render function called (#156)', async () => {
  const count1Atom = atom(0)
  const count2Atom = atom(0)

  const Counter1: FC = () => {
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

  const Counter2: FC = () => {
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
    getByText('count1: 1 (2)')
    getByText('count2: 0 (1)')
  })

  fireEvent.click(getByText('button2'))
  await waitFor(() => {
    getByText('count1: 1 (2)')
    getByText('count2: 1 (2)')
  })
})

it('only render once using atoms with write-only atom', async () => {
  const count1Atom = atom(0)
  const count2Atom = atom(0)
  const incrementAtom = atom(null, (_get, set, _arg) => {
    set(count1Atom, (c) => c + 1)
    set(count2Atom, (c) => c + 1)
  })

  const Counter: FC = () => {
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

  const Control: FC = () => {
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
  await findByText('count1: 1, count2: 1 (2)')

  fireEvent.click(getByText('button'))
  await findByText('count1: 2, count2: 2 (3)')
})

it('useless re-renders with static atoms (#355)', async () => {
  // check out https://codesandbox.io/s/m82r5 to see the expected re-renders
  const countAtom = atom(0)
  const unrelatedAtom = atom(0)

  const Counter: FC = () => {
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
  await findByText('count: 1 (2)')
  fireEvent.click(getByText('button'))
  await findByText('count: 2 (3)')
})
