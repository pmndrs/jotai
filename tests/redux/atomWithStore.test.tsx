import { StrictMode } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { legacy_createStore as createStore } from 'redux'
import { useAtom } from 'jotai'
import { atomWithStore } from 'jotai/redux'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

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
  store.dispatch({ type: 'INC' })

  const Counter = () => {
    const [state, dispatch] = useAtom(storeAtom)

    return (
      <>
        count: {state.count}
        <button onClick={() => dispatch({ type: 'INC' })}>button</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Provider>
        <Counter />
      </Provider>
    </StrictMode>
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
