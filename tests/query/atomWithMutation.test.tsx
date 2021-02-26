import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../../src/'
import fakeFetch from './fakeFetch'
import { atomWithQuery, atomWithMutation } from '../../src/query'

it('atomWithMutation basic test', async () => {
  const countAtom = atomWithMutation(async () => {
    return await fakeFetch({ count: 0 })
  })
  const Counter: React.FC = () => {
    const [count, setCount] = React.useState()
    const [, mutate] = useAtom(countAtom)

    const fetch = async () => {
      const { response } = await mutate()
      setCount(response.count)
    }

    return (
      <>
        <div>count: {count || 'N/A'}</div>
        <button onClick={() => fetch()}>fetch</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <React.Suspense fallback="loading">
        <Counter />
      </React.Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: N/A')
  fireEvent.click(getByText('fetch'))
  await findByText('count: 0')
})
