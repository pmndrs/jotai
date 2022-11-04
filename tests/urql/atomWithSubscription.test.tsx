import { Component, StrictMode, Suspense, useContext } from 'react'
import type { ReactNode } from 'react'
import { fireEvent, render } from '@testing-library/react'
import type { Client, TypedDocumentNode } from '@urql/core'
import { makeSubject, map, pipe } from 'wonka'
import type { Source } from 'wonka'
import {
  atom,
  SECRET_INTERNAL_getScopeContext as getScopeContext,
  useAtom,
  useSetAtom,
} from 'jotai'
import { atomWithSubscription } from 'jotai/urql'
import { StrictModeUnlessVersionedWrite, getTestProvider } from '../testUtils'

// This is only used to pass tests with unstable_enableVersionedWrite
const useRetryFromError = (scope?: symbol | string | number) => {
  const ScopeContext = getScopeContext(scope)
  const { r: retryFromError } = useContext(ScopeContext)
  return retryFromError || ((fn) => fn())
}

const generateClient = (
  source: Source<number>,
  id = 'default',
  error?: () => boolean
) =>
  ({
    subscription: () =>
      pipe(
        source,
        map((i: number) =>
          error?.()
            ? { error: new Error('fetch error') }
            : { data: { id, count: i } }
        )
      ),
  } as unknown as Client)

const Provider = getTestProvider()

it('subscription basic test', async () => {
  const subject = makeSubject<number>()
  const clientMock = generateClient(subject.source)

  const countAtom = atomWithSubscription(
    () => ({
      query: 'subscription Test { count }' as unknown as TypedDocumentNode<{
        count: number
      }>,
      variables: {},
    }),
    () => clientMock
  )

  const Counter = () => {
    const [{ data }] = useAtom(countAtom)
    return (
      <>
        <div>count: {data.count}</div>
      </>
    )
  }

  const { findByText } = render(
    <>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </>
  )

  await findByText('loading')
  subject.next(0)
  await findByText('count: 0')
  subject.next(1)
  await findByText('count: 1')
  subject.next(2)
  await findByText('count: 2')
})

it('subscription change client at runtime', async () => {
  let subject = makeSubject<number>()
  const clientAtom = atom(generateClient(subject.source, 'first'))
  const countAtom = atomWithSubscription(
    () => ({
      query: 'subscription Test { id, count }' as unknown as TypedDocumentNode<{
        id: string
        count: number
      }>,
      variables: {},
    }),
    (get) => get(clientAtom)
  )

  const Counter = () => {
    const [{ data }] = useAtom(countAtom)
    return (
      <>
        <div>
          {data.id} count: {data.count}
        </div>
      </>
    )
  }

  const Controls = () => {
    const [, setClient] = useAtom(clientAtom)
    return (
      <>
        <button
          onClick={() => {
            subject = makeSubject<number>()
            setClient(generateClient(subject.source, 'first'))
          }}>
          first
        </button>
        <button
          onClick={() => {
            subject = makeSubject<number>()
            setClient(generateClient(subject.source, 'second'))
          }}>
          second
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Controls />
      </Provider>
    </>
  )

  await findByText('loading')
  subject.next(0)
  await findByText('first count: 0')
  subject.next(1)
  await findByText('first count: 1')
  subject.next(2)
  await findByText('first count: 2')

  fireEvent.click(getByText('second'))
  await findByText('loading')
  subject.next(0)
  await findByText('second count: 0')
  subject.next(1)
  await findByText('second count: 1')
  subject.next(2)
  await findByText('second count: 2')

  fireEvent.click(getByText('first'))
  await findByText('loading')
  subject.next(0)
  await findByText('first count: 0')
  subject.next(1)
  await findByText('first count: 1')
  subject.next(2)
  await findByText('first count: 2')
})

it('pause test', async () => {
  const subject = makeSubject<number>()
  const clientMock = generateClient(subject.source)

  const enabledAtom = atom(false)
  const countAtom = atomWithSubscription(
    (get) => ({
      query: 'subscription Test { count }' as unknown as TypedDocumentNode<{
        count: number
      }>,
      variables: {},
      pause: !get(enabledAtom),
    }),
    () => clientMock
  )

  const Counter = () => {
    const [result] = useAtom(countAtom)
    return (
      <>
        <div>count: {result ? result.data.count : 'paused'}</div>
      </>
    )
  }

  const Controls = () => {
    const [, setEnabled] = useAtom(enabledAtom)
    return <button onClick={() => setEnabled((x) => !x)}>toggle</button>
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Controls />
      </Provider>
    </StrictMode>
  )

  await findByText('count: paused')

  fireEvent.click(getByText('toggle'))
  await findByText('loading')
  subject.next(0)
  await findByText('count: 0')
  subject.next(1)
  await findByText('count: 1')
  subject.next(2)
  await findByText('count: 2')
})

it('null client suspense', async () => {
  let subject = makeSubject<number>()

  const clientAtom = atom<Client | null>(null)
  const countAtom = atomWithSubscription(
    () => ({
      query: 'subscription Test { id, count }' as unknown as TypedDocumentNode<{
        id: string
        count: number
      }>,
      variables: {},
    }),
    (get) => get(clientAtom) as Client
  )
  // Derived Atom to safe guard when client is null
  const guardedCountAtom = atom(
    (get): { data?: { id: string; count: number } } => {
      const client = get(clientAtom)
      if (client === null) return {}
      return get(countAtom)
    }
  )

  const Counter = () => {
    const [{ data }] = useAtom(guardedCountAtom)
    return (
      <>
        <div>
          {data ? (
            <>
              {data?.id} count: {data?.count}
            </>
          ) : (
            'no data'
          )}
        </div>
      </>
    )
  }

  const Controls = () => {
    const [, setClient] = useAtom(clientAtom)
    return (
      <>
        <button
          onClick={() => {
            subject = makeSubject<number>()
            setClient(generateClient(subject.source))
          }}>
          set
        </button>
        <button onClick={() => setClient(null)}>unset</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictModeUnlessVersionedWrite>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Controls />
      </Provider>
    </StrictModeUnlessVersionedWrite>
  )

  await findByText('no data')

  fireEvent.click(getByText('set'))
  await findByText('loading')
  subject.next(0)
  await findByText('default count: 0')
  subject.next(1)
  await findByText('default count: 1')
  subject.next(2)
  await findByText('default count: 2')

  fireEvent.click(getByText('unset'))
  await findByText('no data')

  fireEvent.click(getByText('set'))
  subject.next(0)
  await findByText('default count: 0')
  subject.next(1)
  await findByText('default count: 1')
  subject.next(2)
  await findByText('default count: 2')
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
    const subject = makeSubject<number>()
    const client = generateClient(subject.source, undefined, () => true)
    const countAtom = atomWithSubscription(
      () => ({
        query: 'subscription Test { count }' as unknown as TypedDocumentNode<{
          count: number
        }>,
        variables: {},
      }),
      () => client
    )

    const Counter = () => {
      const [{ data }] = useAtom(countAtom)
      return <div>count: {data.count}</div>
    }

    const { findByText } = render(
      <Provider>
        <ErrorBoundary>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </ErrorBoundary>
      </Provider>
    )

    await findByText('loading')
    subject.next(0)
    await findByText('errored')
  })

  it('can recover from error', async () => {
    const subject = makeSubject<number>()
    let willThrowError = true
    const client = generateClient(
      subject.source,
      undefined,
      () => willThrowError
    )
    const countAtom = atomWithSubscription(
      () => ({
        query: 'subscription Test { count }' as unknown as TypedDocumentNode<{
          count: number
        }>,
        variables: {},
      }),
      () => client
    )

    const Counter = () => {
      const [
        {
          data: { count },
        },
        dispatch,
      ] = useAtom(countAtom)
      const refetch = () => dispatch({ type: 'refetch' })
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
          dispatch({ type: 'refetch' })
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
      <Provider>
        <App />
      </Provider>
    )

    await findByText('loading')
    subject.next(0)
    await findByText('errored')

    willThrowError = false
    fireEvent.click(getByText('retry'))
    await findByText('loading')
    subject.next(0)
    await findByText('count: 0')
    subject.next(1)
    await findByText('count: 1')
    subject.next(2)
    await findByText('count: 2')

    willThrowError = true
    fireEvent.click(getByText('refetch'))
    await findByText('loading')
    subject.next(0)
    await findByText('errored')

    willThrowError = false
    fireEvent.click(getByText('retry'))
    await findByText('loading')
    subject.next(0)
    await findByText('count: 0')
    subject.next(1)
    await findByText('count: 1')
    subject.next(2)
    await findByText('count: 2')
  })
})
