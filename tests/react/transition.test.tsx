/// <reference types="react/experimental" />

import ReactExports, { StrictMode, Suspense, useEffect } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

const { use, useTransition } = ReactExports

describe.skipIf(typeof useTransition !== 'function')('useTransition', () => {
  // FIXME some tests are failing with react@experimental
  it.skipIf(typeof use === 'function')(
    'no extra commit with useTransition (#1125)',
    async () => {
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
            <button
              onClick={() => startTransition(() => setCount((c) => c + 1))}>
              button
            </button>
          </>
        )
      }

      const { getByText } = render(
        <>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </>
      )

      resolve()
      await waitFor(() => expect(getByText('delayed: 0')).toBeTruthy())

      await userEvent.click(getByText('button'))

      act(() => {
        resolve()
      })

      await waitFor(() => expect(getByText('delayed: 1')).toBeTruthy())

      expect(commited).toEqual([
        { pending: false, delayed: 0 },
        { pending: true, delayed: 0 },
        { pending: false, delayed: 1 },
      ])
    }
  )

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
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>
    )

    await findByText('count: 0')

    await userEvent.click(getByText('toggle'))
    await waitFor(() => expect(findByText('pending')).toBeTruthy())

    await userEvent.click(getByText('increment'))
    await waitFor(() => expect(findByText('count: 1')).toBeTruthy())

    await userEvent.click(getByText('increment'))
    await waitFor(() => expect(findByText('count: 2')).toBeTruthy())
  })
})
