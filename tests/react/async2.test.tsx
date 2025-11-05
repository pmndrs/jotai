import { StrictMode, Suspense } from 'react'
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

describe('useAtom delay option test', () => {
  it('suspend for Promise.resolve without delay option', async () => {
    const countAtom = atom(0)
    const asyncAtom = atom((get) => {
      const count = get(countAtom)
      if (count === 0) {
        return 0
      }
      return Promise.resolve(count)
    })

    const Component = () => {
      const count = useAtomValue(asyncAtom)
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

    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Component />
          <Controls />
        </Suspense>
      </StrictMode>,
    )

    expect(screen.getByText('count: 0')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('button')))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('count: 1')).toBeInTheDocument()
  })

  it('do not suspend for Promise.resolve with delay option', async () => {
    const countAtom = atom(0)
    const asyncAtom = atom((get) => {
      const count = get(countAtom)
      if (count === 0) {
        return 0
      }
      return Promise.resolve(count)
    })

    const Component = () => {
      const count = useAtomValue(asyncAtom, { delay: 0 })
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

    render(
      <StrictMode>
        <Component />
        <Controls />
      </StrictMode>,
    )

    expect(screen.getByText('count: 0')).toBeInTheDocument()

    fireEvent.click(screen.getByText('button'))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('count: 1')).toBeInTheDocument()
  })
})

describe('atom read function setSelf option test', () => {
  it('do not suspend with promise resolving with setSelf', async () => {
    const countAtom = atom(0)
    const asyncAtom = atom(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      return 'hello'
    })
    const refreshAtom = atom(0)
    const promiseCache = new WeakMap<object, string>()
    const derivedAtom = atom(
      (get, { setSelf }) => {
        get(refreshAtom)
        const count = get(countAtom)
        const promise = get(asyncAtom)
        if (promiseCache.has(promise)) {
          return (promiseCache.get(promise) as string) + count
        }
        promise.then((v) => {
          promiseCache.set(promise, v)
          setSelf()
        })
        return 'pending' + count
      },
      (_get, set) => {
        set(refreshAtom, (c) => c + 1)
      },
    )

    const Component = () => {
      const text = useAtomValue(derivedAtom)
      return <div>text: {text}</div>
    }

    const Controls = () => {
      const setCount = useSetAtom(countAtom)
      return (
        <>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
        </>
      )
    }

    render(
      <StrictMode>
        <Component />
        <Controls />
      </StrictMode>,
    )

    expect(screen.getByText('text: pending0')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('text: hello0')).toBeInTheDocument()

    fireEvent.click(screen.getByText('button'))
    expect(screen.getByText('text: hello1')).toBeInTheDocument()
  })
})

describe('timing issue with setSelf', () => {
  it('resolves dependencies reliably after a delay (#2192)', async () => {
    expect.assertions(6)
    const countAtom = atom(0)

    let result: number | null = null
    const asyncAtom = atom(async (get) => {
      const count = get(countAtom)
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      return count
    })

    const derivedAtom = atom(
      async (get, { setSelf }) => {
        get(countAtom)
        const resultCount = await get(asyncAtom)
        result = resultCount
        if (resultCount === 2) setSelf() // <-- necessary
      },
      () => {},
    )

    const derivedSyncAtom = atom((get) => {
      get(derivedAtom)
    })

    const increment = (c: number) => c + 1
    function TestComponent() {
      useAtom(derivedSyncAtom)
      const [count, setCount] = useAtom(countAtom)
      const onClick = () => {
        setCount(increment)
        setCount(increment)
      }
      return (
        <>
          count: {count}
          <button onClick={onClick}>button</button>
        </>
      )
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    )

    await vi.advanceTimersByTimeAsync(100)
    expect(screen.getByText('count: 0')).toBeInTheDocument()

    expect(result).toBe(0)

    fireEvent.click(screen.getByText('button'))
    expect(screen.getByText('count: 2')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(100)
    expect(result).toBe(2)

    fireEvent.click(screen.getByText('button'))
    expect(screen.getByText('count: 4')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(100)
    expect(result).toBe(4)
  })
})

describe('infinite pending', () => {
  it('odd counter', async () => {
    const countAtom = atom(0)
    const asyncAtom = atom((get) => {
      const count = get(countAtom)
      if (count % 2 === 0) {
        const infinitePending = new Promise<never>(() => {})
        return infinitePending
      }
      return count
    })

    const Component = () => {
      const count = useAtomValue(asyncAtom)
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
          <Controls />
          <Suspense fallback="loading">
            <Component />
          </Suspense>
        </StrictMode>,
      ),
    )

    expect(screen.getByText('loading')).toBeInTheDocument()

    fireEvent.click(screen.getByText('button'))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('count: 1')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('button')))
    expect(screen.getByText('loading')).toBeInTheDocument()

    fireEvent.click(screen.getByText('button'))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('count: 3')).toBeInTheDocument()
  })
})

describe('write to async atom twice', async () => {
  it('no wait', async () => {
    const asyncAtom = atom(Promise.resolve(2))
    const writer = atom(null, async (get, set) => {
      set(asyncAtom, async (c) => (await c) + 1)
      set(asyncAtom, async (c) => (await c) + 1)
      return get(asyncAtom)
    })

    const Component = () => {
      const count = useAtomValue(asyncAtom)
      const write = useSetAtom(writer)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={write}>button</button>
        </>
      )
    }

    await act(() =>
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Component />
          </Suspense>
        </StrictMode>,
      ),
    )

    await vi.advanceTimersByTimeAsync(0)
    expect(screen.getByText('count: 2')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('button')))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('count: 4')).toBeInTheDocument()
  })

  it('wait Promise.resolve()', async () => {
    const asyncAtom = atom(Promise.resolve(2))
    const writer = atom(null, async (get, set) => {
      set(asyncAtom, async (c) => (await c) + 1)
      await Promise.resolve()
      set(asyncAtom, async (c) => (await c) + 1)
      return get(asyncAtom)
    })

    const Component = () => {
      const count = useAtomValue(asyncAtom)
      const write = useSetAtom(writer)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={write}>button</button>
        </>
      )
    }

    await act(() =>
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Component />
          </Suspense>
        </StrictMode>,
      ),
    )

    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('count: 2')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('button')))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('count: 4')).toBeInTheDocument()
  })

  it('wait setTimeout()', async () => {
    const asyncAtom = atom(Promise.resolve(2))
    const writer = atom(null, async (get, set) => {
      set(asyncAtom, async (c) => (await c) + 1)
      await new Promise((resolve) => setTimeout(resolve, 100))
      set(asyncAtom, async (c) => (await c) + 1)
      return get(asyncAtom)
    })

    const Component = () => {
      const count = useAtomValue(asyncAtom)
      const write = useSetAtom(writer)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={write}>button</button>
        </>
      )
    }

    await act(() =>
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Component />
          </Suspense>
        </StrictMode>,
      ),
    )

    await vi.advanceTimersByTimeAsync(0)
    expect(screen.getByText('count: 2')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('button')))
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByText('count: 4')).toBeInTheDocument()
  })
})

describe('with onMount', () => {
  it('does not infinite loop with setting a promise (#2931)', async () => {
    const firstPromise = Promise.resolve(1)
    const secondPromise = Promise.resolve(2)
    const asyncAtom = atom(firstPromise)
    let onMountCallCount = 0
    asyncAtom.onMount = (setCount) => {
      onMountCallCount++
      setCount((prev) => (prev === firstPromise ? secondPromise : prev))
    }
    const Component = () => {
      const [count, setCount] = useAtom(asyncAtom)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={() => setCount(async (c) => (await c) + 1)}>
            button
          </button>
        </>
      )
    }

    await act(() =>
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Component />
          </Suspense>
        </StrictMode>,
      ),
    )

    await act(() => vi.advanceTimersByTimeAsync(0))
    // onMount should be called a limited number of times (not infinitely)
    // In StrictMode, React may mount/unmount/remount, so allow up to a few calls
    const initialCallCount = onMountCallCount
    expect(initialCallCount).toBeGreaterThan(0)
    expect(initialCallCount).toBeLessThanOrEqual(4)
    expect(screen.getByText('count: 2')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('button')))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('count: 3')).toBeInTheDocument()

    // onMount may be called a few more times due to StrictMode, but not infinitely
    expect(onMountCallCount).toBeLessThanOrEqual(initialCallCount + 2)
    expect(onMountCallCount).toBeLessThan(10) // If infinite loop, this would be much higher
  })
})
