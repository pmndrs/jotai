import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, useAtom } from '../../src/'
import fakeFetch from './fakeFetch'
import { atomWithQuery } from '../../src/query'

it('query basic test', async () => {
  const countAtom = atomWithQuery(() => ({
    queryKey: 'count',
    queryFn: async () => {
      return await fakeFetch({ count: 0 })
    },
  }))
  const Counter: React.FC = () => {
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
    <Provider>
      <React.Suspense fallback="loading">
        <Counter />
      </React.Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 0')
})

it('query refetch', async () => {
  let count = 0
  const mockFetch = jest.fn(fakeFetch)
  const countAtom = atomWithQuery(() => ({
    queryKey: 'count',
    queryFn: async () => {
      const response = await mockFetch({ count })
      count++
      return response
    },
  }))
  const Counter: React.FC = () => {
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
    <Provider>
      <React.Suspense fallback="loading">
        <Counter />
      </React.Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 0')
  expect(mockFetch).toBeCalledTimes(1)
  fireEvent.click(getByText('refetch'))
  expect(mockFetch).toBeCalledTimes(2)
  await findByText('loading')
  await findByText('count: 1')
})
