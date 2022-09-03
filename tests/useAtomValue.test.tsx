import { StrictMode } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { getTestProvider } from './testUtils'

const Provider = getTestProvider()

it('useAtomValue basic test', async () => {
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomValue(countAtom)
    const setCount = useSetAtom(countAtom)

    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(count + 1)}>dispatch</button>
      </>
    )
  }
  const { findByText, getByText } = render(
    <StrictMode>
      <Provider>
        <Counter />
      </Provider>
    </StrictMode>
  )

  await findByText('count: 0')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 1')
})
