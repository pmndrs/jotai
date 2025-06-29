import { StrictMode, Suspense } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEventOrig from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { useAtom } from 'jotai/react'
import { atomWithRefresh } from 'jotai/vanilla/utils'

const userEvent = {
  click: (element: Element) => act(() => userEventOrig.click(element)),
}

it('sync counter', async () => {
  let counter = 0
  const countAtom = atomWithRefresh(() => ++counter)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount()}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 1')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 2')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 3')).toBeInTheDocument()

  expect(counter).toBe(3)
})

it('async counter', async () => {
  let resolve = () => {}
  let counter = 0
  const countAtom = atomWithRefresh(async () => {
    await new Promise<void>((r) => (resolve = r))
    return ++counter
  })

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount()}>button</button>
      </>
    )
  }

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>,
    )
  })

  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve()
  expect(await screen.findByText('count: 1')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve()
  expect(await screen.findByText('count: 2')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  resolve()
  expect(await screen.findByText('count: 3')).toBeInTheDocument()

  expect(counter).toBe(3)
})

it('writable counter', async () => {
  let counter = 0
  const countAtom = atomWithRefresh(
    () => ++counter,
    (_get, _set, newValue: number) => {
      counter = newValue
    },
  )

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount()}>button</button>
        <button onClick={() => setCount(9)}>set9</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 1')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 2')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 3')).toBeInTheDocument()

  await userEvent.click(screen.getByText('set9'))
  expect(await screen.findByText('count: 3')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 10')).toBeInTheDocument()
})
