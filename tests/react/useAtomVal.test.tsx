import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAtomVal, useSetAtom } from 'jotai/react'
import { atom, createStore } from 'jotai/vanilla'
import { useCommitCount } from '../test-utils.js'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('useAtomVal basic test', () => {
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomVal(countAtom)
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

it('useAtomVal with derived atom', () => {
  const countAtom = atom(1)
  const doubledAtom = atom((get) => get(countAtom) * 2)

  const Counter = () => {
    const doubled = useAtomVal(doubledAtom)
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

it('useAtomVal with async atom returns a promise as is', () => {
  const asyncAtom = atom(async () => 42)
  let value: unknown

  const AsyncComponent = () => {
    value = useAtomVal(asyncAtom)
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

it('useAtomVal renders once on initial mount', () => {
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomVal(countAtom)
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

it('useAtomVal with store option', () => {
  const store = createStore()
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomVal(countAtom, { store })
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
