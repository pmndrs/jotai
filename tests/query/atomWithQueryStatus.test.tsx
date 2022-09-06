import { Component, StrictMode, Suspense, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { fireEvent, render } from '@testing-library/react'
import {
  atom,
  SECRET_INTERNAL_getScopeContext as getScopeContext,
  useAtom,
  useAtomValue,
  useSetAtom,
} from 'jotai'
import { atomWithQuery, atomWithQueryStatus } from 'jotai/query'
import { getTestProvider } from '../testUtils'
import fakeFetch from './fakeFetch'

const Provider = getTestProvider()

it('query basic test', async () => {
  const countAtom = atomWithQuery(() => ({
    queryKey: ['count1'],
    queryFn: async () => {
      return await fakeFetch({ count: 0 }, false, 100)
    },
  }))

  const countStatusAtom = atomWithQueryStatus(['count1'])

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

  const CounterStatus = () => {
    const { status } = useAtomValue(countStatusAtom)
    return (
      <>
        <div>status: {status}</div>
      </>
    )
  }

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <CounterStatus />
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await findByText('status: loading')

  await findByText('count: 0')
  await findByText('status: success')
})
