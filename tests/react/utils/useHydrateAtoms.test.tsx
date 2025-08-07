import { StrictMode, useEffect, useRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { useAtom, useAtomValue } from 'jotai/react'
import { useHydrateAtoms } from 'jotai/react/utils'
import type { Atom, PrimitiveAtom, WritableAtom } from 'jotai/vanilla'
import { atom } from 'jotai/vanilla'

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  return commitCountRef.current
}

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
              status === 'fulfilled' ? 'rejected' : 'fulfilled',
            )
          }
        >
          update
        </button>
      </>
    )
  }
  const { rerender } = render(
    <StrictMode>
      <Counter initialCount={42} initialStatus="rejected" />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 42')).toBeInTheDocument()
  expect(await screen.findByText('status: rejected')).toBeInTheDocument()
  await userEvent.click(screen.getByText('dispatch'))
  await userEvent.click(screen.getByText('update'))
  expect(await screen.findByText('count: 43')).toBeInTheDocument()
  expect(await screen.findByText('status: fulfilled')).toBeInTheDocument()

  rerender(
    <StrictMode>
      <Counter initialCount={65} initialStatus="rejected" />
    </StrictMode>,
  )
  expect(await screen.findByText('count: 43')).toBeInTheDocument()
  expect(await screen.findByText('status: fulfilled')).toBeInTheDocument()
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
      ]),
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

  const { rerender } = render(
    <StrictMode>
      <Counter initialCount={42} />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 42')).toBeInTheDocument()
  expect(await screen.findByText('is active: no')).toBeInTheDocument()
  await userEvent.click(screen.getByText('dispatch'))
  expect(await screen.findByText('count: 43')).toBeInTheDocument()

  rerender(
    <StrictMode>
      <Counter initialCount={65} initialActive={true} />
    </StrictMode>,
  )
  expect(await screen.findByText('count: 43')).toBeInTheDocument()
  expect(await screen.findByText('is active: no')).toBeInTheDocument()
})

it('useHydrateAtoms should not trigger unnecessary re-renders', async () => {
  const countAtom = atom(0)

  const Counter = ({ initialCount }: { initialCount: number }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue, setCount] = useAtom(countAtom)
    const commits = useCommitCount()
    return (
      <>
        <div>commits: {commits}</div>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </>
    )
  }

  render(
    <>
      <Counter initialCount={42} />
    </>,
  )

  expect(await screen.findByText('count: 42')).toBeInTheDocument()
  expect(await screen.findByText('commits: 1')).toBeInTheDocument()
  await userEvent.click(screen.getByText('dispatch'))
  expect(await screen.findByText('count: 43')).toBeInTheDocument()
  expect(await screen.findByText('commits: 2')).toBeInTheDocument()
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

  render(
    <StrictMode>
      <Counter initialCount={42} />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 42')).toBeInTheDocument()
  expect(await screen.findByText('doubleCount: 84')).toBeInTheDocument()
  await userEvent.click(screen.getByText('dispatch'))
  expect(await screen.findByText('count: 43')).toBeInTheDocument()
  expect(await screen.findByText('doubleCount: 86')).toBeInTheDocument()
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

  const { rerender } = render(
    <StrictMode>
      <Counter initialCount={42} />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 42')).toBeInTheDocument()
  await userEvent.click(screen.getByText('dispatch'))
  expect(await screen.findByText('count: 43')).toBeInTheDocument()

  rerender(
    <StrictMode>
      <Counter2 count={65} />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 43')).toBeInTheDocument()
  await userEvent.click(screen.getByText('dispatch'))
  expect(await screen.findByText('count: 44')).toBeInTheDocument()
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

  render(
    <>
      <Counter initialCount={42} />
    </>,
  )

  expect(await screen.findByText('count: 42')).toBeInTheDocument()
  expect(onMountFn).toHaveBeenCalledTimes(1)
})

it('passing dangerouslyForceHydrate to useHydrateAtoms will re-hydrated atoms', async () => {
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
      },
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
              status === 'fulfilled' ? 'rejected' : 'fulfilled',
            )
          }
        >
          update
        </button>
      </>
    )
  }

  const { rerender } = render(
    <StrictMode>
      <Counter initialCount={42} initialStatus="rejected" />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 42')).toBeInTheDocument()
  expect(await screen.findByText('status: rejected')).toBeInTheDocument()
  await userEvent.click(screen.getByText('dispatch'))
  await userEvent.click(screen.getByText('update'))
  expect(await screen.findByText('count: 43')).toBeInTheDocument()
  expect(await screen.findByText('status: fulfilled')).toBeInTheDocument()

  rerender(
    <StrictMode>
      <Counter initialCount={65} initialStatus="rejected" />
    </StrictMode>,
  )
  expect(await screen.findByText('count: 43')).toBeInTheDocument()
  expect(await screen.findByText('status: fulfilled')).toBeInTheDocument()

  rerender(
    <StrictMode>
      <Counter
        initialCount={11}
        initialStatus="rejected"
        dangerouslyForceHydrate={true}
      />
    </StrictMode>,
  )
  expect(await screen.findByText('count: 11')).toBeInTheDocument()
  expect(await screen.findByText('status: rejected')).toBeInTheDocument()
})

// types-only tests
it('types: useHydrateAtoms should enforce tuple/value/args types', () => {
  const numberAtom = {} as PrimitiveAtom<number>
  const booleanAtom = {} as PrimitiveAtom<boolean>
  const stringUnionAtom = {} as PrimitiveAtom<'pending' | 'fulfilled'>
  const readOnlyAtom = {} as Atom<number>
  const writeOnlySingleNumberAtom = {} as WritableAtom<number, [number], void>
  const writeOnlyDoubleNumberAtom = {} as WritableAtom<
    number,
    [number, number],
    void
  >

  // positive cases (should type-check)
  /* eslint-disable @typescript-eslint/no-unused-expressions */
  ;() =>
    useHydrateAtoms([
      [numberAtom, 1],
      [booleanAtom, true],
      [stringUnionAtom, 'fulfilled'],
    ] as const)
  ;() => useHydrateAtoms([[writeOnlySingleNumberAtom, 2]])
  ;() => useHydrateAtoms([[writeOnlyDoubleNumberAtom, 1, 2]])
  ;() =>
    useHydrateAtoms(
      new Map<
        typeof numberAtom | typeof stringUnionAtom,
        number | 'pending' | 'fulfilled'
      >([
        [numberAtom, 123],
        [stringUnionAtom, 'pending'],
      ]),
    )
  type AnyWritableAtom = WritableAtom<unknown, unknown[], unknown>
  ;() => useHydrateAtoms([] as (readonly [AnyWritableAtom, unknown])[])

  // negative cases (should fail type-check)
  // @ts-expect-error wrong value type for primitive atom
  ;() => useHydrateAtoms([[numberAtom, 'oops']])
  // @ts-expect-error wrong value type for boolean atom
  ;() => useHydrateAtoms([[booleanAtom, 0]])
  // @ts-expect-error read-only atom is not writable [SKIP-TS-4.2.3] [SKIP-TS-4.1.5] [SKIP-TS-4.0.5] [SKIP-TS-3.9.7]
  ;() => useHydrateAtoms([[readOnlyAtom, 1]])
  // @ts-expect-error wrong arg type for writable derived atom
  ;() => useHydrateAtoms([[writeOnlySingleNumberAtom, 'x']])
  // @ts-expect-error missing one arg for writable derived with two args
  ;() => useHydrateAtoms([[writeOnlyDoubleNumberAtom, 1]])
  // @ts-expect-error too many args for writable derived with two args
  ;() => useHydrateAtoms([[writeOnlyDoubleNumberAtom, 1, 2, 3]])
  // @ts-expect-error map with read-only atom key [SKIP-TS-4.2.3] [SKIP-TS-4.1.5] [SKIP-TS-4.0.5] [SKIP-TS-3.9.7]
  ;() => useHydrateAtoms(new Map([[readOnlyAtom, 1]]))
  /* eslint-enable @typescript-eslint/no-unused-expressions */
})
