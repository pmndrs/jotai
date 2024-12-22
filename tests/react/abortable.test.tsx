import { StrictMode, Suspense, useState } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEventOrig from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

const userEvent = {
  // eslint-disable-next-line testing-library/no-unnecessary-act
  click: (element: Element) => act(() => userEventOrig.click(element)),
}

describe('abortable atom test', () => {
  it('can abort with signal.aborted', async () => {
    const countAtom = atom(0)
    let abortedCount = 0
    const resolve: (() => void)[] = []
    const derivedAtom = atom(async (get, { signal }) => {
      const count = get(countAtom)
      await new Promise<void>((r) => resolve.push(r))
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

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Component />
            <Controls />
          </Suspense>
        </StrictMode>,
      )
    })

    await screen.findByText('loading')

    resolve.splice(0).forEach((fn) => fn())
    await screen.findByText('count: 0')
    expect(abortedCount).toBe(0)

    await userEvent.click(screen.getByText('button'))
    await userEvent.click(screen.getByText('button'))
    resolve.splice(0).forEach((fn) => fn())
    await screen.findByText('count: 2')

    expect(abortedCount).toBe(1)

    await userEvent.click(screen.getByText('button'))
    resolve.splice(0).forEach((fn) => fn())
    await screen.findByText('count: 3')
    expect(abortedCount).toBe(1)
  })

  it('can abort with event listener', async () => {
    const countAtom = atom(0)
    let abortedCount = 0
    const resolve: (() => void)[] = []
    const derivedAtom = atom(async (get, { signal }) => {
      const count = get(countAtom)
      const callback = () => {
        ++abortedCount
      }
      signal.addEventListener('abort', callback)
      await new Promise<void>((r) => resolve.push(r))
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

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Component />
            <Controls />
          </Suspense>
        </StrictMode>,
      )
    })

    await screen.findByText('loading')
    resolve.splice(0).forEach((fn) => fn())
    await screen.findByText('count: 0')

    expect(abortedCount).toBe(0)

    await userEvent.click(screen.getByText('button'))
    await userEvent.click(screen.getByText('button'))
    resolve.splice(0).forEach((fn) => fn())
    await screen.findByText('count: 2')

    expect(abortedCount).toBe(1)

    await userEvent.click(screen.getByText('button'))
    resolve.splice(0).forEach((fn) => fn())
    await screen.findByText('count: 3')

    expect(abortedCount).toBe(1)
  })

  it('does not abort on unmount', async () => {
    const countAtom = atom(0)
    let abortedCount = 0
    const resolve: (() => void)[] = []
    const derivedAtom = atom(async (get, { signal }) => {
      const count = get(countAtom)
      await new Promise<void>((r) => resolve.push(r))
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

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Parent />
          </Suspense>
        </StrictMode>,
      )
    })

    await screen.findByText('loading')

    resolve.splice(0).forEach((fn) => fn())
    await screen.findByText('count: 0')
    expect(abortedCount).toBe(0)

    await userEvent.click(screen.getByText('button'))
    await userEvent.click(screen.getByText('toggle'))

    await screen.findByText('hidden')

    resolve.splice(0).forEach((fn) => fn())
    await waitFor(() => expect(abortedCount).toBe(0))
  })

  it('throws aborted error (like fetch)', async () => {
    const countAtom = atom(0)
    const resolve: (() => void)[] = []
    const derivedAtom = atom(async (get, { signal }) => {
      const count = get(countAtom)
      await new Promise<void>((r) => resolve.push(r))
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

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      render(
        <StrictMode>
          <Suspense fallback="loading">
            <Component />
            <Controls />
          </Suspense>
        </StrictMode>,
      )
    })

    await screen.findByText('loading')

    resolve.splice(0).forEach((fn) => fn())
    await screen.findByText('count: 0')

    await userEvent.click(screen.getByText('button'))
    await userEvent.click(screen.getByText('button'))
    resolve.splice(0).forEach((fn) => fn())
    await screen.findByText('count: 2')

    await userEvent.click(screen.getByText('button'))
    resolve.splice(0).forEach((fn) => fn())
    await screen.findByText('count: 3')
  })
})
