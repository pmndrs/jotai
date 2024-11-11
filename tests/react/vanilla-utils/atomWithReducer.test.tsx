import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await screen.findByText('count: 0')

  await userEvent.click(screen.getByText('dispatch INCREASE'))
  await screen.findByText('count: 1')

  await userEvent.click(screen.getByText('dispatch empty'))
  await screen.findByText('count: 1')

  await userEvent.click(screen.getByText('dispatch DECREASE'))
  await screen.findByText('count: 0')
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

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await screen.findByText('count: 0')

  await userEvent.click(screen.getByText('dispatch INCREASE'))
  await screen.findByText('count: 1')

  await userEvent.click(screen.getByText('dispatch DECREASE'))
  await screen.findByText('count: 0')
})
