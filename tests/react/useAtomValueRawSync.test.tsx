import { StrictMode, useEffect, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAtomValueRawSync, useSetAtom } from 'jotai/react'
import { atom, createStore } from 'jotai/vanilla'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('useAtomValueRawSync basic test', () => {
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomValueRawSync(countAtom)
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

it('useAtomValueRawSync with derived atom', () => {
  const countAtom = atom(1)
  const doubledAtom = atom((get) => get(countAtom) * 2)

  const Counter = () => {
    const doubled = useAtomValueRawSync(doubledAtom)
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

it('useAtomValueRawSync with async atom returns a promise as is', () => {
  const asyncAtom = atom(async () => 42)
  let value: unknown

  const AsyncComponent = () => {
    value = useAtomValueRawSync(asyncAtom)
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

it('useAtomValueRawSync returns a stable promise across re-renders', () => {
  const asyncAtom = atom(async () => 42)
  const promises: unknown[] = []

  const Component = () => {
    const [, setCount] = useState(0)
    promises.push(useAtomValueRawSync(asyncAtom))
    return <button onClick={() => setCount((c) => c + 1)}>rerender</button>
  }

  render(
    <StrictMode>
      <Component />
    </StrictMode>,
  )

  fireEvent.click(screen.getByText('rerender'))
  expect(promises.length).toBeGreaterThanOrEqual(2)
  expect(new Set(promises).size).toBe(1)
})

it('useAtomValueRawSync picks up a value written on mount before subscription', () => {
  const countAtom = atom(0)

  const Child = () => {
    const setCount = useSetAtom(countAtom)
    useEffect(() => {
      setCount(1)
    }, [setCount])
    return null
  }

  const Counter = () => {
    const count = useAtomValueRawSync(countAtom)
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

it('useAtomValueRawSync with store option', () => {
  const store = createStore()
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomValueRawSync(countAtom, { store })
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
