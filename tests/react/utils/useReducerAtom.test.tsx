import { StrictMode } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { it } from 'vitest'
import { useReducerAtom } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

it('useReducerAtom with no action argument', async () => {
  const countAtom = atom(0)
  const reducer = (state: number) => state + 2

  const Parent = () => {
    const [count, dispatch] = useReducerAtom(countAtom, reducer)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => dispatch()}>dispatch</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Parent />
    </StrictMode>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('dispatch'))
  await findByText('count: 2')

  fireEvent.click(getByText('dispatch'))
  await findByText('count: 4')
})

it('useReducerAtom with optional action argument', async () => {
  const countAtom = atom(0)
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

  const Parent = () => {
    const [count, dispatch] = useReducerAtom(countAtom, reducer)
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
    </StrictMode>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('dispatch INCREASE'))
  await findByText('count: 1')

  fireEvent.click(getByText('dispatch empty'))
  await findByText('count: 1')

  fireEvent.click(getByText('dispatch DECREASE'))
  await findByText('count: 0')
})

it('useReducerAtom with non-optional action argument', async () => {
  const countAtom = atom(0)
  const reducer = (state: number, action: 'INCREASE' | 'DECREASE') => {
    switch (action) {
      case 'INCREASE':
        return state + 1
      case 'DECREASE':
        return state - 1
    }
  }

  const Parent = () => {
    const [count, dispatch] = useReducerAtom(countAtom, reducer)
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
    </StrictMode>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('dispatch INCREASE'))
  await findByText('count: 1')

  fireEvent.click(getByText('dispatch DECREASE'))
  await findByText('count: 0')
})
