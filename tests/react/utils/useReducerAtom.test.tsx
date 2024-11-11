import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, it, vi } from 'vitest'
import { useReducerAtom } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

let savedConsoleWarn: any
beforeEach(() => {
  savedConsoleWarn = console.warn
  console.warn = vi.fn()
})
afterEach(() => {
  console.warn = savedConsoleWarn
})

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

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await screen.findByText('count: 0')

  await userEvent.click(screen.getByText('dispatch'))
  await screen.findByText('count: 2')

  await userEvent.click(screen.getByText('dispatch'))
  await screen.findByText('count: 4')
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
