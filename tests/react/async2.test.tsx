import { StrictMode, Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { describe, it } from 'vitest'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

describe('useAtom delay option test', () => {
  it('suspend for Promise.resovle without delay option', async () => {
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
      </StrictMode>
    )

    await findByText('count: 0')

    fireEvent.click(getByText('button'))
    await findByText('loading')
    await findByText('count: 1')
  })

  it('do not suspend for Promise.resovle with delay option', async () => {
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
      </StrictMode>
    )

    await findByText('count: 0')

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
      }
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
      </StrictMode>
    )

    await findByText('text: pending0')
    resolve()
    await findByText('text: hello0')

    fireEvent.click(getByText('button'))
    await findByText('text: hello1')
  })
})
