import { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { proxy, snapshot } from 'valtio/vanilla'
import { atom, useAtom } from 'jotai'
import { atomWithProxy } from 'jotai/valtio'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('count state', async () => {
  const proxyState = proxy({ count: 0 })
  const stateAtom = atomWithProxy(proxyState)
  ++proxyState.count

  const Counter = () => {
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

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  expect(proxyState.count).toBe(2)

  ++proxyState.count
  await findByText('count: 3')
  expect(proxyState.count).toBe(3)
})

it('nested count state', async () => {
  const proxyState = proxy({ nested: { count: 0 }, other: {} })
  const otherSnap = snapshot(proxyState.other)
  const stateAtom = atomWithProxy(proxyState)
  const Counter = () => {
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

it('state with a promise', async () => {
  const getAsyncStatus = (status: string) =>
    new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(status)
      }, 15)
    })

  const proxyState = proxy({
    status: getAsyncStatus('done'),
  })
  const stateAtom = atomWithProxy(proxyState)

  const Status = () => {
    const [state, setState] = useAtom(stateAtom)
    return (
      <>
        <span>status: {state.status}</span>
        <button
          onClick={() =>
            setState((prev) => ({
              ...prev,
              status: getAsyncStatus('modified'),
            }))
          }>
          button
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading...">
        <Status />
      </Suspense>
    </Provider>
  )

  await findByText('status: done')
  fireEvent.click(getByText('button'))
  await findByText('status: modified')
})

it('synchronous atomWithProxy and regular atom ', async () => {
  let count = 0
  const proxyState: { elements: Record<string, string> } = proxy({
    elements: {},
  })
  const stateAtom = atomWithProxy(proxyState, { sync: true })
  const selectedElementIdAtom = atom('')

  const createElementAtom = atom(null, (_, set) => {
    const id = String(count++)
    set(selectedElementIdAtom, id)
    proxyState.elements[id] = `element`
  })

  const Elements = () => {
    const [state] = useAtom(stateAtom)
    const [selected] = useAtom(selectedElementIdAtom)
    const [, create] = useAtom(createElementAtom)

    return (
      <>
        <span>
          selected element:{' '}
          {selected === ''
            ? 'none'
            : state.elements[selected] === undefined
            ? 'undefined'
            : 'defined'}
        </span>
        <button
          onClick={() => {
            create()
          }}>
          create and select element
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Elements />
    </Provider>
  )

  await findByText('selected element: none')
  fireEvent.click(getByText('create and select element'))
  getByText('selected element: defined') // synchronous
})
