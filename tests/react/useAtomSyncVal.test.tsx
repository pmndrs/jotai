import { StrictMode, useEffect } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAtomSyncVal, useSetAtom } from 'jotai/react'
import { atom, createStore } from 'jotai/vanilla'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('useAtomSyncVal basic test', () => {
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomSyncVal(countAtom)
    const setCount = useSetAtom(countAtom)

    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(count + 1)}>dispatch</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()
  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
})

it('useAtomSyncVal with derived atom', () => {
  const countAtom = atom(1)
  const doubledAtom = atom((get) => get(countAtom) * 2)

  const Counter = () => {
    const doubled = useAtomSyncVal(doubledAtom)
    const setCount = useSetAtom(countAtom)

    return (
      <>
        <div>doubled: {doubled}</div>
        <button onClick={() => setCount((c) => c + 1)}>dispatch</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('doubled: 2')).toBeInTheDocument()
  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('doubled: 4')).toBeInTheDocument()
})

it('useAtomSyncVal with async atom returns a promise as is', () => {
  const asyncAtom = atom(async () => 42)
  let value: unknown

  const AsyncComponent = () => {
    value = useAtomSyncVal(asyncAtom)
    return <div>rendered without suspending</div>
  }

  render(
    <StrictMode>
      <AsyncComponent />
    </StrictMode>,
  )

  expect(screen.getByText('rendered without suspending')).toBeInTheDocument()
  expect(value).toBeInstanceOf(Promise)
})

it('useAtomSyncVal picks up a value written on mount before subscription', () => {
  const countAtom = atom(0)

  const Child = () => {
    const setCount = useSetAtom(countAtom)
    useEffect(() => {
      setCount(1)
    }, [setCount])
    return null
  }

  const Counter = () => {
    const count = useAtomSyncVal(countAtom)
    return (
      <div>
        count: {count}
        <Child />
      </div>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 1')).toBeInTheDocument()
})

it('useAtomSyncVal with store option', () => {
  const store = createStore()
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomSyncVal(countAtom, { store })
    return <div>count: {count}</div>
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()
  act(() => store.set(countAtom, 1))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
})
