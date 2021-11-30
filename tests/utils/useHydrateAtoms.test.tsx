import React, { useEffect, useRef } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, useAtom } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('useHydrateAtoms should only hydrate on first render', async () => {
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
  const { findByText, getByText, rerender } = render(
    <Provider>
      <Counter initialCount={42} />
    </Provider>
  )

  await findByText('count: 42')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')

  rerender(
    <Provider>
      <Counter initialCount={65} />
    </Provider>
  )
  await findByText('count: 43')
})

it('useHydrateAtoms should not trigger unnessesary rerenders', async () => {
  const countAtom = atom(0)

  const Counter = ({ initialCount }: { initialCount: number }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue, setCount] = useAtom(countAtom)
    const commitCount = useRef(1)
    useEffect(() => {
      ++commitCount.current
    })
    return (
      <>
        <div>commits: {commitCount.current}</div>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Counter initialCount={42} />
    </Provider>
  )

  await findByText('count: 42')
  await findByText('commits: 1')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')
  await findByText('commits: 2')
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

  const { findByText, getByText } = render(
    <Provider>
      <Counter initialCount={42} />
    </Provider>
  )

  await findByText('count: 42')
  await findByText('doubleCount: 84')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')
  await findByText('doubleCount: 86')
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
  const { findByText, getByText, rerender } = render(
    <Provider>
      <Counter initialCount={42} />
    </Provider>
  )

  await findByText('count: 42')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')

  rerender(
    <Provider>
      <Counter2 count={65} />
    </Provider>
  )

  await findByText('count: 43')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 44')
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
  const { findByText, getByText, rerender } = render(
    <Provider>
      <Counter initialCount={42} />
    </Provider>
  )

  await findByText('count: 42')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')

  rerender(
    <Provider>
      <Counter2 count={65} />
    </Provider>
  )

  await findByText('count: 43')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 44')
})

it('useHydrateAtoms should respect onMount', async () => {
  const countAtom = atom(0)
  const onMountFn = jest.fn()
  countAtom.onMount = onMountFn

  const Counter = ({ initialCount }: { initialCount: number }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue] = useAtom(countAtom)

    return <div>count: {countValue}</div>
  }
  const { findByText } = render(
    <Provider>
      <Counter initialCount={42} />
    </Provider>
  )

  await findByText('count: 42')
  expect(onMountFn).toBeCalledTimes(1)
})

it('useHydrateAtoms should let you hydrate an atom once per scope', async () => {
  const scope = Symbol()
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
  const Counter2 = ({ initialCount }: { initialCount: number }) => {
    useHydrateAtoms([[countAtom, initialCount]], scope)
    const [countValue, setCount] = useAtom(countAtom, scope)

    return (
      <>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>
          dispatch2
        </button>
      </>
    )
  }
  const { findByText, getByText } = render(
    <>
      <Provider>
        <Counter initialCount={42} />
      </Provider>
      <Provider scope={scope}>
        <Counter2 initialCount={65} />
      </Provider>
    </>
  )

  await findByText('count: 42')
  await findByText('count: 65')
  fireEvent.click(getByText('dispatch'))
  fireEvent.click(getByText('dispatch2'))
  await findByText('count: 43')
  await findByText('count: 66')
})
