import React from 'react'
import { fireEvent, render, act } from '@testing-library/react'
import { createStore } from 'redux'
import { Provider, useAtom } from '../../src/index'
import { atomWithStore } from '../../src/redux'

it('count state', async () => {
  const initialState = { count: 0 }
  const reducer = (state = initialState, action: { type: 'INC' }) => {
    if (action.type === 'INC') {
      return { ...state, count: state.count + 1 }
    }
    return state
  }
  const store = createStore(reducer)
  const storeAtom = atomWithStore(store)
  const Counter: React.FC = () => {
    const [state, dispatch] = useAtom(storeAtom)

    return (
      <>
        count: {state.count}
        <button onClick={() => dispatch({ type: 'INC' })}>button</button>
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
    store.dispatch({ type: 'INC' })
  })
  await findByText('count: 2')
  expect(store.getState().count).toBe(2)
})
