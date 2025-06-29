import { StrictMode, useEffect, useRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
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

  render(
    <StrictMode>
      <Parent />
      <Selector />
    </StrictMode>,
  )

  expect(await screen.findByText('a: 0')).toBeInTheDocument()

  await userEvent.click(screen.getByText('increment'))
  expect(await screen.findByText('a: 1')).toBeInTheDocument()
  await userEvent.click(screen.getByText('increment'))
  expect(await screen.findByText('a: 2')).toBeInTheDocument()
  await userEvent.click(screen.getByText('increment'))
  expect(await screen.findByText('a: 3')).toBeInTheDocument()
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

  render(
    <>
      <Parent />
      <Selector />
    </>,
  )

  expect(await screen.findByText('value: {"a":0}')).toBeInTheDocument()
  expect(await screen.findByText('commits: 1')).toBeInTheDocument()
  await userEvent.click(screen.getByText('copy'))
  expect(await screen.findByText('value: {"a":0}')).toBeInTheDocument()
  expect(await screen.findByText('commits: 1')).toBeInTheDocument()

  await userEvent.click(screen.getByText('increment'))
  expect(await screen.findByText('value: {"a":1}')).toBeInTheDocument()
  expect(await screen.findByText('commits: 2')).toBeInTheDocument()
  await userEvent.click(screen.getByText('copy'))
  expect(await screen.findByText('value: {"a":1}')).toBeInTheDocument()
  expect(await screen.findByText('commits: 2')).toBeInTheDocument()

  await userEvent.click(screen.getByText('increment'))
  expect(await screen.findByText('value: {"a":2}')).toBeInTheDocument()
  expect(await screen.findByText('commits: 3')).toBeInTheDocument()
  await userEvent.click(screen.getByText('copy'))
  expect(await screen.findByText('value: {"a":2}')).toBeInTheDocument()
  expect(await screen.findByText('commits: 3')).toBeInTheDocument()

  await userEvent.click(screen.getByText('increment'))
  expect(await screen.findByText('value: {"a":3}')).toBeInTheDocument()
  expect(await screen.findByText('commits: 4')).toBeInTheDocument()
  await userEvent.click(screen.getByText('copy'))
  expect(await screen.findByText('value: {"a":3}')).toBeInTheDocument()
  expect(await screen.findByText('commits: 4')).toBeInTheDocument()
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
