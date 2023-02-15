import { StrictMode, Suspense, useState } from 'react'
import { describe, expect, it } from '@jest/globals'
import { act, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

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

    const { findByText, getByText } = render(
      <StrictMode>
        <Suspense fallback="loading">
          <Component />
          <Controls />
        </Suspense>
      </StrictMode>
    )

    await findByText('loading')

    act(() => {
      resolve.splice(0).forEach((fn) => fn())
    })
    await waitFor(() => expect(getByText('count: 0')).toBeTruthy())
    expect(abortedCount).toBe(0)

    await userEvent.click(getByText('button'))
    await userEvent.click(getByText('button'))
    act(() => {
      resolve.splice(0).forEach((fn) => fn())
    })
    await waitFor(() => expect(getByText('count: 2')).toBeTruthy())

    expect(abortedCount).toBe(1)

    await userEvent.click(getByText('button'))
    act(() => {
      resolve.splice(0).forEach((fn) => fn())
    })
    await waitFor(() => expect(getByText('count: 3')).toBeTruthy())
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

    const { findByText, getByText } = render(
      <StrictMode>
        <Suspense fallback="loading">
          <Component />
          <Controls />
        </Suspense>
      </StrictMode>
    )

    expect(await findByText('loading')).toBeTruthy()

    act(() => {
      resolve.splice(0).forEach((fn) => fn())
    })
    await waitFor(() => expect(getByText('count: 0')).toBeTruthy())

    expect(abortedCount).toBe(0)

    await userEvent.click(getByText('button'))
    await userEvent.click(getByText('button'))

    act(() => {
      resolve.splice(0).forEach((fn) => fn())
    })
    await waitFor(() => expect(getByText('count: 2')).toBeTruthy())

    expect(abortedCount).toBe(1)

    await userEvent.click(getByText('button'))
    act(() => {
      resolve.splice(0).forEach((fn) => fn())
    })
    await waitFor(() => expect(getByText('count: 3')).toBeTruthy())

    expect(abortedCount).toBe(1)
  })

  it('can abort on unmount', async () => {
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

    const { findByText, getByText } = render(
      <StrictMode>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </StrictMode>
    )

    expect(await findByText('loading')).toBeTruthy()

    act(() => {
      resolve.splice(0).forEach((fn) => fn())
    })
    await waitFor(() => expect(getByText('count: 0')).toBeTruthy())
    expect(abortedCount).toBe(0)

    await userEvent.click(getByText('button'))
    await userEvent.click(getByText('toggle'))

    expect(await findByText('hidden')).toBeTruthy()

    act(() => {
      resolve.splice(0).forEach((fn) => fn())
    })
    await waitFor(() => expect(abortedCount).toBe(1))
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

    const { findByText, getByText } = render(
      <StrictMode>
        <Suspense fallback="loading">
          <Component />
          <Controls />
        </Suspense>
      </StrictMode>
    )

    expect(await findByText('loading')).toBeTruthy()

    act(() => {
      resolve.splice(0).forEach((fn) => fn())
    })
    await waitFor(() => expect(getByText('count: 0')).toBeTruthy())

    await userEvent.click(getByText('button'))
    await userEvent.click(getByText('button'))
    act(() => {
      resolve.splice(0).forEach((fn) => fn())
    })
    await waitFor(() => expect(getByText('count: 2')).toBeTruthy())

    await userEvent.click(getByText('button'))
    act(() => {
      resolve.splice(0).forEach((fn) => fn())
    })
    await waitFor(() => expect(getByText('count: 3')).toBeTruthy())
  })
})
