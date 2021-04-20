import React from 'react'
import { fireEvent, render, act } from '@testing-library/react'
import create from 'zustand/vanilla'
import { Provider, useAtom } from '../../src/index'
import { atomWithStore } from '../../src/zustand'

it('count state', async () => {
  const store = create(() => ({ count: 0 }))
  const stateAtom = atomWithStore(store)
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

  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
  expect(store.getState().count).toBe(1)

  act(() => {
    store.setState((prev) => ({ count: prev.count + 1 }))
  })
  await findByText('count: 2')
  expect(store.getState().count).toBe(2)
})
