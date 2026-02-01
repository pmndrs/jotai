import { StrictMode, Suspense } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAtom } from 'jotai/react'
import { atomWithRefresh } from 'jotai/vanilla/utils'
import { sleep } from '../../test-utils'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('sync counter', () => {
  let counter = 0
  const countAtom = atomWithRefresh(() => ++counter)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount()}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 3')).toBeInTheDocument()

  expect(counter).toBe(3)
})

it('async counter', async () => {
  let counter = 0
  const countAtom = atomWithRefresh(async () => {
    await sleep(100)
    return ++counter
  })

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount()}>button</button>
      </>
    )
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 1')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 2')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 3')).toBeInTheDocument()

  expect(counter).toBe(3)
})

it('writable counter', () => {
  let counter = 0
  const countAtom = atomWithRefresh(
    () => ++counter,
    (_get, _set, newValue: number) => {
      counter = newValue
    },
  )

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount()}>button</button>
        <button onClick={() => setCount(9)}>set9</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 3')).toBeInTheDocument()

  fireEvent.click(screen.getByText('set9'))
  expect(screen.getByText('count: 3')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 10')).toBeInTheDocument()
})
