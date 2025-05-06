import { StrictMode, useEffect, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { it } from 'vitest'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  return commitCountRef.current
}

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

  await waitFor(() => {
    screen.getByText('count: 0, commits: 1')
    screen.getByText('updater commits: 1')
  })
  await userEvent.click(screen.getByText('increment'))
  await waitFor(() => {
    screen.getByText('count: 1, commits: 2')
    screen.getByText('updater commits: 1')
  })
  await userEvent.click(screen.getByText('increment'))
  await waitFor(() => {
    screen.getByText('count: 2, commits: 3')
    screen.getByText('updater commits: 1')
  })
  await userEvent.click(screen.getByText('increment'))
  await waitFor(() => {
    screen.getByText('count: 3, commits: 4')
    screen.getByText('updater commits: 1')
  })
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

  await waitFor(() => {
    screen.getByText('count: 0')
  })
  await userEvent.click(screen.getByText('increment'))
  await waitFor(() => {
    screen.getByText('count: 1')
  })
})
