import { StrictMode } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { it } from 'vitest'
import { useAtom } from 'jotai/react'
import { atomWithReducer } from 'jotai/vanilla/utils'

it('atomWithReducer with optional action argument', async () => {
  const reducer = (state: number, action?: 'INCREASE' | 'DECREASE') => {
    switch (action) {
      case 'INCREASE':
        return state + 1
      case 'DECREASE':
        return state - 1
      case undefined:
        return state
    }
  }
  const countAtom = atomWithReducer(0, reducer)

  const Parent = () => {
    const [count, dispatch] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => dispatch('INCREASE')}>dispatch INCREASE</button>
        <button onClick={() => dispatch('DECREASE')}>dispatch DECREASE</button>
        <button onClick={() => dispatch()}>dispatch empty</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await findByText('count: 0')

  fireEvent.click(getByText('dispatch INCREASE'))
  await findByText('count: 1')

  fireEvent.click(getByText('dispatch empty'))
  await findByText('count: 1')

  fireEvent.click(getByText('dispatch DECREASE'))
  await findByText('count: 0')
})

it('atomWithReducer with non-optional action argument', async () => {
  const reducer = (state: number, action: 'INCREASE' | 'DECREASE') => {
    switch (action) {
      case 'INCREASE':
        return state + 1
      case 'DECREASE':
        return state - 1
    }
  }
  const countAtom = atomWithReducer(0, reducer)

  const Parent = () => {
    const [count, dispatch] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => dispatch('INCREASE')}>dispatch INCREASE</button>
        <button onClick={() => dispatch('DECREASE')}>dispatch DECREASE</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await findByText('count: 0')

  fireEvent.click(getByText('dispatch INCREASE'))
  await findByText('count: 1')

  fireEvent.click(getByText('dispatch DECREASE'))
  await findByText('count: 0')
})
