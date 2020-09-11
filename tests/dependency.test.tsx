import React from 'react'
import { fireEvent, cleanup, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../src/index'

const consoleError = console.error
afterEach(() => {
  cleanup()
  console.error = consoleError
})

it('works with 2 level dependencies', async () => {
  const countAtom = atom(1)
  const doubledAtom = atom((get) => get(countAtom) * 2)
  const tripledAtom = atom((get) => get(doubledAtom) * 3)

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const [doubledCount] = useAtom(doubledAtom)
    const [tripledCount] = useAtom(tripledAtom)
    const renderCount = React.useRef(0)
    return (
      <>
        <div>
          renderCount: {++renderCount.current}, count: {count}, doubled:{' '}
          {doubledCount}, tripled: {tripledCount}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('renderCount: 1, count: 1, doubled: 2, tripled: 6')

  fireEvent.click(getByText('button'))
  await findByText('renderCount: 2, count: 2, doubled: 4, tripled: 12')
})
