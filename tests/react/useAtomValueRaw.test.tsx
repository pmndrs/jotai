import { StrictMode, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAtomValueRaw, useSetAtom } from 'jotai/react'
import { atom, createStore } from 'jotai/vanilla'
import { useCommitCount } from '../test-utils.js'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('useAtomValueRaw basic test', () => {
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomValueRaw(countAtom)
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

it('useAtomValueRaw with derived atom', () => {
  const countAtom = atom(1)
  const doubledAtom = atom((get) => get(countAtom) * 2)

  const Counter = () => {
    const doubled = useAtomValueRaw(doubledAtom)
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

it('useAtomValueRaw with async atom returns a promise as is', () => {
  const asyncAtom = atom(async () => 42)
  let value: unknown

  const AsyncComponent = () => {
    value = useAtomValueRaw(asyncAtom)
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

it('useAtomValueRaw returns a stable promise across re-renders', () => {
  const asyncAtom = atom(async () => 42)
  const promises: unknown[] = []

  const Component = () => {
    const [, setCount] = useState(0)
    promises.push(useAtomValueRaw(asyncAtom))
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

it('useAtomValueRaw renders once on initial mount', () => {
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomValueRaw(countAtom)
    return (
      <div>
        commits: {useCommitCount()}, count: {count}
      </div>
    )
  }

  const Controls = () => {
    const setCount = useSetAtom(countAtom)
    return <button onClick={() => setCount((c) => c + 1)}>button</button>
  }

  render(
    <>
      <Counter />
      <Controls />
    </>,
  )

  expect(screen.getByText('commits: 1, count: 0')).toBeInTheDocument()
  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('commits: 2, count: 1')).toBeInTheDocument()
})

it('useAtomValueRaw keeps its subscription on value changes', () => {
  const store = createStore()
  const countAtom = atom(0)
  const subscribe = vi.spyOn(store, 'sub')

  const Counter = () => {
    const count = useAtomValueRaw(countAtom, { store })
    return <div>count: {count}</div>
  }

  render(<Counter />)
  expect(subscribe).toHaveBeenCalledTimes(1)

  act(() => store.set(countAtom, 1))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(subscribe).toHaveBeenCalledTimes(1)
})

it('useAtomValueRaw with store option', () => {
  const store = createStore()
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomValueRaw(countAtom, { store })
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

it('useAtomValueRaw tracks committed values before switching atoms', () => {
  const store = createStore()
  const firstAtom = atom(0)
  const baseAtom = atom(1)
  baseAtom.onMount = (set) => set(0)
  const secondAtom = atom((get) => get(baseAtom))

  const Counter = ({
    name,
    activeAtom,
  }: {
    name: string
    activeAtom: typeof secondAtom
  }) => {
    const count = useAtomValueRaw(activeAtom, { store })
    return (
      <div>
        {name}: {count}
      </div>
    )
  }

  const Counters = ({ activeAtom }: { activeAtom: typeof secondAtom }) => (
    <>
      <Counter name="A" activeAtom={activeAtom} />
      <Counter name="B" activeAtom={activeAtom} />
    </>
  )

  const { rerender } = render(<Counters activeAtom={firstAtom} />)
  expect(screen.getByText('A: 0')).toBeInTheDocument()
  expect(screen.getByText('B: 0')).toBeInTheDocument()

  act(() => store.set(firstAtom, 1))
  expect(screen.getByText('A: 1')).toBeInTheDocument()
  expect(screen.getByText('B: 1')).toBeInTheDocument()

  rerender(<Counters activeAtom={secondAtom} />)
  expect(store.get(secondAtom)).toBe(0)
  expect(screen.getByText('A: 0')).toBeInTheDocument()
  expect(screen.getByText('B: 0')).toBeInTheDocument()
})
