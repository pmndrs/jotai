import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

it('only relevant render function called (#156)', async () => {
  const count1Atom = atom(0)
  const count2Atom = atom(0)

  let viewCount1 = 0
  let viewCount2 = 0

  const Counter1 = () => {
    const [count, setCount] = useAtom(count1Atom)
    ++viewCount1
    return (
      <>
        <div>count1: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button1</button>
      </>
    )
  }

  const Counter2 = () => {
    const [count, setCount] = useAtom(count2Atom)
    ++viewCount2
    return (
      <>
        <div>count2: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button2</button>
      </>
    )
  }

  render(
    <>
      <Counter1 />
      <Counter2 />
    </>,
  )

  expect(screen.getByText('count1: 0')).toBeInTheDocument()
  expect(screen.getByText('count2: 0')).toBeInTheDocument()

  const viewCount1AfterMount = viewCount1
  const viewCount2AfterMount = viewCount2

  await userEvent.click(screen.getByText('button1'))

  expect(screen.getByText('count1: 1')).toBeInTheDocument()
  expect(screen.getByText('count2: 0')).toBeInTheDocument()

  expect(viewCount1).toBe(viewCount1AfterMount + 1)
  expect(viewCount2).toBe(viewCount2AfterMount + 0)

  await userEvent.click(screen.getByText('button2'))

  expect(screen.getByText('count1: 1')).toBeInTheDocument()
  expect(screen.getByText('count2: 1')).toBeInTheDocument()

  expect(viewCount1).toBe(viewCount1AfterMount + 1)
  expect(viewCount2).toBe(viewCount2AfterMount + 1)
})

it('only render once using atoms with write-only atom', async () => {
  const count1Atom = atom(0)
  const count2Atom = atom(0)
  const incrementAtom = atom(null, (_get, set, _arg) => {
    set(count1Atom, (c) => c + 1)
    set(count2Atom, (c) => c + 1)
  })

  let viewCount = 0

  const Counter = () => {
    const [count1] = useAtom(count1Atom)
    const [count2] = useAtom(count2Atom)
    ++viewCount
    return (
      <div>
        count1: {count1}, count2: {count2}
      </div>
    )
  }

  const Control = () => {
    const [, increment] = useAtom(incrementAtom)
    return <button onClick={increment}>button</button>
  }

  render(
    <>
      <Counter />
      <Control />
    </>,
  )

  await screen.findByText('count1: 0, count2: 0')
  const viewCountAfterMount = viewCount

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('count1: 1, count2: 1')
  expect(viewCount).toBe(viewCountAfterMount + 1)

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('count1: 2, count2: 2')
  expect(viewCount).toBe(viewCountAfterMount + 2)
})

it('useless re-renders with static atoms (#355)', async () => {
  // check out https://codesandbox.io/s/m82r5 to see the expected re-renders
  const countAtom = atom(0)
  const unrelatedAtom = atom(0)

  let viewCount = 0

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    useAtom(unrelatedAtom)
    ++viewCount

    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  render(
    <>
      <Counter />
    </>,
  )

  await screen.findByText('count: 0')
  const viewCountAfterMount = viewCount

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('count: 1')
  expect(viewCount).toBe(viewCountAfterMount + 1)

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('count: 2')
  expect(viewCount).toBe(viewCountAfterMount + 2)
})

it('does not re-render if value is the same (#1158)', async () => {
  const countAtom = atom(0)

  let viewCount = 0

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    ++viewCount
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c)}>noop</button>
        <button onClick={() => setCount((c) => c + 1)}>inc</button>
      </>
    )
  }

  render(
    <>
      <Counter />
    </>,
  )

  await screen.findByText('count: 0')
  const viewCountAfterMount = viewCount

  await userEvent.click(screen.getByText('noop'))
  await screen.findByText('count: 0')
  expect(viewCount).toBe(viewCountAfterMount + 0)

  await userEvent.click(screen.getByText('inc'))
  await screen.findByText('count: 1')
  expect(viewCount).toBe(viewCountAfterMount + 1)

  await userEvent.click(screen.getByText('noop'))
  await screen.findByText('count: 1')
  expect(viewCount).toBe(viewCountAfterMount + 1)

  await userEvent.click(screen.getByText('inc'))
  await screen.findByText('count: 2')
  expect(viewCount).toBe(viewCountAfterMount + 2)
})

it('no extra rerenders after commit with derived atoms (#1213)', async () => {
  const baseAtom = atom({ count1: 0, count2: 0 })
  const count1Atom = atom((get) => get(baseAtom).count1)
  const count2Atom = atom((get) => get(baseAtom).count2)

  let viewCount1 = 0
  let viewCount1AfterCommit = 0

  const Counter1 = () => {
    const [count1] = useAtom(count1Atom)
    ++viewCount1
    useEffect(() => {
      viewCount1AfterCommit = viewCount1
    })
    return <div>count1: {count1}</div>
  }

  let viewCount2 = 0
  let viewCount2AfterCommit = 0

  const Counter2 = () => {
    const [count2] = useAtom(count2Atom)
    ++viewCount2
    useEffect(() => {
      viewCount2AfterCommit = viewCount2
    })
    return <div>count2: {count2}</div>
  }

  const Control = () => {
    const [, setValue] = useAtom(baseAtom)
    const inc1 = () => {
      setValue((prev) => ({ ...prev, count1: prev.count1 + 1 }))
    }
    const inc2 = () => {
      setValue((prev) => ({ ...prev, count2: prev.count2 + 1 }))
    }
    return (
      <div>
        <button onClick={inc1}>inc1</button>
        <button onClick={inc2}>inc2</button>
      </div>
    )
  }

  render(
    <>
      <Counter1 />
      <Counter2 />
      <Control />
    </>,
  )

  await waitFor(() => {
    screen.getByText('count1: 0')
    screen.getByText('count2: 0')
  })
  expect(viewCount1 > 0).toBeTruthy()
  expect(viewCount2 > 0).toBeTruthy()

  await userEvent.click(screen.getByText('inc1'))

  expect(screen.getByText('count1: 1')).toBeInTheDocument()
  expect(screen.getByText('count2: 0')).toBeInTheDocument()

  expect(viewCount1).toBe(viewCount1AfterCommit)

  await userEvent.click(screen.getByText('inc2'))

  expect(screen.getByText('count1: 1')).toBeInTheDocument()
  expect(screen.getByText('count2: 1')).toBeInTheDocument()

  expect(viewCount2).toBe(viewCount2AfterCommit)

  await userEvent.click(screen.getByText('inc1'))

  expect(screen.getByText('count1: 2')).toBeInTheDocument()
  expect(screen.getByText('count2: 1')).toBeInTheDocument()
  expect(viewCount1).toBe(viewCount1AfterCommit)
})
