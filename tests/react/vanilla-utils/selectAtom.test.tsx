import { StrictMode, useEffect, useRef } from 'react'
import { render } from '@testing-library/react'
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

  const { findByText, getByText } = render(
    <StrictMode>
      <Parent />
      <Selector />
    </StrictMode>,
  )

  await findByText('a: 0')

  await userEvent.click(getByText('increment'))
  await findByText('a: 1')
  await userEvent.click(getByText('increment'))
  await findByText('a: 2')
  await userEvent.click(getByText('increment'))
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
  await userEvent.click(getByText('copy'))
  await findByText('value: {"a":0}')
  await findByText('commits: 1')

  await userEvent.click(getByText('increment'))
  await findByText('value: {"a":1}')
  await findByText('commits: 2')
  await userEvent.click(getByText('copy'))
  await findByText('value: {"a":1}')
  await findByText('commits: 2')

  await userEvent.click(getByText('increment'))
  await findByText('value: {"a":2}')
  await findByText('commits: 3')
  await userEvent.click(getByText('copy'))
  await findByText('value: {"a":2}')
  await findByText('commits: 3')

  await userEvent.click(getByText('increment'))
  await findByText('value: {"a":3}')
  await findByText('commits: 4')
  await userEvent.click(getByText('copy'))
  await findByText('value: {"a":3}')
  await findByText('commits: 4')
})
