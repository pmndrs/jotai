import { StrictMode, Suspense, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAtom, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import type { SetStateAction, WritableAtom } from 'jotai/vanilla'
import { atomFamily } from 'jotai/vanilla/utils'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('new atomFamily impl', () => {
  const myFamily = atomFamily((param: string) => atom(param))

  const Displayer = ({ index }: { index: string }) => {
    const [count] = useAtom(myFamily(index))
    return <div>count: {count}</div>
  }

  render(
    <StrictMode>
      <Displayer index="a" />
    </StrictMode>,
  )

  expect(screen.getByText('count: a')).toBeInTheDocument()
})

it('primitive atomFamily returns same reference for same parameters', () => {
  const myFamily = atomFamily((num: number) => atom({ num }))

  expect(myFamily(0)).toEqual(myFamily(0))
  expect(myFamily(0)).not.toEqual(myFamily(1))
  expect(myFamily(1)).not.toEqual(myFamily(0))
})

it('read-only derived atomFamily returns same reference for same parameters', () => {
  const arrayAtom = atom([0])
  const myFamily = atomFamily((num: number) =>
    atom((get) => get(arrayAtom)[num] as number),
  )

  expect(myFamily(0)).toEqual(myFamily(0))
  expect(myFamily(0)).not.toEqual(myFamily(1))
  expect(myFamily(1)).not.toEqual(myFamily(0))
})

it('removed atom creates a new reference', () => {
  const bigAtom = atom([0])
  const myFamily = atomFamily((num: number) =>
    atom((get) => get(bigAtom)[num] as number),
  )

  const savedReference = myFamily(0)

  expect(savedReference).toEqual(myFamily(0))

  myFamily.remove(0)

  const newReference = myFamily(0)

  expect(savedReference).not.toEqual(newReference)

  myFamily.remove(1337)

  expect(myFamily(0)).toEqual(newReference)
})

it('primitive atomFamily initialized with props', () => {
  const myFamily = atomFamily((param: number) => atom(param))

  const Displayer = ({ index }: { index: number }) => {
    const [count, setCount] = useAtom(myFamily(index))
    return (
      <div>
        count: {count}
        <button onClick={() => setCount((c) => c + 10)}>button</button>
      </div>
    )
  }

  const Parent = () => {
    const [index, setIndex] = useState(1)

    return (
      <div>
        <button onClick={() => setIndex((i) => i + 1)}>increment</button>
        <Displayer index={index} />
      </div>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  expect(screen.getByText('count: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 11')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment'))
  expect(screen.getByText('count: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 12')).toBeInTheDocument()
})

it('derived atomFamily functionality as usual', () => {
  const arrayAtom = atom([0, 0, 0])

  const myFamily = atomFamily((param: number) =>
    atom(
      (get) => get(arrayAtom)[param] as number,
      (_, set, update) => {
        set(arrayAtom, (oldArray) => {
          if (typeof oldArray[param] === 'undefined') return oldArray

          const newValue =
            typeof update === 'function'
              ? update(oldArray[param] as number)
              : update

          const newArray = [
            ...oldArray.slice(0, param),
            newValue,
            ...oldArray.slice(param + 1),
          ]

          return newArray
        })
      },
    ),
  )

  const Displayer = ({
    index,
    countAtom,
  }: {
    index: number
    countAtom: WritableAtom<number, [SetStateAction<number>], void>
  }) => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <div>
        index: {index}, count: {count}
        <button onClick={() => setCount((oldValue) => oldValue + 1)}>
          increment #{index}
        </button>
      </div>
    )
  }

  const indicesAtom = atom((get) => [...new Array(get(arrayAtom).length)])

  const Parent = () => {
    const [indices] = useAtom(indicesAtom)

    return (
      <div>
        {indices.map((_, index) => (
          <Displayer key={index} index={index} countAtom={myFamily(index)} />
        ))}
      </div>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  expect(screen.getByText('index: 0, count: 0')).toBeInTheDocument()
  expect(screen.getByText('index: 1, count: 0')).toBeInTheDocument()
  expect(screen.getByText('index: 2, count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment #1'))
  expect(screen.getByText('index: 0, count: 0')).toBeInTheDocument()
  expect(screen.getByText('index: 1, count: 1')).toBeInTheDocument()
  expect(screen.getByText('index: 2, count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment #0'))
  expect(screen.getByText('index: 0, count: 1')).toBeInTheDocument()
  expect(screen.getByText('index: 1, count: 1')).toBeInTheDocument()
  expect(screen.getByText('index: 2, count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment #2'))
  expect(screen.getByText('index: 0, count: 1')).toBeInTheDocument()
  expect(screen.getByText('index: 1, count: 1')).toBeInTheDocument()
  expect(screen.getByText('index: 2, count: 1')).toBeInTheDocument()
})

it('custom equality function work', () => {
  const bigAtom = atom([0])

  const badFamily = atomFamily((num: { index: number }) =>
    atom((get) => get(bigAtom)[num.index] as number),
  )

  const goodFamily = atomFamily(
    (num: { index: number }) =>
      atom((get) => get(bigAtom)[num.index] as number),
    (l, r) => l.index === r.index,
  )

  expect(badFamily({ index: 0 })).not.toEqual(badFamily({ index: 0 }))
  expect(badFamily({ index: 0 })).not.toEqual(badFamily({ index: 0 }))

  expect(goodFamily({ index: 0 })).toEqual(goodFamily({ index: 0 }))
  expect(goodFamily({ index: 0 })).not.toEqual(goodFamily({ index: 1 }))
})

it('a derived atom from an async atomFamily (#351)', async () => {
  const countAtom = atom(1)
  const getAsyncAtom = atomFamily((n: number) =>
    atom(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      return n + 10
    }),
  )
  const derivedAtom = atom((get) => get(getAsyncAtom(get(countAtom))))

  const Counter = () => {
    const setCount = useSetAtom(countAtom)
    const [derived] = useAtom(derivedAtom)
    return (
      <>
        <div>derived: {derived}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback={<div>loading</div>}>
          <Counter />
        </Suspense>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('derived: 11')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('derived: 12')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('derived: 13')).toBeInTheDocument()
})

it('setShouldRemove with custom equality function', () => {
  const myFamily = atomFamily(
    (num: { index: number }) => atom(num),
    (l, r) => l.index === r.index,
  )
  let firstTime = true
  myFamily.setShouldRemove(() => {
    if (firstTime) {
      firstTime = false
      return true
    }
    return false
  })

  const family1 = myFamily({ index: 0 })
  const family2 = myFamily({ index: 0 })
  const family3 = myFamily({ index: 0 })

  expect(family1).not.toBe(family2)
  expect(family2).toBe(family3)
})
