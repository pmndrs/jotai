import React, { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { map, interval, pipe, take, toPromise } from 'wonka'
import { Client } from '@urql/core'
import { atom, useAtom } from '../../src/'
import { atomWithQuery } from '../../src/urql'
import { getTestProvider } from '../testUtils'

const withPromise = (source$: any) => {
  source$.toPromise = () => pipe(source$, take(1), toPromise)
  return source$
}
const clientMock = {
  query: () =>
    withPromise(
      pipe(
        interval(10),
        map((i: number) => ({ data: { count: i } }))
      )
    ),
} as unknown as Client

const Provider = getTestProvider()

it('query basic test', async () => {
  const countAtom = atomWithQuery<{ count: number }, {}>(
    () => ({
      query: '{ count }',
    }),
    () => clientMock
  )

  const Counter: React.FC = () => {
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
})

it('query dependency test', async () => {
  const dummyAtom = atom(10)
  const countAtom = atomWithQuery<{ count: number }, { dummy: number }>(
    (get) => ({
      query: '{ count }',
      variables: {
        dummy: get(dummyAtom),
      },
    }),
    () => clientMock
  )

  const Counter: React.FC = () => {
    const [{ data }] = useAtom(countAtom)
    return (
      <>
        <div>count: {data?.count}</div>
      </>
    )
  }

  const Controls: React.FC = () => {
    const [, setDummy] = useAtom(dummyAtom)
    return <button onClick={() => setDummy((c) => c + 1)}>dummy</button>
  }

  const { getByText, findByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
      <Controls />
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 0')

  fireEvent.click(getByText('dummy'))
  await findByText('loading')
  await findByText('count: 1')
})
