import React, { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, useAtom } from '../../src/'
import fakeFetch from './fakeFetch'
import { atomWithQuery } from '../../src/query'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

// FIXME the tests should also work on DEV
let savedNodeEnv: string | undefined
beforeEach(() => {
  savedNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
})
afterEach(() => {
  process.env.NODE_ENV = savedNodeEnv
})

it('query basic test', async () => {
  const countAtom = atomWithQuery(() => ({
    queryKey: 'count1',
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
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 0')
})

it('query basic test with object instead of function', async () => {
  const countAtom = atomWithQuery({
    queryKey: 'count2',
    queryFn: async () => {
      return await fakeFetch({ count: 0 })
    },
  })
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
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 0')
})

it('query refetch', async () => {
  let count = 0
  const mockFetch = jest.fn(fakeFetch)
  const countAtom = atomWithQuery(() => ({
    queryKey: 'count3',
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
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
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

it('query loading', async () => {
  let count = 0
  const mockFetch = jest.fn(fakeFetch)
  const countAtom = atomWithQuery(() => ({
    queryKey: 'count4',
    queryFn: async () => {
      const response = await mockFetch({ count }, false, 100)
      count++
      return response
    },
  }))
  const derivedAtom = atom((get) => get(countAtom))
  const dispatchAtom = atom(null, (_get, set, action: any) =>
    set(countAtom, action)
  )
  const Counter: React.FC = () => {
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
  const RefreshButton: React.FC = () => {
    const [, dispatch] = useAtom(dispatchAtom)
    return (
      <button onClick={() => dispatch({ type: 'refetch' })}>refetch</button>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
      <RefreshButton />
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 0')
  fireEvent.click(getByText('refetch'))
  await findByText('loading')
  await findByText('count: 1')
  fireEvent.click(getByText('refetch'))
  await findByText('loading')
  await findByText('count: 2')
})

it('query loading 2', async () => {
  let count = 0
  const mockFetch = jest.fn(fakeFetch)
  const countAtom = atomWithQuery(() => ({
    queryKey: 'count',
    queryFn: async () => {
      const response = await mockFetch({ count }, false, 100)
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
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 0')
  fireEvent.click(getByText('refetch'))
  await findByText('loading')
  await findByText('count: 1')
  fireEvent.click(getByText('refetch'))
  await findByText('loading')
  await findByText('count: 2')
})
