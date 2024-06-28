import { StrictMode, Suspense } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { assert, describe, expect, it } from 'vitest'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

describe('useAtom delay option test', () => {
  it('suspend for Promise.resolve without delay option', async () => {
    const countAtom = atom(0)
    const asyncAtom = atom((get) => {
      const count = get(countAtom)
      if (count === 0) {
        return 0
      }
      return Promise.resolve(count)
    })

    const Component = () => {
      const count = useAtomValue(asyncAtom)
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
      </StrictMode>,
    )

    await findByText('count: 0')

    // The use of fireEvent is required to reproduce the issue
    fireEvent.click(getByText('button'))
    await findByText('loading')
    await findByText('count: 1')
  })

  it('do not suspend for Promise.resolve with delay option', async () => {
    const countAtom = atom(0)
    const asyncAtom = atom((get) => {
      const count = get(countAtom)
      if (count === 0) {
        return 0
      }
      return Promise.resolve(count)
    })

    const Component = () => {
      const count = useAtomValue(asyncAtom, { delay: 0 })
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
      </StrictMode>,
    )

    await findByText('count: 0')

    // The use of fireEvent is required to reproduce the issue
    fireEvent.click(getByText('button'))
    await findByText('count: 1')
  })
})

describe('atom read function setSelf option test', () => {
  it('do not suspend with promise resolving with setSelf', async () => {
    const countAtom = atom(0)
    let resolve = () => {}
    const asyncAtom = atom(async () => {
      await new Promise<void>((r) => (resolve = r))
      return 'hello'
    })
    const refreshAtom = atom(0)
    const promiseCache = new WeakMap<object, string>()
    const derivedAtom = atom(
      (get, { setSelf }) => {
        get(refreshAtom)
        const count = get(countAtom)
        const promise = get(asyncAtom)
        if (promiseCache.has(promise)) {
          return (promiseCache.get(promise) as string) + count
        }
        promise.then((v) => {
          promiseCache.set(promise, v)
          setSelf()
        })
        return 'pending' + count
      },
      (_get, set) => {
        set(refreshAtom, (c) => c + 1)
      },
    )

    const Component = () => {
      const text = useAtomValue(derivedAtom)
      return <div>text: {text}</div>
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
      </StrictMode>,
    )

    await findByText('text: pending0')
    resolve()
    await findByText('text: hello0')

    // The use of fireEvent is required to reproduce the issue
    fireEvent.click(getByText('button'))
    await findByText('text: hello1')
  })
})

describe('timing issue with setSelf', () => {
  it('resolves dependencies reliably after a delay (#2192)', async () => {
    expect.assertions(1)
    const countAtom = atom(0)

    let result: number | null = null
    const resolve: (() => void)[] = []
    const asyncAtom = atom(async (get) => {
      const count = get(countAtom)
      await new Promise<void>((r) => resolve.push(r))
      return count
    })

    const derivedAtom = atom(
      async (get, { setSelf }) => {
        get(countAtom)
        await Promise.resolve()
        const resultCount = await get(asyncAtom)
        result = resultCount
        if (resultCount === 2) setSelf() // <-- necessary
      },
      () => {},
    )

    const derivedSyncAtom = atom((get) => {
      get(derivedAtom)
    })

    const increment = (c: number) => c + 1
    function TestComponent() {
      useAtom(derivedSyncAtom)
      const [count, setCount] = useAtom(countAtom)
      const onClick = () => {
        setCount(increment)
        setCount(increment)
      }
      return (
        <>
          count: {count}
          <button onClick={onClick}>button</button>
        </>
      )
    }

    const { getByText, findByText } = render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    )

    await waitFor(() => assert(resolve.length === 1))
    resolve[0]!()

    // The use of fireEvent is required to reproduce the issue
    fireEvent.click(getByText('button'))

    await waitFor(() => assert(resolve.length === 3))
    resolve[1]!()
    resolve[2]!()

    await waitFor(() => assert(result === 2))

    // The use of fireEvent is required to reproduce the issue
    fireEvent.click(getByText('button'))

    await waitFor(() => assert(resolve.length === 5))
    resolve[3]!()
    resolve[4]!()

    await findByText('count: 4')
    expect(result).toBe(4) // 3
  })
})

describe('infinite pending', () => {
  it('odd counter', async () => {
    const countAtom = atom(0)
    const asyncAtom = atom((get) => {
      const count = get(countAtom)
      if (count % 2 === 0) {
        const infinitePending = new Promise<never>(() => {})
        return infinitePending
      }
      return count
    })

    const Component = () => {
      const count = useAtomValue(asyncAtom)
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
        <Controls />
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      </StrictMode>,
    )

    await findByText('loading')

    await userEvent.click(getByText('button'))
    await findByText('count: 1')

    await userEvent.click(getByText('button'))
    await findByText('loading')

    await userEvent.click(getByText('button'))
    await findByText('count: 3')
  })
})
