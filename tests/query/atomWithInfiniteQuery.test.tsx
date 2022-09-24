import { Component, StrictMode, Suspense, useCallback, useContext } from 'react'
import type { ReactNode } from 'react'
import { fireEvent, render } from '@testing-library/react'
import {
  atom,
  SECRET_INTERNAL_getScopeContext as getScopeContext,
  useAtom,
  useSetAtom,
} from 'jotai'
import { atomWithInfiniteQuery } from 'jotai/query'
import { getTestProvider } from '../testUtils'
import fakeFetch from './fakeFetch'

const Provider = getTestProvider()

// This is only used to pass tests with unstable_enableVersionedWrite
const useRetryFromError = (scope?: symbol | string | number) => {
  const ScopeContext = getScopeContext(scope)
  const { r: retryFromError } = useContext(ScopeContext)
  return retryFromError || ((fn) => fn())
}

it('infinite query basic test', async () => {
  const countAtom = atomWithInfiniteQuery<
    { response: { count: number } },
    void
  >(() => ({
    queryKey: ['count1Infinite'],
    queryFn: async (context) => {
      const count = context.pageParam ? parseInt(context.pageParam) : 0
      return fakeFetch({ count }, false, 100)
    },
  }))

  const Counter = () => {
    const [data] = useAtom(countAtom)
    return (
      <>
        <div>page count: {data.pages.length}</div>
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
  await findByText('page count: 1')
})

it('infinite query next page test', async () => {
  const mockFetch = jest.fn(fakeFetch)
  const countAtom = atomWithInfiniteQuery<
    { response: { count: number } },
    void
  >(() => ({
    queryKey: ['nextPageAtom'],
    queryFn: (context) => {
      const count = context.pageParam ? parseInt(context.pageParam) : 0
      return mockFetch({ count }, false, 100)
    },
    getNextPageParam: (lastPage) => {
      const {
        response: { count },
      } = lastPage
      return (count + 1).toString()
    },
    getPreviousPageParam: (lastPage) => {
      const {
        response: { count },
      } = lastPage
      return (count - 1).toString()
    },
  }))
  const Counter = () => {
    const [data, dispatch] = useAtom(countAtom)

    return (
      <>
        <div>page count: {data.pages.length}</div>
        <button onClick={() => dispatch({ type: 'fetchNextPage' })}>
          next
        </button>
        <button onClick={() => dispatch({ type: 'fetchPreviousPage' })}>
          prev
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
      </Provider>
    </>
  )

  await findByText('loading')
  await findByText('page count: 1')
  expect(mockFetch).toBeCalledTimes(1)

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('next'))
  await findByText('page count: 2')
  expect(mockFetch).toBeCalledTimes(2)

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('prev'))
  await findByText('page count: 3')
  expect(mockFetch).toBeCalledTimes(3)
})

it('infinite query with enabled', async () => {
  const slugAtom = atom<string | null>(null)

  const slugQueryAtom = atomWithInfiniteQuery((get) => {
    const slug = get(slugAtom)
    return {
      enabled: !!slug,
      queryKey: ['disabled_until_value', slug],
      queryFn: async () => {
        return await fakeFetch({ slug: `hello-${slug}` }, false, 100)
      },
    }
  })

  const Slug = () => {
    const [data] = useAtom(slugQueryAtom)
    if (!data?.pages?.[0]?.response.slug) return <div>not enabled</div>
    return <div>slug: {data?.pages?.[0]?.response?.slug}</div>
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

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('set slug'))
  await findByText('loading')
  await findByText('slug: hello-world')
})

it('infinite query with enabled 2', async () => {
  const enabledAtom = atom<boolean>(true)
  const slugAtom = atom<string | null>('first')

  const slugQueryAtom = atomWithInfiniteQuery((get) => {
    const slug = get(slugAtom)
    const isEnabled = get(enabledAtom)
    return {
      enabled: isEnabled,
      queryKey: ['enabled_toggle'],
      queryFn: async () => {
        return await fakeFetch({ slug: `hello-${slug}` }, false, 100)
      },
    }
  })

  const Slug = () => {
    const [data] = useAtom(slugQueryAtom)
    if (!data?.pages?.[0]?.response?.slug) return <div>not enabled</div>
    return <div>slug: {data?.pages?.[0]?.response?.slug}</div>
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
  await findByText('slug: hello-first')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('set disabled'))
  fireEvent.click(getByText('set slug'))
  await findByText('slug: hello-first')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('set enabled'))
  await findByText('slug: hello-world')
})

// adapted from https://github.com/tannerlinsley/react-query/commit/f9b23fcae9c5d45e3985df4519dd8f78a9fa364e#diff-121ad879f17e2b996ac2c01b4250996c79ffdb6b7efcb5f1ddf719ac00546d14R597
it('should be able to refetch only specific pages when refetchPages is provided', async () => {
  const key = ['refetch_given_page']
  const states: any[] = []

  let multiplier = 1
  const anAtom = atomWithInfiniteQuery<number, void>(() => {
    return {
      queryKey: key,
      queryFn: ({ pageParam = 10 }) => Number(pageParam) * multiplier,
      getNextPageParam: (lastPage) => lastPage + 1,
      onSuccess: (data) => states.push(data),
    }
  })

  function Page() {
    const [state, setState] = useAtom(anAtom)

    const fetchNextPage = useCallback(
      () => setState({ type: 'fetchNextPage' }),
      [setState]
    )

    const refetchPage = useCallback(
      (value: number) => {
        multiplier = 2
        setState({
          type: 'refetch',
          payload: {
            refetchPage: (_, index) => index === value,
          },
        })
      },
      [setState]
    )

    return (
      <>
        <div>length: {state.pages.length}</div>
        <div>page 1: {state.pages[0] || null}</div>
        <div>page 2: {state.pages[1] || null}</div>
        <div>page 3: {state.pages[2] || null}</div>
        <button onClick={fetchNextPage}>fetch next page</button>
        <button onClick={() => refetchPage(0)}>refetch page 1</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <>
      <Provider>
        <Suspense fallback="loading">
          <Page />
        </Suspense>
      </Provider>
    </>
  )

  await findByText('loading')

  await findByText('length: 1')
  await findByText('page 1: 10')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('fetch next page'))
  await findByText('length: 2')
  await findByText('page 2: 11')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('fetch next page'))
  await findByText('length: 3')
  await findByText('page 3: 12')

  await new Promise((r) => setTimeout(r, 100))
  fireEvent.click(getByText('refetch page 1'))
  await findByText('length: 3')
  await findByText('page 1: 20')
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
    const countAtom = atomWithInfiniteQuery(() => ({
      queryKey: ['error test', 'count1Infinite'],
      retry: false,
      queryFn: async () => {
        return await fakeFetch({ count: 0 }, true, 100)
      },
    }))
    const Counter = () => {
      const [{ pages }] = useAtom(countAtom)
      return (
        <>
          <div>count: {pages[0]?.response.count}</div>
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
    const countAtom = atomWithInfiniteQuery<
      { response: { count: number } },
      void
    >(() => ({
      queryKey: ['error test', 'count2Infinite'],
      retry: false,
      staleTime: 200,
      queryFn: () => {
        const promise = fakeFetch({ count }, willThrowError, 100)
        willThrowError = !willThrowError
        ++count
        return promise
      },
    }))
    const Counter = () => {
      const [{ pages }, dispatch] = useAtom(countAtom)
      const refetch = () => dispatch({ type: 'refetch', payload: {} })
      return (
        <>
          <div>count: {pages[0]?.response.count}</div>
          <button onClick={refetch}>refetch</button>
        </>
      )
    }

    const App = () => {
      const dispatch = useSetAtom(countAtom)
      const retryFromError = useRetryFromError()
      const retry = () => {
        retryFromError(() => {
          dispatch({ type: 'refetch', payload: {} })
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
