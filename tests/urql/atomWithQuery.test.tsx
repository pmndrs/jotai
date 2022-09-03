import { Component, StrictMode, Suspense, useContext } from 'react'
import type { ReactNode } from 'react'
import { fireEvent, render } from '@testing-library/react'
import type { Client } from '@urql/core'
import { fromValue, interval, map, pipe, take, toPromise } from 'wonka'
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

const withPromise = (source$: any) => {
  source$.toPromise = () => pipe(source$, take(1), toPromise)
  return source$
}

const generateClient = (id: string | number, error?: () => boolean) =>
  ({
    query: () => {
      const source$ = withPromise(
        fromValue(
          error?.() ? { error: new Error('fetch error') } : { data: { id } }
        )
      )
      if (typeof id === 'number') {
        ++id
      }
      return source$
    },
  } as unknown as Client)

const generateContinuousClient = () =>
  ({
    query: () =>
      withPromise(
        pipe(
          interval(100),
          map((i: number) => ({ data: { count: i } }))
        )
      ),
  } as unknown as Client)

const Provider = getTestProvider()

it('query basic test', async () => {
  const countAtom = atomWithQuery<{ count: number }, Record<string, never>>(
    () => ({
      query: '{ count }',
      variables: {},
    }),
    () => generateContinuousClient()
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
  await findByText('count: 0')
  await findByText('count: 1')
  await findByText('count: 2')
})

it('query dependency test', async () => {
  type Update = (prev: number) => number
  const dummyAtom = atom(10)
  const setDummyAtom = atom(null, (_get, set, update: Update) =>
    set(dummyAtom, update)
  )
  const countAtom = atomWithQuery<{ count: number }, { dummy: number }>(
    (get) => ({
      query: '{ count }',
      variables: {
        dummy: get(dummyAtom),
      },
    }),
    () => generateContinuousClient()
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
  await findByText('count: 0')
  await findByText('count: 1')
  await findByText('count: 2')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('dummy'))
  await findByText('loading')
  await findByText('count: 0')
  await findByText('count: 1')
  await findByText('count: 2')
})

it('query change client at runtime', async () => {
  const firstClient = generateClient('first')
  const secondClient = generateClient('second')
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
  await findByText('id: first')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('second'))
  await findByText('loading')
  await findByText('id: second')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('first'))
  await findByText('loading')
  await findByText('id: first')
})

it('pause test', async () => {
  const enabledAtom = atom(false)
  const countAtom = atomWithQuery<{ count: number }, Record<string, never>>(
    (get) => ({
      query: '{ count }',
      variables: {},
      pause: !get(enabledAtom),
    }),
    () => generateContinuousClient()
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

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('toggle'))
  await findByText('loading')
  await findByText('count: 0')
})

it('reexecute test', async () => {
  const countAtom = atomWithQuery<{ count: number }, Record<string, never>>(
    () => ({
      query: '{ count }',
      variables: {},
    }),
    () => generateContinuousClient()
  )

  const Counter = () => {
    const [{ data }, dispatch] = useAtom(countAtom)
    return (
      <>
        <div>count: {data.count}</div>
        <button onClick={() => dispatch({ type: 'reexecute' })}>button</button>
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
  await findByText('count: 0')
  await findByText('count: 1')
  await findByText('count: 2')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('count: 0')
  await findByText('count: 1')
  await findByText('count: 2')
})

it('query null client suspense', async () => {
  const client = generateClient('client is set')
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

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('set'))
  await findByText('loading')
  await findByText('client is set')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('unset'))
  await findByText('no data')

  await new Promise((r) => setTimeout(r, 100))
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
    const countAtom = atomWithQuery<{ count: number }, Record<string, never>>(
      () => ({
        query: '{ count }',
        variables: {},
      }),
      () => generateClient(0, () => true)
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
    await findByText('errored')
  })

  it('can recover from error', async () => {
    let willThrowError = false
    const countAtom = atomWithQuery<{ count: number }, Record<string, never>>(
      () => ({
        query: '{ count }',
        variables: {},
      }),
      () =>
        generateClient(0, () => {
          willThrowError = !willThrowError
          return willThrowError
        })
    )

    const Counter = () => {
      const [
        {
          data: { count },
        },
        dispatch,
      ] = useAtom(countAtom)
      const refetch = () => dispatch({ type: 'reexecute' })
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
          dispatch({ type: 'reexecute' })
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
    await findByText('errored')

    await new Promise((r) => setTimeout(r, 100))
    fireEvent.click(getByText('retry'))
    await findByText('loading')
    await findByText('count: 1')

    await new Promise((r) => setTimeout(r, 100))
    fireEvent.click(getByText('refetch'))
    await findByText('loading')
    await findByText('errored')

    await new Promise((r) => setTimeout(r, 100))
    fireEvent.click(getByText('retry'))
    await findByText('loading')
    await findByText('count: 3')
  })
})
