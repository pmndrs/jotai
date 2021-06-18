import React, { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { TypedDocumentNode } from '@urql/core'
import { atom, useAtom } from '../../src/'
import { atomWithQuery } from '../../src/urql'
import { getTestProvider } from '../testUtils'

jest.mock('../../src/urql/clientAtom', () => {
  const { map, interval, pipe } = require('wonka')
  const { atom } = require('../../src/')
  const mock = {
    query: () =>
      pipe(
        interval(10),
        map((i: number) => ({ data: { count: i } }))
      ),
  }
  return {
    clientAtom: atom(() => mock),
  }
})

const Provider = getTestProvider()

it('query basic test', async () => {
  const countAtom = atomWithQuery(() => ({
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
})

it('query dependency test', async () => {
  const dummyAtom = atom(10)
  const countAtom = atomWithQuery((get) => ({
    query: '{ count }' as unknown as TypedDocumentNode<{ count: number }>,
    variables: {
      dummy: get(dummyAtom),
    },
  }))

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
