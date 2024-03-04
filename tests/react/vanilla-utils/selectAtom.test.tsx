import { StrictMode, Suspense, useEffect, useRef } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import { atom, createStore } from 'jotai/vanilla'
import { selectAtom } from 'jotai/vanilla/utils'

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  return commitCountRef.current
}

it('selectAtom works as expected', async () => {
  const bigAtom = atom({ a: 0, b: 'othervalue' })
  const littleAtom = selectAtom(bigAtom, (v) => v.a)

  const Parent = () => {
    const setValue = useSetAtom(bigAtom)
    return (
      <>
        <button
          onClick={() =>
            setValue((oldValue) => ({ ...oldValue, a: oldValue.a + 1 }))
          }
        >
          increment
        </button>
      </>
    )
  }

  const Selector = () => {
    const a = useAtomValue(littleAtom)
    return (
      <>
        <div>a: {a}</div>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Parent />
      <Selector />
    </StrictMode>,
  )

  await findByText('a: 0')

  fireEvent.click(getByText('increment'))
  await findByText('a: 1')
  fireEvent.click(getByText('increment'))
  await findByText('a: 2')
  fireEvent.click(getByText('increment'))
  await findByText('a: 3')
})

it('selectAtom works with async atom', async () => {
  const bigAtom = atom({ a: 0, b: 'othervalue' })
  const bigAtomAsync = atom((get) => Promise.resolve(get(bigAtom)))
  const littleAtom = selectAtom(bigAtomAsync, (v) => v.a)

  const Parent = () => {
    const setValue = useSetAtom(bigAtom)
    return (
      <>
        <button
          onClick={() =>
            setValue((oldValue) => ({ ...oldValue, a: oldValue.a + 1 }))
          }
        >
          increment
        </button>
      </>
    )
  }

  const Selector = () => {
    const a = useAtomValue(littleAtom)
    return (
      <>
        <div>a: {a}</div>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Suspense fallback={null}>
        <Parent />
        <Selector />
      </Suspense>
    </StrictMode>,
  )

  await findByText('a: 0')

  fireEvent.click(getByText('increment'))
  await findByText('a: 1')
  fireEvent.click(getByText('increment'))
  await findByText('a: 2')
  fireEvent.click(getByText('increment'))
  await findByText('a: 3')
})

it('do not update unless equality function says value has changed', async () => {
  const bigAtom = atom({ a: 0 })
  const littleAtom = selectAtom(
    bigAtom,
    (value) => value,
    (left, right) => JSON.stringify(left) === JSON.stringify(right),
  )

  const Parent = () => {
    const setValue = useSetAtom(bigAtom)
    return (
      <>
        <button
          onClick={() =>
            setValue((oldValue) => ({ ...oldValue, a: oldValue.a + 1 }))
          }
        >
          increment
        </button>
        <button onClick={() => setValue((oldValue) => ({ ...oldValue }))}>
          copy
        </button>
      </>
    )
  }

  const Selector = () => {
    const value = useAtomValue(littleAtom)
    const commits = useCommitCount()
    return (
      <>
        <div>value: {JSON.stringify(value)}</div>
        <div>commits: {commits}</div>
      </>
    )
  }

  const { findByText, getByText } = render(
    <>
      <Parent />
      <Selector />
    </>,
  )

  await findByText('value: {"a":0}')
  await findByText('commits: 1')
  fireEvent.click(getByText('copy'))
  await findByText('value: {"a":0}')
  await findByText('commits: 1')

  fireEvent.click(getByText('increment'))
  await findByText('value: {"a":1}')
  await findByText('commits: 2')
  fireEvent.click(getByText('copy'))
  await findByText('value: {"a":1}')
  await findByText('commits: 2')

  fireEvent.click(getByText('increment'))
  await findByText('value: {"a":2}')
  await findByText('commits: 3')
  fireEvent.click(getByText('copy'))
  await findByText('value: {"a":2}')
  await findByText('commits: 3')

  fireEvent.click(getByText('increment'))
  await findByText('value: {"a":3}')
  await findByText('commits: 4')
  fireEvent.click(getByText('copy'))
  await findByText('value: {"a":3}')
  await findByText('commits: 4')
})

it('equality function works even if suspend', async () => {
  const bigAtom = atom({ a: 0 })
  const bigAtomAsync = atom((get) => Promise.resolve(get(bigAtom)))
  const littleAtom = selectAtom(
    bigAtomAsync,
    (value) => value,
    (left, right) => left.a === right.a,
  )

  const Controls = () => {
    const [value, setValue] = useAtom(bigAtom)
    return (
      <>
        <div>bigValue: {JSON.stringify(value)}</div>
        <button
          onClick={() =>
            setValue((oldValue) => ({ ...oldValue, a: oldValue.a + 1 }))
          }
        >
          increment
        </button>
        <button onClick={() => setValue((oldValue) => ({ ...oldValue, b: 2 }))}>
          other
        </button>
      </>
    )
  }

  const Selector = () => {
    const value = useAtomValue(littleAtom)
    return <div>littleValue: {JSON.stringify(value)}</div>
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Suspense fallback={null}>
        <Controls />
        <Selector />
      </Suspense>
    </StrictMode>,
  )

  await findByText('bigValue: {"a":0}')
  await findByText('littleValue: {"a":0}')

  fireEvent.click(getByText('increment'))
  await findByText('bigValue: {"a":1}')
  await findByText('littleValue: {"a":1}')

  fireEvent.click(getByText('other'))
  await findByText('bigValue: {"a":1,"b":2}')
  await findByText('littleValue: {"a":1}')
})

it.only('should not return async value when the base atom values are synchronous', async () => {
  expect.assertions(4)
  type Base = { id: number; value: number }
  const initialBase = Promise.resolve({ id: 0, value: 0 })
  const baseAtom = atom<Base | Promise<Base>>(initialBase)
  const idAtom = selectAtom(
    baseAtom,
    ({ id }) => id,
    (a, b) => a === b,
  )

  const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
    typeof (x as any)?.then === 'function'

  const store = createStore()
  async function incrementValue() {
    const { id, value } = await store.get(baseAtom)
    store.set(baseAtom, { id, value: value + 1 })
  }

  expect(isPromiseLike(store.get(baseAtom))).toBe(true)
  expect(isPromiseLike(store.get(idAtom))).toBe(true)
  await delay(0)
  await incrementValue()
  expect(isPromiseLike(store.get(baseAtom))).toBe(false)
  expect(isPromiseLike(store.get(idAtom))).toBe(false)
})

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
