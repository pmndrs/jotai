import React from 'react'
import { fireEvent, render, act } from '@testing-library/react'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('count state', async () => {
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

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  expect(store.getState().count).toBe(2)

  act(() => {
    store.dispatch({ type: 'INC' })
  })
  await findByText('count: 3')
  expect(store.getState().count).toBe(3)
})
