import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../../src/index'
import { withImmer } from '../../src/immer'

it('withImmer derived atom with useAtom', async () => {
  const regularCountAtom = atom(0)
  const countAtom = withImmer(regularCountAtom)

  const Parent: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((draft) => (draft = draft + 1))}>
          Increase
        </button>
        <button onClick={() => setCount((draft) => (draft = draft - 1))}>
          Decrease
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Parent />
    </Provider>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('Increase'))
  await findByText('count: 1')

  fireEvent.click(getByText('Decrease'))
  await findByText('count: 0')
})
