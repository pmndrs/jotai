import { StrictMode, useCallback, useEffect, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAtom } from 'jotai/react'
import { useAtomCallback } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('useAtomCallback with get', async () => {
  const countAtom = atom(0)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>atom count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>dispatch</button>
      </>
    )
  }

  const Monitor = () => {
    const [count, setCount] = useState(0)
    const readCount = useAtomCallback(
      useCallback((get) => {
        const currentCount = get(countAtom)
        setCount(currentCount)
        return currentCount
      }, []),
    )
    useEffect(() => {
      const timer = setInterval(() => {
        readCount()
      }, 100)
      return () => {
        clearInterval(timer)
      }
    }, [readCount])
    return (
      <>
        <div>state count: {count}</div>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
      <Monitor />
    </StrictMode>,
  )

  expect(screen.getByText('atom count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  await act(() => vi.advanceTimersByTime(100))
  expect(screen.getByText('atom count: 1')).toBeInTheDocument()
  expect(screen.getByText('state count: 1')).toBeInTheDocument()
})

it('useAtomCallback with set and update', async () => {
  const countAtom = atom(0)
  const changeableAtom = atom(0)
  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>dispatch</button>
      </>
    )
  }

  const Monitor = () => {
    const [changeableCount] = useAtom(changeableAtom)
    const changeCount = useAtomCallback(
      useCallback((get, set) => {
        const currentCount = get(countAtom)
        set(changeableAtom, currentCount)
        return currentCount
      }, []),
    )
    useEffect(() => {
      const timer = setInterval(() => {
        changeCount()
      }, 100)
      return () => {
        clearInterval(timer)
      }
    }, [changeCount])
    return (
      <>
        <div>changeable count: {changeableCount}</div>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
      <Monitor />
    </StrictMode>,
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  await act(() => vi.advanceTimersByTime(100))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('changeable count: 1')).toBeInTheDocument()
})

it('useAtomCallback with set and update and arg', () => {
  const countAtom = atom(0)

  const App = () => {
    const [count] = useAtom(countAtom)
    const setCount = useAtomCallback(
      useCallback((_get, set, arg: number) => {
        set(countAtom, arg)
        return arg
      }, []),
    )

    return (
      <div>
        <p>count: {count}</p>
        <button onClick={() => setCount(42)}>dispatch</button>
      </div>
    )
  }

  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('count: 42')).toBeInTheDocument()
})

it('useAtomCallback with sync atom (#1100)', () => {
  const countAtom = atom(0)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const readCount = useAtomCallback(useCallback((get) => get(countAtom), []))
    useEffect(() => {
      const promiseOrValue = readCount()
      if (typeof promiseOrValue !== 'number') {
        throw new Error('should return number')
      }
    }, [readCount])
    return (
      <>
        <div>atom count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>dispatch</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('atom count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('atom count: 1')).toBeInTheDocument()
})
