// TODO make test in vanilla

import { Component, StrictMode, Suspense, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { BehaviorSubject, Observable, Subject, delay, of } from 'rxjs'
import { fromValue, makeSubject, pipe, toObservable } from 'wonka'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import { atomWithObservable } from 'jotai/vanilla/utils'

beforeEach(() => {
  jest.useFakeTimers()
})
afterEach(() => {
  jest.runAllTimers()
  jest.useRealTimers()
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

it('count state', async () => {
  const observableAtom = atomWithObservable(() => of(1))

  const Counter = () => {
    const [state] = useAtom(observableAtom)

    return <>count: {state}</>
  }

  const { findByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>
  )

  await findByText('count: 1')
})

it('writable count state', async () => {
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

  const { findByText, getByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>
  )

  await findByText('count: 1')

  act(() => subject.next(2))
  await findByText('count: 2')

  fireEvent.click(getByText('button'))
  await findByText('count: 9')
  expect(subject.value).toBe(9)

  expect(subject)
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

  const { findByText, getByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <CounterValue />
      </Suspense>
      <CounterButton />
    </StrictMode>
  )

  await findByText('loading')

  fireEvent.click(getByText('button'))
  await findByText('count: 9')

  act(() => subject.next(3))
  await findByText('count: 3')
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
          }}>
          button
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>
  )

  await findByText('loading')
  jest.runOnlyPendingTimers()
  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 9')
})

it('only subscribe once per atom', async () => {
  const subject = new Subject()
  let totalSubscriptions = 0
  const observable = new Observable((subscriber) => {
    totalSubscriptions++
    subject.subscribe(subscriber)
  })
  const observableAtom = atomWithObservable(() => observable)

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  const { findByText, rerender } = render(
    <>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </>
  )
  await findByText('loading')
  act(() => subject.next(1))
  await findByText('count: 1')

  rerender(<div />)
  expect(totalSubscriptions).toEqual(1)

  rerender(
    <>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </>
  )
  act(() => subject.next(2))
  await findByText('count: 2')

  expect(totalSubscriptions).toEqual(2)
})

it('cleanup subscription', async () => {
  const subject = new Subject()
  let activeSubscriptions = 0
  const observable = new Observable((subscriber) => {
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

  const { findByText, rerender } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>
  )

  await findByText('loading')

  act(() => subject.next(1))
  await findByText('count: 1')

  expect(activeSubscriptions).toEqual(1)
  rerender(<div />)
  await waitFor(() => expect(activeSubscriptions).toEqual(0))
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

  const { findByText, getByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Toggle>
          <Counter />
        </Toggle>
      </Suspense>
    </StrictMode>
  )

  await findByText('loading')
  act(() => subject.next(1))
  await findByText('count: 1')

  fireEvent.click(getByText('Toggle'))
  fireEvent.click(getByText('Toggle'))

  act(() => subject.next(2))
  await findByText('count: 2')
})

it("count state with initialValue doesn't suspend", async () => {
  const subject = new Subject<number>()
  const observableAtom = atomWithObservable(() => subject, { initialValue: 5 })

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  const { findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('count: 5')

  act(() => subject.next(10))

  await findByText('count: 10')
})

it('writable count state with initialValue', async () => {
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

  const { findByText, getByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>
  )

  await findByText('count: 5')
  act(() => subject.next(1))
  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 9')
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

  const { findByText } = render(
    <StrictMode>
      <ErrorBoundary>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </ErrorBoundary>
    </StrictMode>
  )

  await findByText('loading')

  act(() => subject.error(new Error('Test Error')))
  await findByText('Error: Test Error')
})

it('synchronous subscription with initial value', async () => {
  const observableAtom = atomWithObservable(() => of(1), { initialValue: 5 })

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  const { findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('count: 1')
})

it('synchronous subscription with BehaviorSubject', async () => {
  const observableAtom = atomWithObservable(() => new BehaviorSubject(1))

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  const { findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('count: 1')
})

it('synchronous subscription with already emitted value', async () => {
  const observableAtom = atomWithObservable(() => of(1))

  const Counter = () => {
    const [state] = useAtom(observableAtom)

    return <>count: {state}</>
  }

  const { findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('count: 1')
})

it('with falsy initial value', async () => {
  const observableAtom = atomWithObservable(() => new Subject<number>(), {
    initialValue: 0,
  })

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state}</>
  }

  const { findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('count: 0')
})

it('with initially emitted undefined value', async () => {
  const subject = new Subject<number | undefined | null>()
  const observableAtom = atomWithObservable(() => subject)

  const Counter = () => {
    const [state] = useAtom(observableAtom)
    return <>count: {state === undefined ? '-' : state}</>
  }

  const { findByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>
  )

  await findByText('loading')
  act(() => subject.next(undefined))
  await findByText('count: -')
  act(() => subject.next(1))
  await findByText('count: 1')
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
          }}>
          button
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>
  )

  await findByText('loading')
  act(() => {
    subject.next(1)
    subject.next(2)
  })
  await findByText('count: 2')

  fireEvent.click(getByText('button'))
  await findByText('count: 9')
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
              }}>
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

    const { findByText } = render(
      <StrictMode>
        <ErrorBoundary>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </ErrorBoundary>
      </StrictMode>
    )

    await findByText('loading')
    act(() => subject.error(new Error('Test Error')))
    await findByText('errored')
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

    const { findByText, getByText } = render(
      <StrictMode>
        <App />
      </StrictMode>
    )

    await findByText('loading')
    jest.runOnlyPendingTimers()
    await findByText('errored')

    fireEvent.click(getByText('retry'))
    await findByText('loading')
    jest.runOnlyPendingTimers()
    await findByText('count: 1')

    fireEvent.click(getByText('next'))
    await findByText('loading')
    jest.runOnlyPendingTimers()
    await findByText('errored')

    fireEvent.click(getByText('retry'))
    await findByText('loading')
    jest.runOnlyPendingTimers()
    await findByText('count: 3')
  })
})

describe('wonka', () => {
  it('count state', async () => {
    const source = fromValue(1)
    const observable = pipe(source, toObservable)
    const observableAtom = atomWithObservable(() => observable)

    const Counter = () => {
      const [count] = useAtom(observableAtom)
      return <>count: {count}</>
    }

    const { findByText } = render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>
    )

    await findByText('count: 1')
  })

  it('make subject', async () => {
    const subject = makeSubject<number>()
    const observable = pipe(subject.source, toObservable)
    const observableAtom = atomWithObservable(() => observable)
    const countAtom = atom(
      (get) => get(observableAtom),
      (_get, _set, nextValue: number) => {
        subject.next(nextValue)
      }
    )

    const Counter = () => {
      const [count] = useAtom(countAtom)
      return <>count: {count}</>
    }

    const Controls = () => {
      const setCount = useSetAtom(countAtom)
      return <button onClick={() => setCount(1)}>button</button>
    }

    const { findByText, getByText } = render(
      <StrictMode>
        <Controls />
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>
    )

    await findByText('loading')

    fireEvent.click(getByText('button'))
    await findByText('count: 1')
  })
})
