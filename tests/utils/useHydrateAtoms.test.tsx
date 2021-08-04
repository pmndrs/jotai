import type { FC } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, useAtom } from '../../src/index'
import { useHydrateAtoms } from '../../src/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('useHydrateAtoms should only hydrate on first render', async () => {
  const countAtom = atom(0)

  const Counter: FC<{ count: number }> = ({ count }) => {
    useHydrateAtoms([[countAtom, count]])
    const [countValue, setCount] = useAtom(countAtom)

    return (
      <>
        <div>count: {countValue}</div>
        <button onClick={() => setCount(count + 1)}>dispatch</button>
      </>
    )
  }
  const { findByText, getByText, rerender } = render(
    <Provider>
      <Counter count={42} />
    </Provider>
  )

  await findByText('count: 42')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')

  rerender(
    <Provider>
      <Counter count={65} />
    </Provider>
  )
  await findByText('count: 43')
})
