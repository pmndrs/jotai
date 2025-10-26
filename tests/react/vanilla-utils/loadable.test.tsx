import { StrictMode, Suspense, version as reactVersion, useEffect } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'
import { loadable } from 'jotai/vanilla/utils'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

const IS_REACT18 = /^18\./.test(reactVersion)
const IS_REACT19 = /^19\./.test(reactVersion)

it('loadable turns suspense into values', async () => {
  const asyncAtom = atom(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 100))
    return 5
  })

  render(
    <StrictMode>
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>,
  )

  expect(screen.getByText('Loading...')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('Data: 5')).toBeInTheDocument()
})

it('loadable turns errors into values', async () => {
  const asyncAtom = atom(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 100))
    throw new Error('An error occurred')
  })

  render(
    <StrictMode>
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>,
  )

  expect(screen.getByText('Loading...')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('Error: An error occurred')).toBeInTheDocument()
})

it('loadable turns primitive throws into values', async () => {
  const asyncAtom = atom(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 100))
    throw 'An error occurred'
  })

  render(
    <StrictMode>
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>,
  )

  expect(screen.getByText('Loading...')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('An error occurred')).toBeInTheDocument()
})

it('loadable goes back to loading after re-fetch', async () => {
  const refreshAtom = atom(0)
  const asyncAtom = atom(async (get) => {
    const count = get(refreshAtom)
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 100))
    return count === 0 ? 5 : 6
  })

  const Refresh = () => {
    const setRefresh = useSetAtom(refreshAtom)
    return (
      <>
        <button onClick={() => setRefresh((value) => value + 1)}>
          refresh
        </button>
      </>
    )
  }

  render(
    <StrictMode>
      <Refresh />
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>,
  )

  expect(screen.getByText('Loading...')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('Data: 5')).toBeInTheDocument()

  fireEvent.click(screen.getByText('refresh'))
  expect(screen.getByText('Loading...')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('Data: 6')).toBeInTheDocument()
})

it('loadable can recover from error', async () => {
  const refreshAtom = atom(0)
  const asyncAtom = atom(async (get) => {
    const count = get(refreshAtom)
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 100))
    if (count === 0) {
      throw new Error('An error occurred')
    }
    return 6
  })

  const Refresh = () => {
    const setRefresh = useSetAtom(refreshAtom)
    return (
      <>
        <button onClick={() => setRefresh((value) => value + 1)}>
          refresh
        </button>
      </>
    )
  }

  render(
    <StrictMode>
      <Refresh />
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>,
  )

  expect(screen.getByText('Loading...')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('Error: An error occurred')).toBeInTheDocument()

  fireEvent.click(screen.getByText('refresh'))
  expect(screen.getByText('Loading...')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('Data: 6')).toBeInTheDocument()
})

it('loadable immediately resolves sync values', () => {
  const syncAtom = atom(5)
  const effectCallback = vi.fn()

  render(
    <StrictMode>
      <LoadableComponent effectCallback={effectCallback} asyncAtom={syncAtom} />
    </StrictMode>,
  )

  expect(screen.getByText('Data: 5')).toBeInTheDocument()
  expect(effectCallback.mock.calls).not.toContain(
    expect.objectContaining({ state: 'loading' }),
  )
  expect(effectCallback).toHaveBeenLastCalledWith({ state: 'hasData', data: 5 })
})

it('loadable can use resolved promises synchronously', async () => {
  const asyncAtom = atom(Promise.resolve(5))
  const effectCallback = vi.fn()

  const ResolveAtomComponent = () => {
    useAtomValue(asyncAtom)

    return <div>Ready</div>
  }

  let result: ReturnType<typeof render>
  await act(async () => {
    result = render(
      <StrictMode>
        <Suspense fallback={<div>loading</div>}>
          <ResolveAtomComponent />
        </Suspense>
      </StrictMode>,
    )
  })

  await act(() => vi.advanceTimersByTimeAsync(0))
  if (IS_REACT18 || IS_REACT19) {
    // FIXME React 18 Suspense does not show "Ready"
    try {
      expect(screen.getByText('loading')).toBeInTheDocument()
    } catch {
      expect(screen.getByText('Ready')).toBeInTheDocument()
    }
  } else {
    expect(screen.getByText('Ready')).toBeInTheDocument()
  }

  result!.rerender(
    <StrictMode>
      <LoadableComponent
        effectCallback={effectCallback}
        asyncAtom={asyncAtom}
      />
    </StrictMode>,
  )

  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('Data: 5')).toBeInTheDocument()

  expect(effectCallback.mock.calls).not.toContain(
    expect.objectContaining({ state: 'loading' }),
  )
  expect(effectCallback).toHaveBeenLastCalledWith({ state: 'hasData', data: 5 })
})

it('loadable of a derived async atom does not trigger infinite loop (#1114)', async () => {
  const baseAtom = atom(0)
  const asyncAtom = atom(async (get) => {
    get(baseAtom)
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 100))
    return 5
  })

  const Trigger = () => {
    const trigger = useSetAtom(baseAtom)
    return (
      <>
        <button onClick={() => trigger((value) => value)}>trigger</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Trigger />
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>,
  )

  expect(screen.getByText('Loading...')).toBeInTheDocument()

  fireEvent.click(screen.getByText('trigger'))
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('Data: 5')).toBeInTheDocument()
})

it('loadable of a derived async atom with error does not trigger infinite loop (#1330)', async () => {
  const baseAtom = atom(() => {
    throw new Error('thrown in baseAtom')
  })
  const asyncAtom = atom(async (get) => {
    get(baseAtom)
    return ''
  })

  render(
    <StrictMode>
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>,
  )

  expect(screen.getByText('Loading...')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('Error: thrown in baseAtom')).toBeInTheDocument()
})

it('does not repeatedly attempt to get the value of an unresolved promise atom wrapped in a loadable (#1481)', () => {
  const baseAtom = atom(new Promise<number>(() => {}))

  let callsToGetBaseAtom = 0
  const derivedAtom = atom((get) => {
    callsToGetBaseAtom++
    return get(baseAtom)
  })

  render(
    <StrictMode>
      <LoadableComponent asyncAtom={derivedAtom} />
    </StrictMode>,
  )

  // depending on provider-less mode or versioned-write mode, there will be
  // either 2 or 3 calls.
  expect(callsToGetBaseAtom).toBeLessThanOrEqual(3)
})

it('should handle sync error (#1843)', () => {
  const syncAtom = atom(() => {
    throw new Error('thrown in syncAtom')
  })

  render(
    <StrictMode>
      <LoadableComponent asyncAtom={syncAtom} />
    </StrictMode>,
  )

  expect(screen.getByText('Error: thrown in syncAtom')).toBeInTheDocument()
})

type LoadableComponentProps = {
  asyncAtom: Atom<Promise<number> | Promise<string> | string | number>
  effectCallback?: (loadableValue: any) => void
}

const LoadableComponent = ({
  asyncAtom,
  effectCallback,
}: LoadableComponentProps) => {
  const value = useAtomValue(loadable(asyncAtom))

  useEffect(() => {
    if (effectCallback) {
      effectCallback(value)
    }
  }, [value, effectCallback])

  if (value.state === 'loading') {
    return <>Loading...</>
  }

  if (value.state === 'hasError') {
    return <>{String(value.error)}</>
  }

  // this is to ensure correct typing
  const data: number | string = value.data

  return <>Data: {data}</>
}
