import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom } from '../../src/index'
import { useAtomValue, useUpdateAtom } from '../../src/utils'

it('useAtomValue basic test', async () => {
  const countAtom = atom(0)

  const Counter: React.FC = () => {
    const count = useAtomValue(countAtom)
    const setCount = useUpdateAtom(countAtom)

    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(count + 1)}>dispatch</button>
      </>
    )
  }
  const { findByText, getByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 1')
})
