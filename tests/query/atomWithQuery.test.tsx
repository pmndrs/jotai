import { Component, StrictMode, Suspense, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/query-core'
import { fireEvent, render } from '@testing-library/react'
import {
  atom,
  SECRET_INTERNAL_getScopeContext as getScopeContext,
  useAtom,
  useSetAtom,
} from 'jotai'
import { atomWithQuery } from 'jotai/query'
import { getTestProvider } from '../testUtils'
import fakeFetch from './fakeFetch'

const Provider = getTestProvider()

// This is only used to pass tests with unstable_enableVersionedWrite
const useRetryFromError = (scope?: symbol | string | number) => {
  const ScopeContext = getScopeContext(scope)
  const { r: retryFromError } = useContext(ScopeContext)
  return retryFromError || ((fn) => fn())
}

it('query basic test', async () => {
  const countAtom = atomWithQuery(() => ({
    queryKey: ['count1'],
    queryFn: async () => {
      return await fakeFetch({ count: 0 }, false, 100)
    },
  }))
  const Counter = () => {
    const [
      {
        response: { count },
      },
    ] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
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
})

it('query basic test with object instead of function', async () => {
  const countAtom = atomWithQuery({
    queryKey: ['count2'],
    queryFn: async () => {
      return await fakeFetch({ count: 0 }, false, 100)
    },
  })
  const Counter = () => {
    const [
      {
        response: { count },
      },
    ] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
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
})

it('query refetch', async () => {
  let count = 0
  const mockFetch = jest.fn(fakeFetch)
  const countAtom = atomWithQuery(() => ({
    queryKey: ['count3'],
    queryFn: async () => {
      const response = await mockFetch({ count }, false, 100)
      ++count
      return response
    },
  }))
  const Counter = () => {
    const [
      {
        response: { count },
      },
      dispatch,
    ] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => dispatch({ type: 'refetch' })}>refetch</button>
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
  await findByText('count: 0')
  expect(mockFetch).toBeCalledTimes(1)

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('refetch'))
  await findByText('loading')
  await findByText('count: 1')
  expect(mockFetch).toBeCalledTimes(2)
})

it('query loading', async () => {
  let count = 0
  const mockFetch = jest.fn(fakeFetch)
  const countAtom = atomWithQuery(() => ({
    queryKey: ['count4'],
    queryFn: async () => {
      const response = await mockFetch({ count }, false, 100)
      ++count
      return response
    },
  }))
  const derivedAtom = atom((get) => get(countAtom))
  const dispatchAtom = atom(null, (_get, set, action: any) => {
    set(countAtom, action)
  })
  const Counter = () => {
    const [
      {
        response: { count },
      },
    ] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }
  const RefreshButton = () => {
    const [, dispatch] = useAtom(dispatchAtom)
    return (
      <button onClick={() => dispatch({ type: 'refetch' })}>refetch</button>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <RefreshButton />
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await findByText('count: 0')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('refetch'))
  await findByText('loading')
  await findByText('count: 1')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('refetch'))
  await findByText('loading')
  await findByText('count: 2')
})

it('query loading 2', async () => {
  let count = 0
  const mockFetch = jest.fn(fakeFetch)
  const countAtom = atomWithQuery(() => ({
    queryKey: ['count5'],
    queryFn: async () => {
      const response = await mockFetch({ count }, false, 100)
      ++count
      return response
    },
  }))

  const Counter = () => {
    const [
      {
        response: { count },
      },
      dispatch,
    ] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => dispatch({ type: 'refetch' })}>refetch</button>
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
  await findByText('count: 0')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('refetch'))
  await findByText('loading')
  await findByText('count: 1')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('refetch'))
  await findByText('loading')
  await findByText('count: 2')
})

it('query no-loading with keepPreviousData', async () => {
  const dataAtom = atom(0)
  const mockFetch = jest.fn(fakeFetch)
  const countAtom = atomWithQuery((get) => ({
    queryKey: ['keepPreviousData', get(dataAtom)],
    keepPreviousData: true,
    queryFn: async () => {
      const response = await mockFetch({ count: get(dataAtom) }, false, 100)
      return response
    },
  }))
  const Counter = () => {
    const [
      {
        response: { count },
      },
    ] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }
  const RefreshButton = () => {
    const [data, setData] = useAtom(dataAtom)
    return <button onClick={() => setData(data + 1)}>refetch</button>
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <RefreshButton />
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await findByText('count: 0')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('refetch'))
  await expect(() => findByText('loading')).rejects.toThrow()
  await findByText('count: 1')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('refetch'))
  await expect(() => findByText('loading')).rejects.toThrow()
  await findByText('count: 2')
})

it('query with enabled', async () => {
  const slugAtom = atom<string | null>(null)
  const mockFetch = jest.fn(fakeFetch)
  const slugQueryAtom = atomWithQuery((get) => {
    const slug = get(slugAtom)
    return {
      enabled: !!slug,
      queryKey: ['disabled_until_value', slug],
      queryFn: async () => {
        return await mockFetch({ slug: `hello-${slug}` }, false, 100)
      },
    }
  })

  const Slug = () => {
    const [data] = useAtom(slugQueryAtom)
    if (!data?.response?.slug) return <div>not enabled</div>
    return <div>slug: {data?.response?.slug}</div>
  }

  const Parent = () => {
    const [, setSlug] = useAtom(slugAtom)
    return (
      <div>
        <button
          onClick={() => {
            setSlug('world')
          }}>
          set slug
        </button>
        <Slug />
      </div>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('not enabled')
  expect(mockFetch).toHaveBeenCalledTimes(0)

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('set slug'))
  await findByText('loading')
  await findByText('slug: hello-world')
  expect(mockFetch).toHaveBeenCalledTimes(1)
})

it('query with enabled 2', async () => {
  const mockFetch = jest.fn(fakeFetch)
  const enabledAtom = atom<boolean>(true)
  const slugAtom = atom<string | null>('first')

  const slugQueryAtom = atomWithQuery((get) => {
    const slug = get(slugAtom)
    const isEnabled = get(enabledAtom)
    return {
      enabled: isEnabled,
      queryKey: ['enabled_toggle'],
      queryFn: async () => {
        return await mockFetch({ slug: `hello-${slug}` }, false, 100)
      },
    }
  })

  const Slug = () => {
    const [data] = useAtom(slugQueryAtom)
    if (!data?.response?.slug) return <div>not enabled</div>
    return <div>slug: {data?.response?.slug}</div>
  }

  const Parent = () => {
    const [, setSlug] = useAtom(slugAtom)
    const [, setEnabled] = useAtom(enabledAtom)
    return (
      <div>
        <button
          onClick={() => {
            setSlug('world')
          }}>
          set slug
        </button>
        <button
          onClick={() => {
            setEnabled(true)
          }}>
          set enabled
        </button>
        <button
          onClick={() => {
            setEnabled(false)
          }}>
          set disabled
        </button>
        <Slug />
      </div>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </Provider>
    </StrictMode>
  )
  await findByText('loading')
  expect(mockFetch).toHaveBeenCalledTimes(1)
  await findByText('slug: hello-first')

  fireEvent.click(getByText('set disabled'))
  fireEvent.click(getByText('set slug'))

  await new Promise((r) => setTimeout(r, 100))
  await findByText('slug: hello-first')
  expect(mockFetch).toHaveBeenCalledTimes(1)

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('set enabled'))
  await findByText('slug: hello-world')
  expect(mockFetch).toHaveBeenCalledTimes(2)
})

it('query with enabled (#500)', async () => {
  const enabledAtom = atom(true)
  const countAtom = atomWithQuery((get) => {
    const enabled = get(enabledAtom)
    return {
      enabled,
      queryKey: ['count_500_issue'],
      queryFn: async () => {
        return await fakeFetch({ count: 1 }, false, 100)
      },
    }
  })

  const Counter = () => {
    const [value] = useAtom(countAtom)
    if (!value) return null
    const {
      response: { count },
    } = value
    return <div>count: {count}</div>
  }

  const Parent = () => {
    const [showChildren, setShowChildren] = useState(true)
    const [, setEnabled] = useAtom(enabledAtom)
    return (
      <div>
        <button
          onClick={() => {
            setShowChildren((x) => !x)
            setEnabled((x) => !x)
          }}>
          toggle
        </button>
        {showChildren ? <Counter /> : <div>hidden</div>}
      </div>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await findByText('count: 1')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('toggle'))
  await findByText('hidden')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('toggle'))
  await findByText('count: 1')
})

it('query with initialData test', async () => {
  const mockFetch = jest.fn(fakeFetch)

  const countAtom = atomWithQuery(() => ({
    queryKey: ['initialData_count1'],
    queryFn: async () => {
      return await mockFetch({ count: 10 })
    },
    initialData: { response: { count: 0 } },
    refetchInterval: 100,
  }))
  const Counter = () => {
    const [
      {
        response: { count },
      },
    ] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <Counter />
      </Provider>
    </StrictMode>
  )

  // NOTE: the atom never suspends
  await findByText('count: 0')
  await findByText('count: 10')
  expect(mockFetch).toHaveBeenCalledTimes(1)
})

it('query dependency test', async () => {
  const baseCountAtom = atom(0)
  const incrementAtom = atom(null, (_get, set) =>
    set(baseCountAtom, (c) => c + 1)
  )
  const countAtom = atomWithQuery((get) => ({
    queryKey: ['count_with_dependency', get(baseCountAtom)],
    queryFn: async () => {
      return await fakeFetch({ count: get(baseCountAtom) }, false, 100)
    },
  }))

  const Counter = () => {
    const [
      {
        response: { count },
      },
    ] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Controls = () => {
    const [, increment] = useAtom(incrementAtom)
    return <button onClick={increment}>increment</button>
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

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('increment'))
  await findByText('loading')
  await findByText('count: 1')
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
    const countAtom = atomWithQuery(() => ({
      queryKey: ['error test', 'count1'],
      retry: false,
      queryFn: async () => {
        return await fakeFetch({ count: 0 }, true, 100)
      },
    }))
    const Counter = () => {
      const [
        {
          response: { count },
        },
      ] = useAtom(countAtom)
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
    await findByText('errored')
  })

  it('can recover from error', async () => {
    let count = 0
    let willThrowError = true
    const countAtom = atomWithQuery(() => ({
      queryKey: ['error test', 'count2'],
      retry: false,
      queryFn: () => {
        const promise = fakeFetch({ count }, willThrowError, 200)
        willThrowError = !willThrowError
        ++count
        return promise
      },
    }))
    const Counter = () => {
      const [
        {
          response: { count },
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
    fireEvent.click(getByText('refetch'))
    await findByText('loading')
    await findByText('errored')

    await new Promise((r) => setTimeout(r, 100))
    fireEvent.click(getByText('retry'))
    await findByText('loading')
    await findByText('count: 3')
  })
})

it('query expected QueryCache test', async () => {
  const queryClient = new QueryClient()
  const countAtom = atomWithQuery(
    () => ({
      queryKey: ['count6'],
      queryFn: async () => {
        return await fakeFetch({ count: 0 }, false, 100)
      },
    }),
    () => queryClient
  )
  const Counter = () => {
    const [
      {
        response: { count },
      },
    ] = useAtom(countAtom)

    return (
      <>
        <div>count: {count}</div>
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
  expect(queryClient.getQueryCache().getAll().length).toBe(1)
})
