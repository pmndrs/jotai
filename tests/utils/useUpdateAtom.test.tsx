import { StrictMode, useEffect, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom } from '../../src/index'
import { useUpdateAtom } from '../../src/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

const useRerenderCount = () => {
  const rerenderCountRef = useRef(0)
  useEffect(() => {
    rerenderCountRef.current += 1
  })
  return rerenderCountRef.current
}

it('useUpdateAtom does not trigger rerender in component', async () => {
  const countAtom = atom(0)

  const Displayer = () => {
    const [count] = useAtom(countAtom)
    const rerenders = useRerenderCount()
    return (
      <div>
        count: {count}, rerenders: {rerenders}
      </div>
    )
  }

  const Updater = () => {
    const setCount = useUpdateAtom(countAtom)
    const rerenders = useRerenderCount()
    return (
      <>
        <button onClick={() => setCount((value) => value + 1)}>
          increment
        </button>
        <div>updater rerenders: {rerenders}</div>
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
    <StrictMode>
      <Provider>
        <Parent />
      </Provider>
    </StrictMode>
  )

  await waitFor(() => {
    getByText('count: 0, rerenders: 0')
    getByText('updater rerenders: 0')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 1, rerenders: 1')
    getByText('updater rerenders: 0')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 2, rerenders: 2')
    getByText('updater rerenders: 0')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 3, rerenders: 3')
    getByText('updater rerenders: 0')
  })
})

it('useUpdateAtom with scope', async () => {
  const scope = Symbol()
  const countAtom = atom(0)
  countAtom.scope = scope

  const Displayer = () => {
    const [count] = useAtom(countAtom)
    return <div>count: {count}</div>
  }

  const Updater = () => {
    const setCount = useUpdateAtom(countAtom)
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
