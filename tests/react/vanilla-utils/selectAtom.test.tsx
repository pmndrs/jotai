import { StrictMode, useEffect, useRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import { selectAtom } from 'jotai/vanilla/utils'

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  // eslint-disable-next-line react-hooks/refs
  return commitCountRef.current
}

it('selectAtom works as expected', () => {
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

  render(
    <StrictMode>
      <Parent />
      <Selector />
    </StrictMode>,
  )

  expect(screen.getByText('a: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment'))
  expect(screen.getByText('a: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment'))
  expect(screen.getByText('a: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment'))
  expect(screen.getByText('a: 3')).toBeInTheDocument()
})

it('do not update unless equality function says value has changed', () => {
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

  render(
    <>
      <Parent />
      <Selector />
    </>,
  )

  expect(screen.getByText('value: {"a":0}')).toBeInTheDocument()
  expect(screen.getByText('commits: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('copy'))
  expect(screen.getByText('value: {"a":0}')).toBeInTheDocument()
  expect(screen.getByText('commits: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment'))
  expect(screen.getByText('value: {"a":1}')).toBeInTheDocument()
  expect(screen.getByText('commits: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('copy'))
  expect(screen.getByText('value: {"a":1}')).toBeInTheDocument()
  expect(screen.getByText('commits: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment'))
  expect(screen.getByText('value: {"a":2}')).toBeInTheDocument()
  expect(screen.getByText('commits: 3')).toBeInTheDocument()

  fireEvent.click(screen.getByText('copy'))
  expect(screen.getByText('value: {"a":2}')).toBeInTheDocument()
  expect(screen.getByText('commits: 3')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment'))
  expect(screen.getByText('value: {"a":3}')).toBeInTheDocument()
  expect(screen.getByText('commits: 4')).toBeInTheDocument()

  fireEvent.click(screen.getByText('copy'))
  expect(screen.getByText('value: {"a":3}')).toBeInTheDocument()
  expect(screen.getByText('commits: 4')).toBeInTheDocument()
})

it('creates fresh cache path when deps differ (memo3)', () => {
  const baseAtom = atom({ a: 0, b: 1 })

  const derivedAtom1 = selectAtom(baseAtom, (v) => v)
  const derivedAtom2 = selectAtom(baseAtom, (v) => v)

  expect(derivedAtom1).not.toBe(derivedAtom2)

  const selector = (v: { a: number; b: number }) => v.a
  const derivedAtom3 = selectAtom(baseAtom, selector)
  const derivedAtom4 = selectAtom(baseAtom, selector)

  expect(derivedAtom3).toBe(derivedAtom4)
})
