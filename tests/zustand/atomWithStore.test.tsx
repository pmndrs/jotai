import React from 'react'
import { fireEvent, render, act } from '@testing-library/react'
import create from 'zustand/vanilla'
import { useAtom } from '../../src/index'
import { atomWithStore } from '../../src/zustand'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('count state', async () => {
  const store = create(() => ({ count: 0 }))
  const stateAtom = atomWithStore(store)
  store.setState((prev) => ({ count: prev.count + 1 }))

  const Counter: React.FC = () => {
    const [state, setState] = useAtom(stateAtom)

    return (
      <>
        count: {state.count}
        <button
          onClick={() =>
            setState((prev) => ({ ...prev, count: prev.count + 1 }))
          }>
          button
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  expect(store.getState().count).toBe(2)

  act(() => {
    store.setState((prev) => ({ count: prev.count + 1 }))
  })
  await findByText('count: 3')
  expect(store.getState().count).toBe(3)
})
