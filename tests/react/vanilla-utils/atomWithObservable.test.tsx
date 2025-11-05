import { Component, StrictMode, Suspense, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import {
  BehaviorSubject,
  Observable,
  Subject,
  delay,
  interval,
  map,
  of,
  switchMap,
  take,
} from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fromValue, makeSubject, pipe, toObservable } from 'wonka'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import { atom, createStore } from 'jotai/vanilla'
import { atomWithObservable } from 'jotai/vanilla/utils'

const consoleError = console.error
beforeEach(() => {
  vi.useFakeTimers()
  // A workaround for missing performance.mark after using fake timers
  // https://github.com/pmndrs/jotai/pull/1913#discussion_r1186527192
  if (!performance.mark) {
    performance.mark = (() => {}) as any
    performance.clearMarks = (() => {}) as any
    performance.clearMeasures = (() => {}) as any
  }
  // suppress error log
  console.error = vi.fn((...args: unknown[]) => {
    const message = String(args)
    if (
      message.includes('at ErrorBoundary') ||
      message.includes('Test Error')
    ) {
      return
    }
    return consoleError(...args)
  })
})

afterEach(() => {
  vi.runAllTimers()
  vi.useRealTimers()
  console.error = consoleError
})

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = {
    error: '',
  }

  static getDerivedStateFromError(error: Error) {
    return { error: error.message }
  }

  render() {
    if (this.state.error) {
      return <div>Error: {this.state.error}</div>
    }
    return this.props.children
  }
}

it('count state', () => {
  const observableAtom = atomWithObservable(() => of(1))

  const Counter = () => {
    const [state] = useAtom(observableAtom)

    return <>count: {state}</>
  }

  render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>,
  )

  expect(screen.getByText('count: 1')).toBeInTheDocument()
})

it('writable count state', () => {
  const subject = new BehaviorSubject(1)
  const observableAtom = atomWithObservable(() => subject)

  const Counter = () => {
    const [state, dispatch] = useAtom(observableAtom)
    return (
      <>
        count: {state}
        <button onClick={() => dispatch(9)}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>,
  )

  expect(screen.getByText('count: 1')).toBeInTheDocument()

  act(() => subject.next(2))
  act(() => vi.advanceTimersByTime(0))
  expect(screen.getByText('count: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 9')).toBeInTheDocument()
  expect(subject.value).toBe(9)
})

it('writable count state without initial value', async () => {
  const subject = new Subject<number>()
  const observableAtom = atomWithObservable(() => subject)

  const CounterValue = () => {
    const state = useAtomValue(observableAtom)
    return <>count: {state}</>
  }

  const CounterButton = () => {
    const dispatch = useSetAtom(observableAtom)
    return <button onClick={() => dispatch(9)}>button</button>
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <CounterValue />
        </Suspense>
        <CounterButton />
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 9')).toBeInTheDocument()

  act(() => subject.next(3))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 3')).toBeInTheDocument()
})

it('writable count state with delayed value', async () => {
  const subject = new Subject<number>()
  const observableAtom = atomWithObservable(() => {
    const observable = of(1).pipe(delay(10 * 1000))
    observable.subscribe((n) => subject.next(n))
    return subject
  })

  const Counter = () => {
    const [state, dispatch] = useAtom(observableAtom)
    return (
      <>
        count: {state}
        <button
          onClick={() => {
            dispatch(9)
          }}
        >
          button
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

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(10000))
  expect(screen.getByText('count: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 9')).toBeInTheDocument()
})

it('only subscribe once per atom', async () => {
  const subject = new Subject<number>()
  let totalSubscriptions = 0
  const observable = new Observable<number>((subscriber) => {
    totalSubscriptions++
    subject.subscribe(subscriber)
  })
  const observableAtom = atomWithObservable(() => observable)

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  let rerender: (ui: ReactNode) => void
  await act(
    () =>
      ({ rerender } = render(
        <>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </>,
      )),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  act(() => subject.next(1))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 1')).toBeInTheDocument()

  rerender!(<div />)
  expect(totalSubscriptions).toEqual(1)

  rerender!(
    <>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </>,
  )

  act(() => subject.next(2))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 2')).toBeInTheDocument()

  expect(totalSubscriptions).toEqual(2)
})

it('cleanup subscription', async () => {
  const subject = new Subject<number>()
  let activeSubscriptions = 0
  const observable = new Observable<number>((subscriber) => {
    activeSubscriptions++
    subject.subscribe(subscriber)
    return () => {
      activeSubscriptions--
    }
  })
  const observableAtom = atomWithObservable(() => observable)

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  let rerender: (ui: ReactNode) => void
  await act(
    () =>
      ({ rerender } = render(
        <StrictMode>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </StrictMode>,
      )),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()

  subject.next(1)
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 1')).toBeInTheDocument()

  expect(activeSubscriptions).toEqual(1)
  rerender!(<div />)
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(activeSubscriptions).toEqual(0)
})

it('resubscribe on remount', async () => {
  const subject = new Subject<number>()
  const observableAtom = atomWithObservable(() => subject)

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  const Toggle = ({ children }: { children: ReactElement }) => {
    const [visible, setVisible] = useState(true)
    return (
      <>
        {visible && children}
        <button onClick={() => setVisible(!visible)}>Toggle</button>
      </>
    )
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Toggle>
            <Counter />
          </Toggle>
        </Suspense>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  act(() => subject.next(1))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('Toggle'))
  fireEvent.click(screen.getByText('Toggle'))
  act(() => subject.next(2))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 2')).toBeInTheDocument()
})

it("count state with initialValue doesn't suspend", () => {
  const subject = new Subject<number>()
  const observableAtom = atomWithObservable(() => subject, { initialValue: 5 })

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 5')).toBeInTheDocument()

  act(() => subject.next(10))
  act(() => vi.advanceTimersByTime(0))
  expect(screen.getByText('count: 10')).toBeInTheDocument()
})

it('writable count state with initialValue', () => {
  const subject = new Subject<number>()
  const observableAtom = atomWithObservable(() => subject, { initialValue: 5 })

  const Counter = () => {
    const [state, dispatch] = useAtom(observableAtom)
    return (
      <>
        count: {state}
        <button onClick={() => dispatch(9)}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>,
  )

  expect(screen.getByText('count: 5')).toBeInTheDocument()
  act(() => subject.next(1))
  act(() => vi.advanceTimersByTime(0))
  expect(screen.getByText('count: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  act(() => vi.advanceTimersByTime(0))
  expect(screen.getByText('count: 9')).toBeInTheDocument()
})

it('writable count state with error', async () => {
  const subject = new Subject<number>()
  const observableAtom = atomWithObservable(() => subject)

  const Counter = () => {
    const [state, dispatch] = useAtom(observableAtom)
    return (
      <>
        count: {state}
        <button onClick={() => dispatch(9)}>button</button>
      </>
    )
  }

  await act(() =>
    render(
      <StrictMode>
        <ErrorBoundary>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </ErrorBoundary>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()

  subject.error(new Error('Test Error'))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('Error: Test Error')).toBeInTheDocument()
})

it('synchronous subscription with initial value', () => {
  const observableAtom = atomWithObservable(() => of(1), { initialValue: 5 })

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 1')).toBeInTheDocument()
})

it('synchronous subscription with BehaviorSubject', () => {
  const observableAtom = atomWithObservable(() => new BehaviorSubject(1))

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 1')).toBeInTheDocument()
})

it('synchronous subscription with already emitted value', () => {
  const observableAtom = atomWithObservable(() => of(1))

  const Counter = () => {
    const [state] = useAtom(observableAtom)

    return <>count: {state}</>
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 1')).toBeInTheDocument()
})

it('with falsy initial value', () => {
  const observableAtom = atomWithObservable(() => new Subject<number>(), {
    initialValue: 0,
  })

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()
})

it('with initially emitted undefined value', async () => {
  const subject = new Subject<number | undefined | null>()
  const observableAtom = atomWithObservable(() => subject)

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state === undefined ? '-' : state}</>
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

  act(() => subject.next(undefined))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: -')).toBeInTheDocument()

  act(() => subject.next(1))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
})

it("don't omit values emitted between init and mount", async () => {
  const subject = new Subject<number>()
  const observableAtom = atomWithObservable(() => subject)

  const Counter = () => {
    const [state, dispatch] = useAtom(observableAtom)
    return (
      <>
        count: {state}
        <button
          onClick={() => {
            dispatch(9)
          }}
        >
          button
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

  expect(screen.getByText('loading')).toBeInTheDocument()

  subject.next(1)
  subject.next(2)
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 9')).toBeInTheDocument()
})

describe('error handling', () => {
  class ErrorBoundary extends Component<
    { message?: string; retry?: () => void; children: ReactNode },
    { hasError: boolean }
  > {
    constructor(props: { message?: string; children: ReactNode }) {
      super(props)
      this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
      return { hasError: true }
    }
    render() {
      return this.state.hasError ? (
        <div>
          {this.props.message || 'errored'}
          {this.props.retry && (
            <button
              onClick={() => {
                this.props.retry?.()
                this.setState({ hasError: false })
              }}
            >
              retry
            </button>
          )}
        </div>
      ) : (
        this.props.children
      )
    }
  }

  it('can catch error in error boundary', async () => {
    const subject = new Subject<number>()
    const countAtom = atomWithObservable(() => subject)

    const Counter = () => {
      const [count] = useAtom(countAtom)
      return (
        <>
          <div>count: {count}</div>
        </>
      )
    }

    await act(() =>
      render(
        <StrictMode>
          <ErrorBoundary>
            <Suspense fallback="loading">
              <Counter />
            </Suspense>
          </ErrorBoundary>
        </StrictMode>,
      ),
    )

    expect(screen.getByText('loading')).toBeInTheDocument()
    subject.error(new Error('Test Error'))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('errored')).toBeInTheDocument()
  })

  it('can recover from error with dependency', async () => {
    const baseAtom = atom(0)
    const countAtom = atomWithObservable((get) => {
      const base = get(baseAtom)
      if (base % 2 === 0) {
        const subject = new Subject<number>()
        const observable = of(1).pipe(delay(10 * 1000))
        observable.subscribe(() => subject.error(new Error('Test Error')))
        return subject
      }
      const observable = of(base).pipe(delay(10 * 1000))
      return observable
    })

    const Counter = () => {
      const [count] = useAtom(countAtom)
      const setBase = useSetAtom(baseAtom)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={() => setBase((v) => v + 1)}>next</button>
        </>
      )
    }

    const App = () => {
      const setBase = useSetAtom(baseAtom)
      const retry = () => {
        setBase((c) => c + 1)
      }
      return (
        <ErrorBoundary retry={retry}>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </ErrorBoundary>
      )
    }

    await act(() =>
      render(
        <StrictMode>
          <App />
        </StrictMode>,
      ),
    )

    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(10000))
    expect(screen.getByText('errored')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('retry')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(10000))
    expect(screen.getByText('count: 1')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('next')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(10000))
    expect(screen.getByText('errored')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('retry')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(10000))
    expect(screen.getByText('count: 3')).toBeInTheDocument()
  })

  it('can recover with intermediate atom', async () => {
    let count = -1
    let willThrowError = false
    const refreshAtom = atom(0)
    const countObservableAtom = atom((get) => {
      get(refreshAtom)
      const observableAtom = atomWithObservable(() => {
        willThrowError = !willThrowError
        ++count
        const subject = new Subject<{ data: number } | { error: Error }>()
        setTimeout(() => {
          if (willThrowError) {
            subject.next({ error: new Error('Test Error') })
          } else {
            subject.next({ data: count })
          }
        }, 10 * 1000)
        return subject
      })
      return observableAtom
    })
    const derivedAtom = atom((get) => {
      const observableAtom = get(countObservableAtom)
      const result = get(observableAtom)
      if (result instanceof Promise) {
        return result.then((result) => {
          if ('error' in result) {
            throw result.error
          }
          return result.data
        })
      }
      if ('error' in result) {
        throw result.error
      }
      return result.data
    })

    const Counter = () => {
      const [count] = useAtom(derivedAtom)
      const refresh = useSetAtom(refreshAtom)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={() => refresh((c) => c + 1)}>refresh</button>
        </>
      )
    }

    const App = () => {
      const refresh = useSetAtom(refreshAtom)
      const retry = () => {
        refresh((c) => c + 1)
      }
      return (
        <ErrorBoundary retry={retry}>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </ErrorBoundary>
      )
    }

    await act(() =>
      render(
        <StrictMode>
          <App />
        </StrictMode>,
      ),
    )

    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(10000))
    expect(screen.getByText('errored')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('retry')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(10000))
    expect(screen.getByText('count: 1')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('refresh')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(10000))
    expect(screen.getByText('errored')).toBeInTheDocument()

    await act(() => fireEvent.click(screen.getByText('retry')))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(10000))
    expect(screen.getByText('count: 3')).toBeInTheDocument()
  })
})

describe('wonka', () => {
  it('count state', () => {
    const source = fromValue(1)
    const observable = pipe(source, toObservable)
    const observableAtom = atomWithObservable(() => observable)

    const Counter = () => {
      const [count] = useAtom(observableAtom)
      return <>count: {count}</>
    }

    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>,
    )

    expect(screen.getByText('count: 1')).toBeInTheDocument()
  })

  it('make subject', async () => {
    const subject = makeSubject<number>()
    const observable = pipe(subject.source, toObservable)
    const observableAtom = atomWithObservable(() => observable)
    const countAtom = atom(
      (get) => get(observableAtom),
      (_get, _set, nextValue: number) => {
        subject.next(nextValue)
      },
    )

    const Counter = () => {
      const [count] = useAtom(countAtom)
      return <>count: {count}</>
    }

    const Controls = () => {
      const setCount = useSetAtom(countAtom)
      return <button onClick={() => setCount(1)}>button</button>
    }

    await act(() =>
      render(
        <StrictMode>
          <Controls />
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </StrictMode>,
      ),
    )

    expect(screen.getByText('loading')).toBeInTheDocument()

    fireEvent.click(screen.getByText('button'))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('count: 1')).toBeInTheDocument()
  })
})

describe('atomWithObservable vanilla tests', () => {
  it('can propagate updates with async atom chains', async () => {
    const store = createStore()

    const subject = new BehaviorSubject(1)
    const countAtom = atomWithObservable(() => subject)
    const asyncAtom = atom(async (get) => get(countAtom))
    const async2Atom = atom((get) => get(asyncAtom))

    const unsub = store.sub(async2Atom, () => {})

    await expect(store.get(async2Atom)).resolves.toBe(1)

    subject.next(2)
    await expect(store.get(async2Atom)).resolves.toBe(2)

    subject.next(3)
    await expect(store.get(async2Atom)).resolves.toBe(3)

    unsub()
  })

  it('can propagate updates with rxjs chains', () => {
    const store = createStore()

    const single$ = new Subject<number>()
    const double$ = single$.pipe(map((n) => n * 2))

    const singleAtom = atomWithObservable(() => single$)
    const doubleAtom = atomWithObservable(() => double$)

    const unsubs = [
      store.sub(singleAtom, () => {}),
      store.sub(doubleAtom, () => {}),
    ]

    single$.next(1)
    expect(store.get(singleAtom)).toBe(1)
    expect(store.get(doubleAtom)).toBe(2)

    single$.next(2)
    expect(store.get(singleAtom)).toBe(2)
    expect(store.get(doubleAtom)).toBe(4)

    single$.next(3)
    expect(store.get(singleAtom)).toBe(3)
    expect(store.get(doubleAtom)).toBe(6)

    unsubs.forEach((unsub) => unsub())
  })
})

it('should update continuous values in React 19', async () => {
  const counterSubject = interval(100).pipe(
    take(4),
    switchMap(async (i) => i),
  )

  const counterAtom = atomWithObservable(() => counterSubject, {
    unstable_timeout: 1000,
  })

  const countAtom = atom(async (get) => get(counterAtom))

  const Counter = () => {
    const count = useAtomValue(countAtom)
    return <div>count: {count}</div>
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
  await act(() => vi.advanceTimersByTimeAsync(400))
  expect(screen.getByText('count: 3')).toBeInTheDocument()
})
