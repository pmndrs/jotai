import { Component, StrictMode, Suspense, useContext, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { BehaviorSubject, Observable, Subject, delay, of } from 'rxjs'
import {
  atom,
  SECRET_INTERNAL_getScopeContext as getScopeContext,
  useAtom,
  useAtomValue,
  useSetAtom,
} from 'jotai'
import { RESET, atomWithObservable } from 'jotai/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

// This is only used to pass tests with unstable_enableVersionedWrite
const useRetryFromError = (scope?: symbol | string | number) => {
  const ScopeContext = getScopeContext(scope)
  const { r: retryFromError } = useContext(ScopeContext)
  return retryFromError || ((fn) => fn())
}

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
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
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
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
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
      <Provider>
        <Suspense fallback="loading">
          <Suspense fallback="loading">
            <CounterValue />
          </Suspense>
          <CounterButton />
        </Suspense>
      </Provider>
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
    const observable = of(1).pipe(delay(500))
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
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
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
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )
  await findByText('loading')
  act(() => subject.next(1))
  await findByText('count: 1')

  rerender(<div />)
  expect(totalSubscriptions).toEqual(1)

  rerender(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
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
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
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
      <Provider>
        <Suspense fallback="loading">
          <Toggle>
            <Counter />
          </Toggle>
        </Suspense>
      </Provider>
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
      <Provider>
        <Counter />
      </Provider>
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
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
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
      <Provider>
        <ErrorBoundary>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </ErrorBoundary>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')

  act(() => subject.error(new Error('Test Error')))
  findByText('Error: Test Error')
})

it('synchronous subscription with initial value', async () => {
  const observableAtom = atomWithObservable(() => of(1), { initialValue: 5 })

  const Counter = () => {
    const [state] = useAtom(observableAtom)

    return <>count: {state}</>
  }

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <Counter />
      </Provider>
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
      <Provider>
        <Counter />
      </Provider>
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
      <Provider>
        <Counter />
      </Provider>
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
      <Provider>
        <Counter />
      </Provider>
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
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
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
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  act(() => subject.next(1))
  act(() => subject.next(2))
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
        <Provider>
          <ErrorBoundary>
            <Suspense fallback="loading">
              <Counter />
            </Suspense>
          </ErrorBoundary>
        </Provider>
      </StrictMode>
    )

    await findByText('loading')
    act(() => subject.error(new Error('Test Error')))
    await findByText('errored')
  })

  it('can recover from error', async () => {
    const subject = new Subject<number>()
    const countAtom = atomWithObservable(() => subject)

    const Counter = () => {
      const [count, dispatch] = useAtom(countAtom)
      const refetch = () => dispatch(RESET)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={refetch}>refetch</button>
        </>
      )
    }

    const App = () => {
      const dispatch = useSetAtom(countAtom)
      const retryFromError = useRetryFromError()
      const retry = () => {
        retryFromError(() => {
          dispatch(RESET)
        })
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
        <Provider>
          <App />
        </Provider>
      </StrictMode>
    )

    await findByText('loading')
    act(() => subject.error(new Error('Test Error')))
    await findByText('errored')

    await new Promise((r) => setTimeout(r, 100))
    fireEvent.click(getByText('retry'))
    await findByText('loading')
    act(() => subject.next(1))
    await findByText('count: 1')

    await new Promise((r) => setTimeout(r, 100))
    fireEvent.click(getByText('retry'))
    await findByText('loading')
    act(() => subject.error(new Error('Test Error')))
    await findByText('errored')

    await new Promise((r) => setTimeout(r, 100))
    fireEvent.click(getByText('retry'))
    await findByText('loading')
    act(() => subject.next(1))
    await findByText('count: 3')
  })

  it('can recover from error with dependency', async () => {
    const baseAtom = atom(0)
    const countAtom = atomWithObservable((get) => {
      const base = get(baseAtom)
      if (base % 2 === 0) {
        const subject = new Subject<number>()
        setTimeout(() => {
          subject.error(new Error('Test Error'))
        }, 100)
        return subject
      }
      const observable = of(base).pipe(delay(500))
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
      const retryFromError = useRetryFromError()
      const retry = () => {
        retryFromError(() => {
          setBase((c) => c + 1)
        })
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
        <Provider>
          <App />
        </Provider>
      </StrictMode>
    )

    await findByText('loading')
    await findByText('errored')

    await new Promise((r) => setTimeout(r, 100))
    fireEvent.click(getByText('retry'))
    await findByText('loading')
    await findByText('count: 1')

    await new Promise((r) => setTimeout(r, 100))
    fireEvent.click(getByText('next'))
    await findByText('loading')
    await findByText('errored')

    await new Promise((r) => setTimeout(r, 100))
    fireEvent.click(getByText('retry'))
    await findByText('loading')
    await findByText('count: 3')
  })
})
