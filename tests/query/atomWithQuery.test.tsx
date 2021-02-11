import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { Provider, useAtom } from '../../src/'
import fakeFetch from './fakeFetch'
import { atomWithQuery } from '../../src/query'

it('query basic test', async () => {
  const countAtom = atomWithQuery('count', async () => {
    return await fakeFetch({ count: 0 })
  })
  const Counter: React.FC = () => {
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

  const { findByText } = render(
    <Provider>
      <React.Suspense fallback="loading">
        <Counter />
      </React.Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 0')
})
