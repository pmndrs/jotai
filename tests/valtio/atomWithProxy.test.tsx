import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { proxy, snapshot } from 'valtio/vanilla'
import { Provider, useAtom } from '../../src/index'
import { atomWithProxy } from '../../src/valtio'

it('count state', async () => {
  const proxyState = proxy({ count: 0 })
  const stateAtom = atomWithProxy(proxyState)
  const Counter: React.FC = () => {
    const [state, setState] = useAtom(stateAtom)

    return (
      <>
        count: {state.count}
        <button
          onClick={() =>
            setState((prev) => ({ ...prev, count: prev.count + 1 }))
          }>
          button
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
  expect(proxyState.count).toBe(1)

  ++proxyState.count
  await findByText('count: 2')
  expect(proxyState.count).toBe(2)
})

it('nested count state', async () => {
  const proxyState = proxy({ nested: { count: 0 }, other: {} })
  const otherSnap = snapshot(proxyState.other)
  const stateAtom = atomWithProxy(proxyState)
  const Counter: React.FC = () => {
    const [state, setState] = useAtom(stateAtom)

    return (
      <>
        count: {state.nested.count}
        <button
          onClick={() =>
            setState((prev) => ({
              ...prev,
              nested: { ...prev.nested, count: prev.nested.count + 1 },
            }))
          }>
          button
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
  expect(proxyState.nested.count).toBe(1)
  expect(otherSnap === snapshot(proxyState.other)).toBe(true)

  ++proxyState.nested.count
  await findByText('count: 2')
  expect(proxyState.nested.count).toBe(2)
  expect(otherSnap === snapshot(proxyState.other)).toBe(true)
})
