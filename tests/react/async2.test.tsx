import { StrictMode, Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

describe('useAtom sync option test', () => {
  it('suspend for Promise.resovle with sync=true', async () => {
    const countAtom = atom(0)
    const asyncAtom = atom((get) => Promise.resolve(get(countAtom)))

    const Component = () => {
      const count = useAtomValue(asyncAtom, { sync: true })
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

    const { getByText, findByText } = render(
      <StrictMode>
        <Suspense fallback="loading">
          <Component />
          <Controls />
        </Suspense>
      </StrictMode>
    )

    await findByText('loading')
    await findByText('count: 0')

    fireEvent.click(getByText('button'))
    await findByText('loading')
    await findByText('count: 1')
  })

  it('do not suspend for Promise.resovle with sync=false', async () => {
    const countAtom = atom(0)
    const asyncAtom = atom((get) => Promise.resolve(get(countAtom)))

    const Component = () => {
      const count = useAtomValue(asyncAtom, { sync: false })
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

    const { getByText, findByText } = render(
      <StrictMode>
        <Component />
        <Controls />
      </StrictMode>
    )

    await findByText('count: 0')

    fireEvent.click(getByText('button'))
    await findByText('count: 1')
  })
})
