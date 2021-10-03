import { StrictMode, useEffect, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom } from 'jotai'
import { useUpdateAtom } from 'jotai/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  return commitCountRef.current
}

it('useUpdateAtom does not trigger rerender in component', async () => {
  const countAtom = atom(0)

  const Displayer = () => {
    const [count] = useAtom(countAtom)
    const commits = useCommitCount()
    return (
      <div>
        count: {count}, commits: {commits}
      </div>
    )
  }

  const Updater = () => {
    const setCount = useUpdateAtom(countAtom)
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

  const { getByText } = render(
    <>
      <Provider>
        <Parent />
      </Provider>
    </>
  )

  await waitFor(() => {
    getByText('count: 0, commits: 1')
    getByText('updater commits: 1')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 1, commits: 2')
    getByText('updater commits: 1')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 2, commits: 3')
    getByText('updater commits: 1')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 3, commits: 4')
    getByText('updater commits: 1')
  })
})

it('useUpdateAtom with scope', async () => {
  const scope = Symbol()
  const countAtom = atom(0)

  const Displayer = () => {
    const [count] = useAtom(countAtom, scope)
    return <div>count: {count}</div>
  }

  const Updater = () => {
    const setCount = useUpdateAtom(countAtom, scope)
    return (
      <button onClick={() => setCount((value) => value + 1)}>increment</button>
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

  const { getByText } = render(
    <StrictMode>
      <Provider scope={scope}>
        <Parent />
      </Provider>
    </StrictMode>
  )

  await waitFor(() => {
    getByText('count: 0')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 1')
  })
})

it('useUpdateAtom with write without an argument', async () => {
  const countAtom = atom(0)
  const incrementCountAtom = atom(null, (get, set) =>
    set(countAtom, get(countAtom) + 1)
  )

  const Button = ({ cb, children }: PropsWithChildren<{ cb: () => void }>) => (
    <button onClick={cb}>{children}</button>
  )

  const Displayer = () => {
    const [count] = useAtom(countAtom)
    return <div>count: {count}</div>
  }

  const Updater = () => {
    const setCount = useUpdateAtom(incrementCountAtom)
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
  const { getByText } = render(
    <StrictMode>
      <Provider>
        <Parent />
      </Provider>
    </StrictMode>
  )

  await waitFor(() => {
    getByText('count: 0')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 1')
  })
})
