import { StrictMode, Suspense } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import type { Client } from '@urql/core'
import { delay, fromValue, pipe, take, toPromise } from 'wonka'
import { atom, useAtom } from 'jotai'
import { atomWithMutation } from 'jotai/urql'
import { getTestProvider, itSkipIfVersionedWrite } from '../testUtils'

const withPromise = (source$: any) => {
  source$.toPromise = () => pipe(source$, take(1), toPromise)
  return source$
}

const generateClient = (error?: () => boolean) =>
  ({
    mutation: () => {
      const source$ = withPromise(
        pipe(
          fromValue(
            error?.()
              ? { error: new Error('fetch error') }
              : { data: { count: 1 } }
          ),
          delay(100)
        )
      )
      return source$
    },
  } as unknown as Client)

const Provider = getTestProvider()

it('mutation basic test', async () => {
  const client = generateClient()
  const countAtom = atomWithMutation<{ count: number }, Record<string, never>>(
    () => 'mutation Test { count }',
    () => client
  )
  const mutateAtom = atom(null, (_get, set) =>
    set(countAtom, { variables: {} })
  )

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
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Controls />
      </Provider>
    </StrictMode>
  )

  await findByText('loading')

  fireEvent.click(getByText('mutate'))
  await findByText('count: 1')
})

describe('error handling', () => {
  itSkipIfVersionedWrite('mutation error test', async () => {
    const client = generateClient(() => true)
    const countAtom = atomWithMutation<
      { count: number },
      Record<string, never>
    >(
      () => 'mutation Test { count }',
      () => client
    )
    const mutateAtom = atom(null, (_get, set) =>
      set(countAtom, { variables: {} })
    )

    const Counter = () => {
      const [{ data }] = useAtom(countAtom)
      return (
        <>
          <div>count: {data?.count}</div>
        </>
      )
    }

    let errored = false
    const Controls = () => {
      const [, mutate] = useAtom(mutateAtom)
      const handleClick = async () => {
        try {
          await mutate()
        } catch {
          errored = true
        }
      }
      return <button onClick={handleClick}>mutate</button>
    }

    const { getByText, findByText } = render(
      <StrictMode>
        <Provider>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
          <Controls />
        </Provider>
      </StrictMode>
    )

    await findByText('loading')

    fireEvent.click(getByText('mutate'))
    await waitFor(() => {
      expect(errored).toBe(true)
    })
  })
})
