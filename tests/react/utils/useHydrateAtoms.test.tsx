import { StrictMode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useAtom, useAtomValue } from 'jotai/react'
import { useHydrateAtoms } from 'jotai/react/utils'
import type { Atom, PrimitiveAtom, WritableAtom } from 'jotai/vanilla'
import { atom } from 'jotai/vanilla'
import { useCommitCount } from '../../test-utils'

it('useHydrateAtoms should only hydrate on first render', () => {
  const countAtom = atom(0)
  const statusAtom = atom('fulfilled')

  const Counter = ({
    initialCount,
    initialStatus,
  }: {
    initialCount: number
    initialStatus: string
  }) => {
    // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
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

  expect(screen.getByText('count: 42')).toBeInTheDocument()
  expect(screen.getByText('status: rejected')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  fireEvent.click(screen.getByText('update'))
  expect(screen.getByText('count: 43')).toBeInTheDocument()
  expect(screen.getByText('status: fulfilled')).toBeInTheDocument()

  rerender(
    <StrictMode>
      <Counter initialCount={65} initialStatus="rejected" />
    </StrictMode>,
  )

  expect(screen.getByText('count: 43')).toBeInTheDocument()
  expect(screen.getByText('status: fulfilled')).toBeInTheDocument()
})

it('useHydrateAtoms should only hydrate on first render using a Map', () => {
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

  expect(screen.getByText('count: 42')).toBeInTheDocument()
  expect(screen.getByText('is active: no')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('count: 43')).toBeInTheDocument()

  rerender(
    <StrictMode>
      <Counter initialCount={65} initialActive={true} />
    </StrictMode>,
  )

  expect(screen.getByText('count: 43')).toBeInTheDocument()
  expect(screen.getByText('is active: no')).toBeInTheDocument()
})

it('useHydrateAtoms should not trigger unnecessary re-renders', () => {
  const countAtom = atom(0)

  const Counter = ({ initialCount }: { initialCount: number }) => {
    // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
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

  expect(screen.getByText('count: 42')).toBeInTheDocument()
  expect(screen.getByText('commits: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('count: 43')).toBeInTheDocument()
  expect(screen.getByText('commits: 2')).toBeInTheDocument()
})

it('useHydrateAtoms should work with derived atoms', () => {
  const countAtom = atom(0)
  const doubleAtom = atom((get) => get(countAtom) * 2)

  const Counter = ({ initialCount }: { initialCount: number }) => {
    // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
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

  expect(screen.getByText('count: 42')).toBeInTheDocument()
  expect(screen.getByText('doubleCount: 84')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('count: 43')).toBeInTheDocument()
  expect(screen.getByText('doubleCount: 86')).toBeInTheDocument()
})

it('useHydrateAtoms can only restore an atom once', () => {
  const countAtom = atom(0)

  const Counter = ({ initialCount }: { initialCount: number }) => {
    // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
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
    // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
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

  expect(screen.getByText('count: 42')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('count: 43')).toBeInTheDocument()

  rerender(
    <StrictMode>
      <Counter2 count={65} />
    </StrictMode>,
  )

  expect(screen.getByText('count: 43')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('count: 44')).toBeInTheDocument()
})

it('useHydrateAtoms should respect onMount', () => {
  const countAtom = atom(0)
  const onMountFn = vi.fn(() => {})
  countAtom.onMount = onMountFn

  const Counter = ({ initialCount }: { initialCount: number }) => {
    // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue] = useAtom(countAtom)

    return <div>count: {countValue}</div>
  }

  render(
    <>
      <Counter initialCount={42} />
    </>,
  )

  expect(screen.getByText('count: 42')).toBeInTheDocument()
  expect(onMountFn).toHaveBeenCalledTimes(1)
})

it('passing dangerouslyForceHydrate to useHydrateAtoms will re-hydrated atoms', () => {
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
      // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
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

  expect(screen.getByText('count: 42')).toBeInTheDocument()
  expect(screen.getByText('status: rejected')).toBeInTheDocument()

  fireEvent.click(screen.getByText('dispatch'))
  fireEvent.click(screen.getByText('update'))
  expect(screen.getByText('count: 43')).toBeInTheDocument()
  expect(screen.getByText('status: fulfilled')).toBeInTheDocument()

  rerender(
    <StrictMode>
      <Counter initialCount={65} initialStatus="rejected" />
    </StrictMode>,
  )
  expect(screen.getByText('count: 43')).toBeInTheDocument()
  expect(screen.getByText('status: fulfilled')).toBeInTheDocument()

  rerender(
    <StrictMode>
      <Counter
        initialCount={11}
        initialStatus="rejected"
        dangerouslyForceHydrate={true}
      />
    </StrictMode>,
  )

  expect(screen.getByText('count: 11')).toBeInTheDocument()
  expect(screen.getByText('status: rejected')).toBeInTheDocument()
})

// types-only tests
// eslint-disable-next-line vitest/expect-expect
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
    // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    useHydrateAtoms([
      [numberAtom, 1],
      [booleanAtom, true],
      [stringUnionAtom, 'fulfilled'],
    ] as const)
  // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  ;() => useHydrateAtoms([[writeOnlySingleNumberAtom, 2]])
  // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  ;() => useHydrateAtoms([[writeOnlyDoubleNumberAtom, 1, 2]])
  ;() =>
    // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
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
  // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  ;() => useHydrateAtoms([] as (readonly [AnyWritableAtom, unknown])[])

  // negative cases (should fail type-check)
  // @ts-expect-error wrong value type for primitive atom [SKIP-TS-3.9.7]
  // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  ;() => useHydrateAtoms([[numberAtom, 'oops']])
  // @ts-expect-error wrong value type for boolean atom [SKIP-TS-3.9.7]
  // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  ;() => useHydrateAtoms([[booleanAtom, 0]])
  // @ts-expect-error read-only atom is not writable [SKIP-TS-4.2.3] [SKIP-TS-4.1.5] [SKIP-TS-4.0.5] [SKIP-TS-3.9.7]
  // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  ;() => useHydrateAtoms([[readOnlyAtom, 1]])
  // @ts-expect-error wrong arg type for writable derived atom [SKIP-TS-3.9.7]
  // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  ;() => useHydrateAtoms([[writeOnlySingleNumberAtom, 'x']])
  // @ts-expect-error missing one arg for writable derived with two args [SKIP-TS-3.9.7]
  // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  ;() => useHydrateAtoms([[writeOnlyDoubleNumberAtom, 1]])
  // @ts-expect-error too many args for writable derived with two args [SKIP-TS-3.9.7]
  // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  ;() => useHydrateAtoms([[writeOnlyDoubleNumberAtom, 1, 2, 3]])
  // @ts-expect-error map with read-only atom key [SKIP-TS-4.2.3] [SKIP-TS-4.1.5] [SKIP-TS-4.0.5] [SKIP-TS-3.9.7]
  // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  ;() => useHydrateAtoms(new Map([[readOnlyAtom, 1]]))
  /* eslint-enable @typescript-eslint/no-unused-expressions */
})
