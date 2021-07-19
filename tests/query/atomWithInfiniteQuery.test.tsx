import { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { useAtom } from '../../src/'
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
