import { StrictMode } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useAtom } from 'jotai/react'
import { useAtomValueMemo } from 'jotai/react/utils/useAtomMemo'
import { atom } from 'jotai/vanilla'

it('useAtomValueMemo with object', async () => {
  const countAtom = atom({
    count: 0,
    unused: 0,
  })

  const Counter = () => {
    const [{ count }, setCount] = useAtom(countAtom)
    return (
      <>
        <div>atom count: {count}</div>
        <button
          onClick={() =>
            setCount((c) => ({
              ...c,
              count: c.count + 1,
            }))
          }
        >
          dispatch
        </button>
      </>
    )
  }

  let unusedRenderCount = 0
  let usedRenderCount = 0
  const Unused = () => {
    unusedRenderCount += 1
    const { unused } = useAtomValueMemo(countAtom)
    return (
      <>
        <div>unused count: {unused}</div>
      </>
    )
  }

  const Used = () => {
    usedRenderCount += 1
    const { count } = useAtomValueMemo(countAtom)
    return (
      <>
        <div>used count: {count}</div>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Counter />
      <Unused />
      <Used />
    </StrictMode>,
  )

  await findByText('atom count: 0')
  fireEvent.click(getByText('dispatch'))
  await waitFor(() => {
    getByText('atom count: 1')
  })
  await waitFor(() => {
    getByText('unused count: 0')
  })
  await waitFor(() => {
    getByText('used count: 1')
  })
  fireEvent.click(getByText('dispatch'))
  fireEvent.click(getByText('dispatch'))
  fireEvent.click(getByText('dispatch'))
  await waitFor(() => {
    getByText('atom count: 4')
  })
  await waitFor(() => {
    getByText('unused count: 0')
  })
  await waitFor(() => {
    getByText('used count: 4')
  })
  expect(unusedRenderCount).toBeLessThan(usedRenderCount)
  // on StrictMode, callback inside `setState` is called twice
  expect(usedRenderCount - unusedRenderCount).toBe(4 * 2)
})
