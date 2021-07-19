import { fireEvent, render } from '@testing-library/react'
import { atom } from '../../src/index'
import { useAtomValue, useUpdateAtom } from '../../src/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('useAtomValue basic test', async () => {
  const countAtom = atom(0)

  const Counter = () => {
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
