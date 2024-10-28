import { StrictMode, Suspense } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { useAtom } from 'jotai/react'
import { atomWithRefresh } from 'jotai/vanilla/utils'

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

  await screen.findByText('count: 1')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('count: 2')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('count: 3')

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

  render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>,
  )

  await screen.findByText('loading')
  resolve()
  await screen.findByText('count: 1')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('loading')
  resolve()
  await screen.findByText('count: 2')

  await userEvent.click(screen.getByText('button'))
  resolve()
  await screen.findByText('count: 3')

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

  await screen.findByText('count: 1')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('count: 2')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('count: 3')

  await userEvent.click(screen.getByText('set9'))
  await screen.findByText('count: 3')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('count: 10')
})
