import { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, useAtom } from '../../src/'
import { atomWithInfiniteQuery } from '../../src/query/atomWithInfiniteQuery'
import { getTestProvider } from '../testUtils'
import fakeFetch from './fakeFetch'

const Provider = getTestProvider()

it('infinite query basic test', async () => {
  const countAtom = atomWithInfiniteQuery<
    { response: { count: number } },
    void
  >(() => ({
    queryKey: 'count1Infinite',
    queryFn: async (context) => {
      const count = context.pageParam ? parseInt(context.pageParam) : 0
      return fakeFetch({ count })
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
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
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
    queryKey: 'nextPageAtom',
    queryFn: (context) => {
      const count = context.pageParam ? parseInt(context.pageParam) : 0
      return mockFetch({ count })
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
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('page count: 1')
  expect(mockFetch).toBeCalledTimes(1)
  fireEvent.click(getByText('next'))
  expect(mockFetch).toBeCalledTimes(2)
  await findByText('page count: 2')
  fireEvent.click(getByText('prev'))
  expect(mockFetch).toBeCalledTimes(3)
  await findByText('page count: 3')
})

it('infinite query with enabled', async () => {
  const slugAtom = atom<string | null>(null)

  const slugQueryAtom = atomWithInfiniteQuery((get) => {
    const slug = get(slugAtom)
    return {
      enabled: !!slug,
      queryKey: ['disabled_until_value', slug],
      queryFn: async () => {
        return await fakeFetch({ slug: `hello-${slug}` })
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
    <Provider>
      <Suspense fallback="loading">
        <Parent />
      </Suspense>
    </Provider>
  )

  await findByText('not enabled')
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
        return await fakeFetch({ slug: `hello-${slug}` })
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
    <Provider>
      <Suspense fallback="loading">
        <Parent />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('slug: hello-first')
  fireEvent.click(getByText('set disabled'))
  fireEvent.click(getByText('set slug'))
  await findByText('slug: hello-first')
  fireEvent.click(getByText('set enabled'))
  await findByText('slug: hello-world')
})
