import React, { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { TypedDocumentNode } from '@urql/core'
import { atom, useAtom } from '../../src/'
import { atomWithMutation } from '../../src/urql'
import { getTestProvider } from '../testUtils'

jest.mock('../../src/urql/clientAtom', () => {
  const { delay, fromValue, pipe, take, toPromise } = require('wonka')
  const { atom } = require('../../src/')
  const withPromise = (source$: any) => {
    source$.toPromise = () => pipe(source$, take(1), toPromise)
    return source$
  }
  const mock = {
    mutation: () =>
      withPromise(pipe(fromValue({ data: { count: 1 } }), delay(10))),
  }
  return {
    clientAtom: atom(() => mock),
  }
})

const Provider = getTestProvider()

it('mutation basic test', async () => {
  const countAtom = atomWithMutation(
    () =>
      'mutation Test { count }' as unknown as TypedDocumentNode<{
        count: number
      }>
  )
  const mutateAtom = atom(null, (_get, set) => {
    set(countAtom, {})
  })

  const Counter: React.FC = () => {
    const [{ data }] = useAtom(countAtom)
    return (
      <>
        <div>count: {data?.count}</div>
      </>
    )
  }

  const Controls: React.FC = () => {
    const [, mutate] = useAtom(mutateAtom)
    return <button onClick={() => mutate()}>mutate</button>
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

  fireEvent.click(getByText('mutate'))
  await findByText('count: 1')
})
