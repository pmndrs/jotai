import { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import type { Client } from '@urql/core'
import { delay, fromValue, pipe, take, toPromise } from 'wonka'
import { atom, useAtom } from 'jotai'
import { atomWithMutation } from 'jotai/urql'
import { getTestProvider } from '../testUtils'

const withPromise = (source$: any) => {
  source$.toPromise = () => pipe(source$, take(1), toPromise)
  return source$
}
const clientMock = {
  mutation: () =>
    withPromise(pipe(fromValue({ data: { count: 1 } }), delay(100))),
} as unknown as Client

const Provider = getTestProvider()

it('mutation basic test', async () => {
  const countAtom = atomWithMutation<{ count: number }, Record<string, never>>(
    () => 'mutation Test { count }',
    () => clientMock
  )
  const mutateAtom = atom(null, (_get, set) => {
    set(countAtom, {})
  })

  const Counter = () => {
    const [{ data }] = useAtom(countAtom)
    return (
      <>
        <div>count: {data?.count}</div>
      </>
    )
  }

  const Controls = () => {
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
