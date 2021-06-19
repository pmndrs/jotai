import React, { Suspense } from 'react'
import { render } from '@testing-library/react'
import { TypedDocumentNode } from '@urql/core'
import { useAtom } from '../../src/'
import { atomWithSubscription } from '../../src/urql'
import { getTestProvider } from '../testUtils'

jest.mock('../../src/urql/clientAtom', () => {
  const { map, interval, pipe, take, toPromise } = require('wonka')
  const { atom } = require('../../src/')
  const withPromise = (source$: any) => {
    source$.toPromise = () => pipe(source$, take(1), toPromise)
    return source$
  }
  const mock = {
    subscription: () =>
      withPromise(
        pipe(
          interval(10),
          map((i: number) => ({ data: { count: i } }))
        )
      ),
  }
  return {
    clientAtom: atom(() => mock),
  }
})

const Provider = getTestProvider()

it('subscription basic test', async () => {
  const countAtom = atomWithSubscription(() => ({
    query: '{ count }' as unknown as TypedDocumentNode<{ count: number }>,
  }))

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
  await findByText('count: 1')
  await findByText('count: 2')
})
