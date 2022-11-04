import { Component, StrictMode, Suspense, useContext } from 'react'
import type { ReactNode } from 'react'
import { fireEvent, render } from '@testing-library/react'
import type { Client } from '@urql/core'
import { delay, fromValue, makeSubject, map, pipe } from 'wonka'
import type { Source } from 'wonka'
import {
  atom,
  SECRET_INTERNAL_getScopeContext as getScopeContext,
  useAtom,
  useSetAtom,
} from 'jotai'
import { atomWithQuery } from 'jotai/urql'
import { getTestProvider } from '../testUtils'

// This is only used to pass tests with unstable_enableVersionedWrite
const useRetryFromError = (scope?: symbol | string | number) => {
  const ScopeContext = getScopeContext(scope)
  const { r: retryFromError } = useContext(ScopeContext)
  return retryFromError || ((fn) => fn())
}

const generateClient = (
  source: Source<string | number>,
  error?: () => boolean
) =>
  ({
    query: () =>
      pipe(
        source,
        map((id) =>
          error?.() ? { error: new Error('fetch error') } : { data: { id } }
        ),
        delay(1) // FIXME we want to eliminate this
      ),
  } as unknown as Client)

const generateContinuousClient = (source: Source<number>) =>
  ({
    query: () =>
      pipe(
        source,
        map((i: number) => ({ data: { count: i } }))
      ),
  } as unknown as Client)

const Provider = getTestProvider()

it('query basic test', async () => {
  const subject = makeSubject<number>()
  const countAtom = atomWithQuery<{ count: number }, Record<string, never>>(
    () => ({
      query: '{ count }',
      variables: {},
    }),
    () => generateContinuousClient(subject.source)
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
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  subject.next(0)
  await findByText('count: 0')
  subject.next(1)
  await findByText('count: 1')
  subject.next(2)
  await findByText('count: 2')
})

it('query dependency test', async () => {
  type Update = (prev: number) => number
  const dummyAtom = atom(10)
  const setDummyAtom = atom(null, (_get, set, update: Update) =>
    set(dummyAtom, update)
  )
  let subject = makeSubject<number>()
  const countAtom = atomWithQuery<{ count: number }, { dummy: number }>(
    (get) => ({
      query: '{ count }',
      variables: {
        dummy: get(dummyAtom),
      },
    }),
    () => {
      subject = makeSubject<number>()
      return generateContinuousClient(subject.source)
    }
  )

  const Counter = () => {
    const [{ data }] = useAtom(countAtom)
    return (
      <>
        <div>count: {data.count}</div>
      </>
    )
  }

  const Controls = () => {
    const [, setDummy] = useAtom(setDummyAtom)
    return <button onClick={() => setDummy((c) => c + 1)}>dummy</button>
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

  await findByText('loading')
  subject.next(0)
  await findByText('count: 0')
  subject.next(1)
  await findByText('count: 1')
  subject.next(2)
  await findByText('count: 2')

  fireEvent.click(getByText('dummy'))
  await findByText('loading')
  subject.next(0)
  await findByText('count: 0')
  subject.next(1)
  await findByText('count: 1')
  subject.next(2)
  await findByText('count: 2')
})

it('query change client at runtime', async () => {
  const firstSubject = makeSubject<string>()
  const secondSubject = makeSubject<string>()
  const firstClient = generateClient(firstSubject.source)
  const secondClient = generateClient(secondSubject.source)
  const clientAtom = atom(firstClient)
  const idAtom = atomWithQuery<{ id: string }, Record<string, never>>(
    () => ({
      query: '{ id }',
      variables: {},
    }),
    (get) => get(clientAtom)
  )

  const Identifier = () => {
    const [{ data }] = useAtom(idAtom)
    return (
      <>
        <div>id: {data.id}</div>
      </>
    )
  }

  const Controls = () => {
    const [, setClient] = useAtom(clientAtom)
    return (
      <>
        <button onClick={() => setClient(firstClient)}>first</button>
        <button onClick={() => setClient(secondClient)}>second</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Identifier />
        </Suspense>
        <Controls />
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  firstSubject.next('first')
  await findByText('id: first')

  fireEvent.click(getByText('second'))
  await findByText('loading')
  secondSubject.next('second')
  await findByText('id: second')

  fireEvent.click(getByText('first'))
  await findByText('loading')
  firstSubject.next('first')
  await findByText('id: first')
})

it('pause test', async () => {
  const enabledAtom = atom(false)
  const subject = makeSubject<number>()
  const countAtom = atomWithQuery<{ count: number }, Record<string, never>>(
    (get) => ({
      query: '{ count }',
      variables: {},
      pause: !get(enabledAtom),
    }),
    () => generateContinuousClient(subject.source)
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
})

it('refetch test', async () => {
  let subject = makeSubject<number>()
  const countAtom = atomWithQuery<{ count: number }, Record<string, never>>(
    () => ({
      query: '{ count }',
      variables: {},
    }),
    () => {
      subject = makeSubject<number>()
      return generateContinuousClient(subject.source)
    }
  )

  const Counter = () => {
    const [{ data }, dispatch] = useAtom(countAtom)
    return (
      <>
        <div>count: {data.count}</div>
        <button onClick={() => dispatch({ type: 'refetch' })}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  subject.next(0)
  await findByText('count: 0')
  subject.next(1)
  await findByText('count: 1')
  subject.next(2)
  await findByText('count: 2')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  subject.next(0)
  await findByText('count: 0')
  subject.next(1)
  await findByText('count: 1')
  subject.next(2)
  await findByText('count: 2')
})

it('query null client suspense', async () => {
  const client = generateClient(fromValue('client is set'))
  const clientAtom = atom<Client | null>(null)
  const idAtom = atomWithQuery<{ id: string }, Record<string, never>>(
    () => ({
      query: '{ id }',
      variables: {},
    }),
    (get) => get(clientAtom) as Client
  )
  // Derived Atom to safe guard when client is null
  const guardedIdAtom = atom((get): { data?: { id: string } } => {
    const client = get(clientAtom)
    if (client === null) return {}
    return get(idAtom)
  })

  const Identifier = () => {
    const [{ data }] = useAtom(guardedIdAtom)
    return (
      <>
        <div>{data?.id ? data?.id : 'no data'}</div>
      </>
    )
  }

  const Controls = () => {
    const [, setClient] = useAtom(clientAtom)
    return (
      <>
        <button onClick={() => setClient(null)}>unset</button>
        <button onClick={() => setClient(client)}>set</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Identifier />
        </Suspense>
        <Controls />
      </Provider>
    </StrictMode>
  )

  await findByText('no data')

  fireEvent.click(getByText('set'))
  await findByText('loading')
  await findByText('client is set')

  fireEvent.click(getByText('unset'))
  await findByText('no data')

  fireEvent.click(getByText('unset'))
  fireEvent.click(getByText('set'))
  await findByText('loading')
  await findByText('client is set')
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
    const client = generateClient(subject.source, () => true)
    const countAtom = atomWithQuery<{ id: number }, Record<string, never>>(
      () => ({
        query: '{ id }',
        variables: {},
      }),
      () => client
    )

    const Counter = () => {
      const [{ data }] = useAtom(countAtom)
      return <div>count: {data.id}</div>
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
    let willThrowError = true
    const subject = makeSubject<number>()
    const client = generateClient(subject.source, () => willThrowError)
    const countAtom = atomWithQuery<{ id: number }, Record<string, never>>(
      () => ({
        query: '{ id }',
        variables: {},
      }),
      () => client
    )

    const Counter = () => {
      const [
        {
          data: { id },
        },
        dispatch,
      ] = useAtom(countAtom)
      const refetch = () => dispatch({ type: 'refetch' })
      return (
        <>
          <div>count: {id}</div>
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
    subject.next(1)
    await findByText('count: 1')

    willThrowError = true
    fireEvent.click(getByText('refetch'))
    await findByText('loading')
    subject.next(2)
    await findByText('errored')

    willThrowError = false
    fireEvent.click(getByText('retry'))
    await findByText('loading')
    subject.next(3)
    await findByText('count: 3')
  })
})
