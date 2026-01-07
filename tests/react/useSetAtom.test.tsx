import { StrictMode } from 'react'
import type { PropsWithChildren } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, onTestFinished, vi } from 'vitest'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import { useCommitCount } from '../test-utils'

it('useSetAtom does not trigger rerender in component', async () => {
  const countAtom = atom(0)

  const Displayer = () => {
    const count = useAtomValue(countAtom)
    const commits = useCommitCount()
    return (
      <div>
        count: {count}, commits: {commits}
      </div>
    )
  }

  const Updater = () => {
    const setCount = useSetAtom(countAtom)
    const commits = useCommitCount()
    return (
      <>
        <button onClick={() => setCount((value) => value + 1)}>
          increment
        </button>
        <div>updater commits: {commits}</div>
      </>
    )
  }

  const Parent = () => {
    return (
      <>
        <Displayer />
        <Updater />
      </>
    )
  }

  render(
    <>
      <Parent />
    </>,
  )

  expect(screen.getByText('count: 0, commits: 1')).toBeInTheDocument()
  expect(screen.getByText('updater commits: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment'))
  expect(screen.getByText('count: 1, commits: 2')).toBeInTheDocument()
  expect(screen.getByText('updater commits: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment'))
  expect(screen.getByText('count: 2, commits: 3')).toBeInTheDocument()
  expect(screen.getByText('updater commits: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment'))
  expect(screen.getByText('count: 3, commits: 4')).toBeInTheDocument()
  expect(screen.getByText('updater commits: 1')).toBeInTheDocument()
})

it('useSetAtom with write without an argument', async () => {
  const countAtom = atom(0)
  const incrementCountAtom = atom(null, (get, set) =>
    set(countAtom, get(countAtom) + 1),
  )

  const Button = ({ cb, children }: PropsWithChildren<{ cb: () => void }>) => (
    <button onClick={cb}>{children}</button>
  )

  const Displayer = () => {
    const count = useAtomValue(countAtom)
    return <div>count: {count}</div>
  }

  const Updater = () => {
    const setCount = useSetAtom(incrementCountAtom)
    return <Button cb={setCount}>increment</Button>
  }

  const Parent = () => {
    return (
      <>
        <Displayer />
        <Updater />
      </>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('increment'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
})

it('useSetAtom throws when called with a read-only atom', () => {
  vi.stubEnv('MODE', 'development')
  onTestFinished(() => {
    vi.unstubAllEnvs()
  })

  const countAtom = atom(0)
  const readOnlyAtom = atom((get) => get(countAtom))

  let setAtomFn: ((v: number) => void) | undefined

  function TestComponent() {
    // eslint-disable-next-line react-hooks/globals
    setAtomFn = useSetAtom(readOnlyAtom as any)
    return null
  }

  render(<TestComponent />)

  expect(setAtomFn).toBeDefined()
  expect(() => act(() => setAtomFn!(1))).toThrowError('not writable atom')
})
