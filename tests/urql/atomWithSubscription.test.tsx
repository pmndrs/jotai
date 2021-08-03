import { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import type { Client, TypedDocumentNode } from '@urql/core'
import { interval, map, pipe, take, toPromise } from 'wonka'
import { atom, useAtom } from '../../src/'
import { atomWithSubscription } from '../../src/urql'
import { getTestProvider } from '../testUtils'

const generateClient = (id = 'default') =>
  ({
    subscription: () =>
      pipe(
        interval(10),
        map((i: number) => ({ data: { id, count: i } }))
      ),
  } as unknown as Client)

const clientMock = generateClient()

const Provider = getTestProvider()

it('subscription basic test', async () => {
  const countAtom = atomWithSubscription(
    () => ({
      query: 'subscription Test { count }' as unknown as TypedDocumentNode<{
        count: number
      }>,
    }),
    () => clientMock
  )

  const Counter = () => {
    const [{ data }] = useAtom(countAtom)
    return (
      <>
        <div>count: {data?.count}</div>
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
  await findByText('count: 1')
  await findByText('count: 2')
})

it('subscription change client at runtime', async () => {
  const clientAtom = atom(generateClient('first'))
  const countAtom = atomWithSubscription(
    () => ({
      query: 'subscription Test { id, count }' as unknown as TypedDocumentNode<{
        id: string
        count: number
      }>,
    }),
    (get) => get(clientAtom)
  )

  const Counter = () => {
    const [{ data }] = useAtom(countAtom)
    return (
      <>
        <div>
          {data?.id} count: {data?.count}
        </div>
      </>
    )
  }

  const Controls = () => {
    const [, setClient] = useAtom(clientAtom)
    return (
      <>
        <button onClick={() => setClient(generateClient('first'))}>
          first
        </button>
        <button onClick={() => setClient(generateClient('second'))}>
          second
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
      <Controls />
    </Provider>
  )

  await findByText('loading')
  await findByText('first count: 0')
  await findByText('first count: 1')
  await findByText('first count: 2')
  fireEvent.click(getByText('second'))
  await findByText('loading')
  await findByText('second count: 0')
  await findByText('second count: 1')
  await findByText('second count: 2')
  fireEvent.click(getByText('first'))
  await findByText('loading')
  await findByText('first count: 0')
  await findByText('first count: 1')
  await findByText('first count: 2')
})

it('null client suspense', async () => {
  const clientAtom = atom<Client | null>(null)
  const countAtom = atomWithSubscription(
    () => ({
      query: 'subscription Test { id, count }' as unknown as TypedDocumentNode<{
        id: string
        count: number
      }>,
    }),
    (get) => get(clientAtom)
  )
  // Derived Atom to safe guard when client is null
  const guardedIdAtom = atom(
    (get): { data?: { id: string; count: number } } => {
      const client = get(clientAtom)
      if (client === null) return {}
      return get(countAtom)
    }
  )

  const Counter = () => {
    const [{ data }] = useAtom(guardedIdAtom)
    return (
      <>
        <div>
          {data ? (
            <>
              {data?.id} count: {data?.count}
            </>
          ) : (
            'no data'
          )}
        </div>
      </>
    )
  }

  const Controls = () => {
    const [, setClient] = useAtom(clientAtom)
    return (
      <>
        <button onClick={() => setClient(generateClient())}>set</button>
        <button onClick={() => setClient(null)}>unset</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
      <Controls />
    </Provider>
  )

  await findByText('no data')
  fireEvent.click(getByText('set'))
  await findByText('loading')
  await findByText('default count: 0')
  await findByText('default count: 1')
  await findByText('default count: 2')
  fireEvent.click(getByText('unset'))
  await findByText('no data')
  fireEvent.click(getByText('set'))
  await findByText('default count: 0')
  await findByText('default count: 1')
  await findByText('default count: 2')
})
