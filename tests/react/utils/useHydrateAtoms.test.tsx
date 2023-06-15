import { StrictMode, useEffect, useRef } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useAtom, useAtomValue } from 'jotai/react'
import { useHydrateAtoms } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

it('useHydrateAtoms should only hydrate on first render', async () => {
  const countAtom = atom(0)
  const statusAtom = atom('fulfilled')

  const Counter = ({
    initialCount,
    initialStatus,
  }: {
    initialCount: number
    initialStatus: string
  }) => {
    useHydrateAtoms([
      [countAtom, initialCount],
      [statusAtom, initialStatus],
    ])
    const [countValue, setCount] = useAtom(countAtom)
    const [statusValue, setStatus] = useAtom(statusAtom)

    return (
      <>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
        <div>status: {statusValue}</div>
        <button
          onClick={() =>
            setStatus((status) =>
              status === 'fulfilled' ? 'rejected' : 'fulfilled'
            )
          }>
          update
        </button>
      </>
    )
  }
  const { findByText, getByText, rerender } = render(
    <StrictMode>
      <Counter initialCount={42} initialStatus="rejected" />
    </StrictMode>
  )

  await findByText('count: 42')
  await findByText('status: rejected')
  fireEvent.click(getByText('dispatch'))
  fireEvent.click(getByText('update'))
  await findByText('count: 43')
  await findByText('status: fulfilled')

  rerender(
    <StrictMode>
      <Counter initialCount={65} initialStatus="rejected" />
    </StrictMode>
  )
  await findByText('count: 43')
  await findByText('status: fulfilled')
})

it('useHydrateAtoms should only hydrate on first render using a Map', async () => {
  const countAtom = atom(0)
  const activeAtom = atom(true)

  const Counter = ({
    initialActive = false,
    initialCount,
  }: {
    initialActive?: boolean
    initialCount: number
  }) => {
    useHydrateAtoms(
      new Map<
        typeof activeAtom | typeof countAtom,
        typeof initialActive | typeof initialCount
      >([
        [activeAtom, initialActive],
        [countAtom, initialCount],
      ])
    )
    const activeValue = useAtomValue(activeAtom)
    const [countValue, setCount] = useAtom(countAtom)

    return (
      <>
        <div>is active: {activeValue ? 'yes' : 'no'}</div>
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
  await findByText('is active: no')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')

  rerender(
    <StrictMode>
      <Counter initialCount={65} initialActive={true} />
    </StrictMode>
  )
  await findByText('count: 43')
  await findByText('is active: no')
})

it('useHydrateAtoms should not trigger unnecessary re-renders', async () => {
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

it('useHydrateAtoms should respect onMount', async () => {
  const countAtom = atom(0)
  const onMountFn = vi.fn(() => {})
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
  expect(onMountFn).toHaveBeenCalledTimes(1)
})

it.only('passing dangerouslyForceHydrate to useHydrateAtoms will re-hydrated atoms', async () => {
  const countAtom = atom(0)
  const statusAtom = atom('fulfilled')

  const Counter = ({
    initialCount,
    initialStatus,
    dangerouslyForceHydrate = false,
  }: {
    initialCount: number
    initialStatus: string
    dangerouslyForceHydrate?: boolean
  }) => {
    useHydrateAtoms(
      [
        [countAtom, initialCount],
        [statusAtom, initialStatus],
      ],
      {
        dangerouslyForceHydrate,
      }
    )
    const [countValue, setCount] = useAtom(countAtom)
    const [statusValue, setStatus] = useAtom(statusAtom)

    return (
      <>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
        <div>status: {statusValue}</div>
        <button
          onClick={() =>
            setStatus((status) =>
              status === 'fulfilled' ? 'rejected' : 'fulfilled'
            )
          }>
          update
        </button>
      </>
    )
  }
  const { findByText, getByText, rerender } = render(
    <StrictMode>
      <Counter initialCount={42} initialStatus="rejected" />
    </StrictMode>
  )

  await findByText('count: 42')
  await findByText('status: rejected')
  fireEvent.click(getByText('dispatch'))
  fireEvent.click(getByText('update'))
  await findByText('count: 43')
  await findByText('status: fulfilled')

  rerender(
    <StrictMode>
      <Counter initialCount={65} initialStatus="rejected" />
    </StrictMode>
  )
  await findByText('count: 43')
  await findByText('status: fulfilled')

  rerender(
    <StrictMode>
      <Counter
        initialCount={11}
        initialStatus="rejected"
        dangerouslyForceHydrate={true}
      />
    </StrictMode>
  )
  await findByText('count: 11')
  await findByText('status: rejected')
})
