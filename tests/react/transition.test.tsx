/// <reference types="react/experimental" />
import ReactExports, { StrictMode, Suspense, useEffect } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

const { use, useTransition } = ReactExports

describe.skipIf(typeof useTransition !== 'function')('useTransition', () => {
  // FIXME some tests are failing with react@experimental
  it.skipIf(typeof use === 'function')(
    'no extra commit with useTransition (#1125)',
    async () => {
      const countAtom = atom(0)
      const delayedAtom = atom(async (get) => {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 100))
        return get(countAtom)
      })

      const committed: { pending: boolean; delayed: number }[] = []

      const Counter = () => {
        const setCount = useSetAtom(countAtom)
        const delayed = useAtomValue(delayedAtom)
        const [pending, startTransition] = useTransition()
        useEffect(() => {
          committed.push({ pending, delayed })
        })
        return (
          <>
            <div>delayed: {delayed}</div>
            <button
              onClick={() => startTransition(() => setCount((c) => c + 1))}
            >
              button
            </button>
          </>
        )
      }

      await act(() =>
        render(
          <>
            <Suspense fallback="loading">
              <Counter />
            </Suspense>
          </>,
        ),
      )

      expect(screen.getByText('loading')).toBeInTheDocument()
      await act(() => vi.advanceTimersByTimeAsync(100))
      expect(screen.getByText('delayed: 0')).toBeInTheDocument()

      fireEvent.click(screen.getByText('button'))
      expect(screen.getByText('delayed: 0')).toBeInTheDocument()
      await act(() => vi.advanceTimersByTimeAsync(100))
      expect(screen.getByText('delayed: 1')).toBeInTheDocument()

      expect(committed).toEqual([
        { pending: false, delayed: 0 },
        { pending: true, delayed: 0 },
        { pending: false, delayed: 1 },
      ])
    },
  )

  it('can update normal atom with useTransition (#1151)', async () => {
    const countAtom = atom(0)
    const toggleAtom = atom(false)
    const pendingAtom = atom((get) => {
      if (get(toggleAtom)) {
        return new Promise(() => {})
      }
      return false
    })

    const Counter = () => {
      const [count, setCount] = useAtom(countAtom)
      const toggle = useSetAtom(toggleAtom)
      useAtomValue(pendingAtom)
      const [pending, startTransition] = useTransition()
      return (
        <>
          <div>count: {count}</div>
          <button onClick={() => setCount((c) => c + 1)}>increment</button>
          {pending && 'pending'}
          <button onClick={() => startTransition(() => toggle((x) => !x))}>
            toggle
          </button>
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

    expect(screen.getByText('count: 0')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('toggle')))
    expect(screen.getByText('pending')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('increment')))
    expect(screen.getByText('count: 1')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('increment')))
    expect(screen.getByText('count: 2')).toBeInTheDocument()
  })
})
