import { StrictMode, useEffect, useRef } from 'react'
import { expect, it, jest } from '@jest/globals'
import { fireEvent, render } from '@testing-library/react'
import { useAtom } from 'jotai/react'
import { useHydrateAtoms } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

it('useHydrateAtoms should only hydrate on first render', async () => {
  const countAtom = atom(0)

  const Counter = ({ initialCount }: { initialCount: number }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue, setCount] = useAtom(countAtom)

    return (
      <>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </>
    )
  }
  const { findByText, getByText, rerender } = render(
    <StrictMode>
      <Counter initialCount={42} />
    </StrictMode>
  )

  await findByText('count: 42')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')

  rerender(
    <StrictMode>
      <Counter initialCount={65} />
    </StrictMode>
  )
  await findByText('count: 43')
})

it('useHydrateAtoms should not trigger unnessesary rerenders', async () => {
  const countAtom = atom(0)

  const Counter = ({ initialCount }: { initialCount: number }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue, setCount] = useAtom(countAtom)
    const commitCount = useRef(1)
    useEffect(() => {
      ++commitCount.current
    })
    return (
      <>
        <div>commits: {commitCount.current}</div>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <>
      <Counter initialCount={42} />
    </>
  )

  await findByText('count: 42')
  await findByText('commits: 1')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')
  await findByText('commits: 2')
})

it('useHydrateAtoms should work with derived atoms', async () => {
  const countAtom = atom(0)
  const doubleAtom = atom((get) => get(countAtom) * 2)

  const Counter = ({ initialCount }: { initialCount: number }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue, setCount] = useAtom(countAtom)
    const [doubleCount] = useAtom(doubleAtom)
    return (
      <>
        <div>count: {countValue}</div>
        <div>doubleCount: {doubleCount}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Counter initialCount={42} />
    </StrictMode>
  )

  await findByText('count: 42')
  await findByText('doubleCount: 84')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')
  await findByText('doubleCount: 86')
})

it('useHydrateAtoms can only restore an atom once', async () => {
  const countAtom = atom(0)

  const Counter = ({ initialCount }: { initialCount: number }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue, setCount] = useAtom(countAtom)

    return (
      <>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </>
    )
  }
  const Counter2 = ({ count }: { count: number }) => {
    useHydrateAtoms([[countAtom, count]])
    const [countValue, setCount] = useAtom(countAtom)

    return (
      <>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </>
    )
  }
  const { findByText, getByText, rerender } = render(
    <StrictMode>
      <Counter initialCount={42} />
    </StrictMode>
  )

  await findByText('count: 42')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')

  rerender(
    <StrictMode>
      <Counter2 count={65} />
    </StrictMode>
  )

  await findByText('count: 43')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 44')
})

it('useHydrateAtoms can only restore an atom once', async () => {
  const countAtom = atom(0)

  const Counter = ({ initialCount }: { initialCount: number }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue, setCount] = useAtom(countAtom)

    return (
      <>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </>
    )
  }
  const Counter2 = ({ count }: { count: number }) => {
    useHydrateAtoms([[countAtom, count]])
    const [countValue, setCount] = useAtom(countAtom)

    return (
      <>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </>
    )
  }
  const { findByText, getByText, rerender } = render(
    <StrictMode>
      <Counter initialCount={42} />
    </StrictMode>
  )

  await findByText('count: 42')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')

  rerender(
    <StrictMode>
      <Counter2 count={65} />
    </StrictMode>
  )

  await findByText('count: 43')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 44')
})

it('useHydrateAtoms should respect onMount', async () => {
  const countAtom = atom(0)
  const onMountFn = jest.fn(() => {})
  countAtom.onMount = onMountFn

  const Counter = ({ initialCount }: { initialCount: number }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue] = useAtom(countAtom)

    return <div>count: {countValue}</div>
  }
  const { findByText } = render(
    <>
      <Counter initialCount={42} />
    </>
  )

  await findByText('count: 42')
  expect(onMountFn).toBeCalledTimes(1)
})
