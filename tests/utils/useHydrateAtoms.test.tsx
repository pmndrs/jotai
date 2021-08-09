import { FC, useRef } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, useAtom } from '../../src/index'
import { useHydrateAtoms } from '../../src/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('useHydrateAtoms should only hydrate on first render', async () => {
  const countAtom = atom(0)

  const Counter: FC<{ initialCount: number }> = ({ initialCount }) => {
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

  const Counter: FC<{ initialCount: number }> = ({ initialCount }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue, setCount] = useAtom(countAtom)
    const renderCount = useRef(0)
    ++renderCount.current
    return (
      <>
        <div>renders: {renderCount.current}</div>
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
  await findByText('renders: 1')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 43')
  await findByText('renders: 2')
})

it('useHydrateAtoms should work with derived atoms', async () => {
  const countAtom = atom(0)
  const doubleAtom = atom((get) => get(countAtom) * 2)

  const Counter: FC<{ initialCount: number }> = ({ initialCount }) => {
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

  const Counter: FC<{ initialCount: number }> = ({ initialCount }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue, setCount] = useAtom(countAtom)

    return (
      <>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </>
    )
  }
  const Counter2: FC<{ count: number }> = ({ count }) => {
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

  const Counter: FC<{ initialCount: number }> = ({ initialCount }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue, setCount] = useAtom(countAtom)

    return (
      <>
        <div>count: {countValue}</div>
        <button onClick={() => setCount((count) => count + 1)}>dispatch</button>
      </>
    )
  }
  const Counter2: FC<{ count: number }> = ({ count }) => {
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

  const Counter: FC<{ initialCount: number }> = ({ initialCount }) => {
    useHydrateAtoms([[countAtom, initialCount]])
    const [countValue] = useAtom(countAtom)

    return (
      <>
        <div>count: {countValue}</div>
      </>
    )
  }
  const { findByText } = render(
    <Provider>
      <Counter initialCount={42} />
    </Provider>
  )

  await findByText('count: 42')
  expect(onMountFn).toBeCalledTimes(1)
})
