import { Suspense, version as reactVersion, useState } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { abortableAtom } from 'jotai/utils'
import { getTestProvider, itSkipIfVersionedWrite } from '../testUtils'

const Provider = getTestProvider()

// Doesn't work with 16.8.6 maybe because of some React bugs?
// Curious, though. Feel free to dig into it if someone gets interested.
const describeExceptFor1686 =
  reactVersion !== '16.8.6' ? describe : describe.skip

describeExceptFor1686('abortable atom test', () => {
  itSkipIfVersionedWrite('can abort with signal.aborted', async () => {
    const countAtom = atom(0)
    let abortedCount = 0
    const derivedAtom = abortableAtom(async (get, { signal }) => {
      const count = get(countAtom)
      await new Promise((r) => setTimeout(r, 100))
      if (signal.aborted) {
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

  itSkipIfVersionedWrite('can abort with event listener', async () => {
    const countAtom = atom(0)
    let abortedCount = 0
    const derivedAtom = abortableAtom(async (get, { signal }) => {
      const count = get(countAtom)
      const callback = () => {
        ++abortedCount
      }
      signal.addEventListener('abort', callback)
      await new Promise((r) => setTimeout(r, 100))
      signal.removeEventListener('abort', callback)
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

  itSkipIfVersionedWrite('can abort on unmount', async () => {
    const countAtom = atom(0)
    let abortedCount = 0
    const derivedAtom = abortableAtom(async (get, { signal }) => {
      const count = get(countAtom)
      await new Promise((r) => setTimeout(r, 100))
      if (signal.aborted) {
        ++abortedCount
      }
      return count
    })

    const Component = () => {
      const count = useAtomValue(derivedAtom)
      return <div>count: {count}</div>
    }

    const Parent = () => {
      const setCount = useSetAtom(countAtom)
      const [show, setShow] = useState(true)
      return (
        <>
          {show ? <Component /> : 'hidden'}
          <button onClick={() => setCount((c) => c + 1)}>button</button>
          <button onClick={() => setShow((x) => !x)}>toggle</button>
        </>
      )
    }

    const { findByText, getByText } = render(
      <Provider>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </Provider>
    )

    await findByText('loading')
    await findByText('count: 0')
    expect(abortedCount).toBe(0)

    fireEvent.click(getByText('button'))
    fireEvent.click(getByText('toggle'))
    await findByText('hidden')
    await waitFor(() => {
      expect(abortedCount).toBe(1)
    })
  })

  it('throws aborted error (like fetch)', async () => {
    const countAtom = atom(0)
    const derivedAtom = abortableAtom(async (get, { signal }) => {
      const count = get(countAtom)
      await new Promise((r) => setTimeout(r, 100))
      if (signal.aborted) {
        throw new Error('aborted')
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

    fireEvent.click(getByText('button'))
    fireEvent.click(getByText('button'))
    await findByText('count: 2')

    fireEvent.click(getByText('button'))
    await findByText('count: 3')
  })
})
