import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../src/index'

it('one atom, one effect', async () => {
  const countAtom = atom(1)
  const effectFn = jest.fn()
  countAtom.effects = [effectFn]

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 1')
  expect(effectFn).toBeCalledTimes(1)

  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  expect(effectFn).toBeCalledTimes(1)
})

it('one atom, two effects', () => {})
it('two atoms, one each', () => {})
it('one derived atom, one effect', () => {})
// derive chain test
// mount/unmount test
// cleanup test
// effect/cleanup order test
// async test
// subscription usage test
// ...
