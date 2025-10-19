import { StrictMode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
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

it('useReducerAtom with no action argument', () => {
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

  expect(screen.getByText('count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('count: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('count: 4')).toBeInTheDocument()
})

it('useReducerAtom with optional action argument', () => {
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

  expect(screen.getByText('count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch INCREASE'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch empty'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch DECREASE'))
  expect(screen.getByText('count: 0')).toBeInTheDocument()
})

it('useReducerAtom with non-optional action argument', () => {
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

  expect(screen.getByText('count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch INCREASE'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch DECREASE'))
  expect(screen.getByText('count: 0')).toBeInTheDocument()
})
