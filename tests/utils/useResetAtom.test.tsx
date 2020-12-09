import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, Provider, useAtom } from '../../src/index'
import {
  useResetAtom,
  atomWithReducer,
  atomWithReset,
  RESET,
} from '../../src/utils'

it('atomWithReset resets to its first value', async () => {
  const countAtom = atomWithReset(0)

  const Parent: React.FC = () => {
    const [count, setValue] = useAtom(countAtom)
    const resetAtom = useResetAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={resetAtom}>reset</button>
        <button onClick={() => setValue((oldValue) => oldValue + 1)}>
          increment
        </button>
        <button onClick={() => setValue(10)}>set to 10</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Parent />
    </Provider>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('increment'))
  await findByText('count: 1')
  fireEvent.click(getByText('increment'))
  await findByText('count: 2')
  fireEvent.click(getByText('increment'))
  await findByText('count: 3')

  fireEvent.click(getByText('reset'))
  await findByText('count: 0')

  fireEvent.click(getByText('set to 10'))
  await findByText('count: 10')

  fireEvent.click(getByText('increment'))
  await findByText('count: 11')
  fireEvent.click(getByText('increment'))
  await findByText('count: 12')
  fireEvent.click(getByText('increment'))
  await findByText('count: 13')
})

it('atomWithReset through read-write atom', async () => {
  const primitiveAtom = atomWithReset(0)
  const countAtom = atom(
    (get) => get(primitiveAtom),
    (get, set, newValue: number | typeof RESET) => set(primitiveAtom, newValue)
  )

  const Parent: React.FC = () => {
    const [count, setValue] = useAtom(countAtom)
    const resetAtom = useResetAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={resetAtom}>reset</button>
        <button onClick={() => setValue(10)}>set to 10</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Parent />
    </Provider>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('set to 10'))
  await findByText('count: 10')

  fireEvent.click(getByText('reset'))
  await findByText('count: 0')
})

it('useResetAtom with custom atom', async () => {
  const reducer = (state: number, action: 'INCREASE' | typeof RESET) => {
    switch (action) {
      case 'INCREASE':
        return state + 1
      case RESET:
        return 0
    }
  }

  const countAtom = atomWithReducer(0, reducer)

  const Parent: React.FC = () => {
    const [count, dispatch] = useAtom(countAtom)
    const resetAtom = useResetAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={resetAtom}>reset</button>
        <button onClick={() => dispatch('INCREASE')}>increment</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Parent />
    </Provider>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('increment'))
  await findByText('count: 1')
  fireEvent.click(getByText('increment'))
  await findByText('count: 2')
  fireEvent.click(getByText('increment'))
  await findByText('count: 3')

  fireEvent.click(getByText('reset'))
  await findByText('count: 0')
})
