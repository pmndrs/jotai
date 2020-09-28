import React, { useEffect } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../src/index'

it('does not show async stale result', async () => {
  const countAtom = atom(0)
  const asyncCountAtom = atom(async (get) => {
    await new Promise((r) => setTimeout(r, 100))
    return get(countAtom)
  })

  const committed: number[] = []

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const onClick = async () => {
      setCount((c) => c + 1)
      await new Promise((r) => setTimeout(r, 10))
      setCount((c) => c + 1)
    }
    return (
      <>
        <div>count: {count}</div>
        <button onClick={onClick}>button</button>
      </>
    )
  }

  const DelayedCounter: React.FC = () => {
    const [delayedCount] = useAtom(asyncCountAtom)
    useEffect(() => {
      committed.push(delayedCount)
    })
    return <div>delayedCount: {delayedCount}</div>
  }

  const { getByText, findByText } = render(
    <Provider>
      <React.Suspense fallback="loading">
        <Counter />
      </React.Suspense>
      <React.Suspense fallback="loading">
        <DelayedCounter />
      </React.Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 0')
  await findByText('delayedCount: 0')
  expect(committed).toEqual([0])

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('count: 2')
  await findByText('delayedCount: 2')
  expect(committed).toEqual([0, 2])
})

it('works with async get with extra deps', async () => {
  const countAtom = atom(0)
  const anotherAtom = atom(-1)
  const asyncCountAtom = atom(async (get) => {
    get(anotherAtom)
    await new Promise((r) => setTimeout(r, 10))
    return get(countAtom)
  })

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const DelayedCounter: React.FC = () => {
    const [delayedCount] = useAtom(asyncCountAtom)
    return <div>delayedCount: {delayedCount}</div>
  }

  const { getByText, findByText } = render(
    <Provider>
      <React.Suspense fallback="loading">
        <Counter />
        <DelayedCounter />
      </React.Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 0')
  await findByText('delayedCount: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('count: 1')
  await findByText('delayedCount: 1')
})
