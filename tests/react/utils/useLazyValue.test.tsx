import { StrictMode } from 'react'
import { expect, it, jest } from '@jest/globals'
import { fireEvent, render } from '@testing-library/react'
import { useAtom } from 'jotai/react'
import { useLazyValue } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

it('useLazyValue smoke test', async () => {
  const testAtom = atom(0)
  const onClick = jest.fn()

  let parentRenders = 0

  const Parent = () => {
    const cb = useLazyValue(testAtom)

    parentRenders += 1

    return (
      <>
        <button onClick={() => onClick(cb())}>read</button>
      </>
    )
  }

  const Sibling = () => {
    const [count, setCount] = useAtom(testAtom)

    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>update</button>
      </>
    )
  }

  const { getByText } = render(
    <StrictMode>
      <Parent />
      <Sibling />
    </StrictMode>
  )

  fireEvent.click(getByText('update'))
  fireEvent.click(getByText('update'))
  fireEvent.click(getByText('update'))
  fireEvent.click(getByText('update'))
  fireEvent.click(getByText('update'))
  fireEvent.click(getByText('read'))

  expect(onClick).toHaveBeenCalledWith(5)

  // strict mode renders twice
  expect(parentRenders).toBe(2)
})
