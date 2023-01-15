/// <reference types="react/experimental" />

import { StrictMode, Suspense, use, useEffect, useTransition } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

const describeWithUseTransition =
  typeof useTransition === 'function' ? describe : describe.skip

// FIXME some tests are failing with react@experimental
const itWithoutUse = typeof use === 'function' ? it.skip : it

describeWithUseTransition('useTransition', () => {
  itWithoutUse('no extra commit with useTransition (#1125)', async () => {
    const countAtom = atom(0)
    let resolve = () => {}
    const delayedAtom = atom(async (get) => {
      await new Promise<void>((r) => (resolve = r))
      return get(countAtom)
    })

    const commited: { pending: boolean; delayed: number }[] = []

    const Counter = () => {
      const setCount = useSetAtom(countAtom)
      const delayed = useAtomValue(delayedAtom)
      const [pending, startTransition] = useTransition()
      useEffect(() => {
        commited.push({ pending, delayed })
      })
      return (
        <>
          <div>delayed: {delayed}</div>
          <button onClick={() => startTransition(() => setCount((c) => c + 1))}>
            button
          </button>
        </>
      )
    }

    const { getByText, findByText } = render(
      <>
        <Provider>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </Provider>
      </>
    )

    resolve()
    await findByText('delayed: 0')

    fireEvent.click(getByText('button'))
    await waitFor(() => {
      resolve()
      getByText('delayed: 1')
    })

    expect(commited).toEqual([
      { pending: false, delayed: 0 },
      { pending: true, delayed: 0 },
      { pending: false, delayed: 1 },
    ])
  })

  it('can update normal atom with useTransition (#1151)', async () => {
    const countAtom = atom(0)
    const toggleAtom = atom(false)
    const pendingAtom = atom((get) => {
      if (get(toggleAtom)) {
        return new Promise(() => {})
      }
      return false
    })

    const Counter = () => {
      const [count, setCount] = useAtom(countAtom)
      const toggle = useSetAtom(toggleAtom)
      useAtomValue(pendingAtom)
      const [pending, startTransition] = useTransition()
      return (
        <>
          <div>count: {count}</div>
          <button onClick={() => setCount((c) => c + 1)}>increment</button>
          {pending && 'pending'}
          <button onClick={() => startTransition(() => toggle((x) => !x))}>
            toggle
          </button>
        </>
      )
    }

    const { getByText, findByText } = render(
      <StrictMode>
        <Provider>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </Provider>
      </StrictMode>
    )

    await findByText('count: 0')

    fireEvent.click(getByText('toggle'))
    await findByText('pending')

    fireEvent.click(getByText('increment'))
    await findByText('count: 1')

    fireEvent.click(getByText('increment'))
    await findByText('count: 2')
  })
})
