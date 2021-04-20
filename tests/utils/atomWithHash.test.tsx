import React, { Fragment } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider as ProviderOrig, useAtom } from '../../src/index'
import { atomWithHash } from '../../src/utils'

const Provider = process.env.PROVIDER_LESS_MODE ? Fragment : ProviderOrig

it('simple count', async () => {
  const countAtom = atomWithHash(1, 'count')

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  expect(window.location.hash).toEqual('#count=2')

  window.location.hash = 'count=3'
  await findByText('count: 3')
})
