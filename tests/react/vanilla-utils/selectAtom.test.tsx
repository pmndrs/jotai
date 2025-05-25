import { StrictMode, useEffect, useRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { it } from 'vitest'
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

  await screen.findByText('a: 0')

  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('a: 1')
  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('a: 2')
  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('a: 3')
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

  await screen.findByText('value: {"a":0}')
  await screen.findByText('commits: 1')
  await userEvent.click(screen.getByText('copy'))
  await screen.findByText('value: {"a":0}')
  await screen.findByText('commits: 1')

  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('value: {"a":1}')
  await screen.findByText('commits: 2')
  await userEvent.click(screen.getByText('copy'))
  await screen.findByText('value: {"a":1}')
  await screen.findByText('commits: 2')

  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('value: {"a":2}')
  await screen.findByText('commits: 3')
  await userEvent.click(screen.getByText('copy'))
  await screen.findByText('value: {"a":2}')
  await screen.findByText('commits: 3')

  await userEvent.click(screen.getByText('increment'))
  await screen.findByText('value: {"a":3}')
  await screen.findByText('commits: 4')
  await userEvent.click(screen.getByText('copy'))
  await screen.findByText('value: {"a":3}')
  await screen.findByText('commits: 4')
})

it('creates fresh cache path when deps differ (memo3)', async () => {
  const baseAtom = atom({ a: 0, b: 1 })
  const derivedAtom1 = selectAtom(baseAtom, (value) => value)
  const derivedAtom2 = selectAtom(baseAtom, (value) => value)

  const Component1 = () => {
    const value = useAtomValue(derivedAtom1)
    return <div>{JSON.stringify(value)}</div>
  }

  const Component2 = () => {
    const value = useAtomValue(derivedAtom2)
    return <div>{JSON.stringify(value)}</div>
  }

  const { unmount } = render(<Component1 />)
  await screen.findByText('{"a":0,"b":1}')
  unmount()

  render(<Component2 />)
  await screen.findByText('{"a":0,"b":1}')
})
