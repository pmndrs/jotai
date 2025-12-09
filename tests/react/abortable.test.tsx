import { StrictMode, Suspense, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import { sleep } from '../test-utils'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('abortable atom test', () => {
  it('can abort with signal.aborted', async () => {
    const countAtom = atom(0)
    let abortedCount = 0
    const derivedAtom = atom(async (get, { signal }) => {
      const count = get(countAtom)
      await sleep(100)
      if (signal.aborted) {
        ++abortedCount
      }
      return count
    })

    const Component = () => {
      const count = useAtomValue(derivedAtom)
      return <div>count: {count}</div>
    }

    const Controls = () => {
      const setCount = useSetAtom(countAtom)
      return (
        <>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
        </>
      )
    }

    await act(() =>
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Component />
            <Controls />
          </Suspense>
        </StrictMode>,
      ),
    )

    expect(screen.getByText('loading')).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('count: 0')).toBeInTheDocument()

    expect(abortedCount).toBe(0)

    await act(() => fireEvent.click(screen.getByText('button')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => fireEvent.click(screen.getByText('button')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('count: 2')).toBeInTheDocument()

    expect(abortedCount).toBe(1)

    await act(() => fireEvent.click(screen.getByText('button')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('count: 3')).toBeInTheDocument()

    expect(abortedCount).toBe(1)
  })

  it('can abort with event listener', async () => {
    const countAtom = atom(0)
    let abortedCount = 0
    const derivedAtom = atom(async (get, { signal }) => {
      const count = get(countAtom)
      const callback = () => {
        ++abortedCount
      }
      signal.addEventListener('abort', callback)
      await sleep(100)
      signal.removeEventListener('abort', callback)
      return count
    })

    const Component = () => {
      const count = useAtomValue(derivedAtom)
      return <div>count: {count}</div>
    }

    const Controls = () => {
      const setCount = useSetAtom(countAtom)
      return (
        <>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
        </>
      )
    }

    await act(() =>
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Component />
            <Controls />
          </Suspense>
        </StrictMode>,
      ),
    )

    expect(screen.getByText('loading')).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('count: 0')).toBeInTheDocument()

    expect(abortedCount).toBe(0)

    await act(() => fireEvent.click(screen.getByText('button')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => fireEvent.click(screen.getByText('button')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('count: 2')).toBeInTheDocument()

    expect(abortedCount).toBe(1)

    await act(() => fireEvent.click(screen.getByText('button')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('count: 3')).toBeInTheDocument()

    expect(abortedCount).toBe(1)
  })

  it('does not abort on unmount', async () => {
    const countAtom = atom(0)
    let abortedCount = 0
    const derivedAtom = atom(async (get, { signal }) => {
      const count = get(countAtom)
      await sleep(100)
      if (signal.aborted) {
        ++abortedCount
      }
      return count
    })

    const Component = () => {
      const count = useAtomValue(derivedAtom)
      return <div>count: {count}</div>
    }

    const Parent = () => {
      const setCount = useSetAtom(countAtom)
      const [show, setShow] = useState(true)
      return (
        <>
          {show ? <Component /> : 'hidden'}
          <button onClick={() => setCount((c) => c + 1)}>button</button>
          <button onClick={() => setShow((x) => !x)}>toggle</button>
        </>
      )
    }

    await act(() =>
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Parent />
          </Suspense>
        </StrictMode>,
      ),
    )

    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('count: 0')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('button')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => fireEvent.click(screen.getByText('toggle')))
    expect(screen.getByText('hidden')).toBeInTheDocument()

    expect(abortedCount).toBe(0)
  })

  it('throws aborted error (like fetch)', async () => {
    const countAtom = atom(0)
    const derivedAtom = atom(async (get, { signal }) => {
      const count = get(countAtom)
      await sleep(100)
      if (signal.aborted) {
        throw new Error('aborted')
      }
      return count
    })

    const Component = () => {
      const count = useAtomValue(derivedAtom)
      return <div>count: {count}</div>
    }

    const Controls = () => {
      const setCount = useSetAtom(countAtom)
      return (
        <>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
        </>
      )
    }

    await act(() =>
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Component />
            <Controls />
          </Suspense>
        </StrictMode>,
      ),
    )

    expect(screen.getByText('loading')).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('count: 0')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('button')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => fireEvent.click(screen.getByText('button')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('count: 2')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('button')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('count: 3')).toBeInTheDocument()
  })
})
