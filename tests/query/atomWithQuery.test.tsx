import { Suspense, useState } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, useAtom } from 'jotai'
import { atomWithQuery } from 'jotai/query'
import { getTestProvider } from '../testUtils'
import fakeFetch from './fakeFetch'

const Provider = getTestProvider()

it('query basic test', async () => {
  const countAtom = atomWithQuery(() => ({
    queryKey: 'count1',
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
      const response = await mockFetch({ count }, false, 100)
      count++
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
  await findByText('loading')
  await findByText('count: 1')
  expect(mockFetch).toBeCalledTimes(2)
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
    <Provider>
      <Suspense fallback="loading">
        <Parent />
      </Suspense>
    </Provider>
  )

  await findByText('not enabled')
  expect(mockFetch).toHaveBeenCalledTimes(0)
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
    <Provider>
      <Suspense fallback="loading">
        <Parent />
      </Suspense>
    </Provider>
  )
  await findByText('loading')
  expect(mockFetch).toHaveBeenCalledTimes(1)
  await findByText('slug: hello-first')
  fireEvent.click(getByText('set disabled'))
  fireEvent.click(getByText('set slug'))
  await findByText('slug: hello-first')
  expect(mockFetch).toHaveBeenCalledTimes(1)
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
      queryKey: 'count_500_issue',
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
  await findByText('count: 1')
})

it('query with initialData test', async () => {
  const mockFetch = jest.fn(fakeFetch)

  const countAtom = atomWithQuery(() => ({
    queryKey: 'initialData_count1',
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
    <Provider>
      <Counter />
    </Provider>
  )

  // NOTE: the atom never suspends
  await findByText('count: 0')
  await findByText('count: 10')
  expect(mockFetch).toHaveBeenCalledTimes(1)
})
