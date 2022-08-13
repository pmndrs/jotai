import { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { abortableAtom } from 'jotai/utils'
import { getTestProvider, itSkipIfVersionedWrite } from '../testUtils'

const Provider = getTestProvider()

itSkipIfVersionedWrite('can abort with signal.aborted', async () => {
  const countAtom = atom(0)
  let abortedCount = 0
  const derivedAtom = abortableAtom(async (get, { signal }) => {
    const count = get(countAtom)
    await new Promise((r) => setTimeout(r, 100))
    if (signal.aborted) {
      console.log('-------', signal, { count })
      ++abortedCount
    }
    return count
  })

  const Component = () => {
    const count = useAtomValue(derivedAtom)
    return <div>count: {count}</div>
  }

  const Controls = () => {
    const setCount = useSetAtom(countAtom)
    return (
      <>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Component />
        <Controls />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 0')
  expect(abortedCount).toBe(0)

  fireEvent.click(getByText('button'))
  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  expect(abortedCount).toBe(1)

  fireEvent.click(getByText('button'))
  await findByText('count: 3')
  expect(abortedCount).toBe(1)
})

it('can abort with event listener', async () => {
  // TODO
})

it('can abort on unmount', async () => {
  // TODO
})

it('throws aborted error (like fetch)', async () => {
  // TODO
})
