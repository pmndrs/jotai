import React, { Suspense, useState } from 'react'
import { fireEvent, render } from '@testing-library/react'

import { atom, useAtom } from '../../src/'
import fakeFetch from './fakeFetch'
import { atomWithQuery } from '../../src/query'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

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
    queryKey: 'count5',
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

it('query with enabled (#500)', async () => {
  type Update = (prev: boolean) => boolean
  const enabledAtom = atom(true)
  const setEnabledAtom = atom<null, Update>(null, (_get, set, update) =>
    set(enabledAtom, update)
  )
  const countAtom = atomWithQuery((get) => {
    const enabled = get(enabledAtom)
    return {
      enabled,
      queryKey: 'count6',
      queryFn: async () => {
        return await fakeFetch({ count: 1 })
      },
    }
  })

  const Counter: React.FC = () => {
    const [
      {
        response: { count },
      },
    ] = useAtom(countAtom)
    return <div>count: {count}</div>
  }

  const Parent: React.FC = () => {
    const [showChildren, setShowChildren] = useState(true)
    const [, setEnabled] = useAtom(setEnabledAtom)
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
    <Provider>
      <Suspense fallback="loading">
        <Parent />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 1')

  fireEvent.click(getByText('toggle'))
  await findByText('hidden')

  fireEvent.click(getByText('toggle'))
  await findByText('loading')
  await findByText('count: 1')
})

it('query with initialData test', async () => {
  const mockFetch = jest.fn(fakeFetch)

  const countAtom = atomWithQuery(() => ({
    queryKey: 'count1',
    queryFn: async () => {
      return await mockFetch({ count: 10 })
    },
    initialData: { response: { count: 0 } },
    refetchInterval: 100,
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
      <Counter />
    </Provider>
  )

  // NOTE: the atom never suspends
  await findByText('count: 0')
  expect(mockFetch).toHaveBeenCalledTimes(0)
  await findByText('count: 10')
  expect(mockFetch).toHaveBeenCalledTimes(1)
})
