import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Provider, atom, useAtom } from '../src/index'

it('one atom, one effect', async () => {
  const countAtom = atom(1)
  const onMountFn = jest.fn()
  countAtom.onMount = onMountFn

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 1')
  expect(onMountFn).toBeCalledTimes(1)

  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  expect(onMountFn).toBeCalledTimes(1)
})

it('two atoms, one each', async () => {
  const countAtom = atom(1)
  const countAtom2 = atom(1)
  const onMountFn = jest.fn()
  const onMountFn2 = jest.fn()
  countAtom.onMount = onMountFn
  countAtom2.onMount = onMountFn2

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const [count2, setCount2] = useAtom(countAtom2)
    return (
      <>
        <div>count: {count}</div>
        <div>count2: {count2}</div>
        <button
          onClick={() => {
            setCount((c) => c + 1)
            setCount2((c) => c + 1)
          }}>
          button
        </button>
      </>
    )
  }

  const { getByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await waitFor(() => {
    getByText('count: 1')
    getByText('count2: 1')
  })
  expect(onMountFn).toBeCalledTimes(1)
  expect(onMountFn2).toBeCalledTimes(1)

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 2')
    getByText('count2: 2')
  })

  expect(onMountFn).toBeCalledTimes(1)
  expect(onMountFn2).toBeCalledTimes(1)
})

it('one derived atom, one onMount', async () => {
  const countAtom = atom(1)
  const countAtom2 = atom((get) => get(countAtom))
  const onMountFn = jest.fn()
  countAtom.onMount = onMountFn

  const Counter: React.FC = () => {
    const [count] = useAtom(countAtom2)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const { findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 1')
  expect(onMountFn).toBeCalledTimes(1)
})

it('mount/unmount test', async () => {
  const countAtom = atom(1)

  const onUnMountFn = jest.fn()
  const onMountFn = jest.fn(() => onUnMountFn)
  countAtom.onMount = onMountFn

  const Counter: React.FC = () => {
    const [count] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Display: React.FC = () => {
    const [display, setDisplay] = React.useState(true)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  const { getByText } = render(
    <Provider>
      <Display />
    </Provider>
  )

  expect(onMountFn).toBeCalledTimes(1)
  expect(onUnMountFn).toBeCalledTimes(0)
  fireEvent.click(getByText('button'))
  expect(onMountFn).toBeCalledTimes(1)
  expect(onUnMountFn).toBeCalledTimes(1)
})

it('one derived atom, one onMount for the derived one, and one for the regular atom + onUnMount', async () => {
  const countAtom = atom(1)
  const derivedAtom = atom(
    (get) => get(countAtom),
    (_get, set, update: number) => {
      set(countAtom, update)
      set(derivedAtom, update)
    }
  )
  const onUnMountFn = jest.fn()
  const onMountFn = jest.fn(() => onUnMountFn)
  countAtom.onMount = onMountFn
  const derivedOnUnMountFn = jest.fn()
  const derivedOnMountFn = jest.fn(() => derivedOnUnMountFn)
  derivedAtom.onMount = derivedOnMountFn

  const Counter: React.FC = () => {
    const [count] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Display: React.FC = () => {
    const [display, setDisplay] = React.useState(true)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  const { getByText } = render(
    <Provider>
      <Display />
    </Provider>
  )
  expect(derivedOnMountFn).toBeCalledTimes(1)
  expect(derivedOnUnMountFn).toBeCalledTimes(0)
  expect(onMountFn).toBeCalledTimes(1)
  expect(onUnMountFn).toBeCalledTimes(0)
  fireEvent.click(getByText('button'))
  expect(derivedOnMountFn).toBeCalledTimes(1)
  expect(derivedOnUnMountFn).toBeCalledTimes(1)
  expect(onMountFn).toBeCalledTimes(1)
  expect(onUnMountFn).toBeCalledTimes(1)
})

it('mount/unMount order', async () => {
  const committed: number[] = [0, 0]
  const countAtom = atom(1)
  const derivedAtom = atom(
    (get) => get(countAtom),
    (_get, set, update: number) => {
      set(countAtom, update)
      set(derivedAtom, update)
    }
  )
  const onUnMountFn = jest.fn(() => {
    committed[0] = 0
  })
  const onMountFn = jest.fn(() => {
    committed[0] = 1
    return onUnMountFn
  })
  countAtom.onMount = onMountFn
  const derivedOnUnMountFn = jest.fn(() => {
    committed[1] = 0
  })
  const derivedOnMountFn = jest.fn(() => {
    committed[1] = 1
    return derivedOnUnMountFn
  })
  derivedAtom.onMount = derivedOnMountFn

  const Counter2: React.FC = () => {
    const [count] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }
  const Counter: React.FC = () => {
    const [count] = useAtom(countAtom)
    const [display, setDisplay] = React.useState(false)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setDisplay((c) => !c)}>derived atom</button>
        {display ? <Counter2 /> : null}
      </>
    )
  }

  const Display: React.FC = () => {
    const [display, setDisplay] = React.useState(false)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  const { getByText } = render(
    <Provider>
      <Display />
    </Provider>
  )
  expect(committed).toEqual([0, 0])
  fireEvent.click(getByText('button'))
  expect(committed).toEqual([1, 0])
  fireEvent.click(getByText('derived atom'))
  expect(committed).toEqual([1, 1])
  fireEvent.click(getByText('derived atom'))
  expect(committed).toEqual([1, 0])
  fireEvent.click(getByText('button'))
  expect(committed).toEqual([0, 0])
})

it('mount/unmount test with async atom', async () => {
  const countAtom = atom(
    async () => {
      await new Promise((r) => setTimeout(r, 100))
      return 0
    },
    () => {}
  )

  const onUnMountFn = jest.fn()
  const onMountFn = jest.fn(() => onUnMountFn)
  countAtom.onMount = onMountFn

  const Counter: React.FC = () => {
    const [count] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Display: React.FC = () => {
    const [display, setDisplay] = React.useState(true)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <React.Suspense fallback="loading">
        <Display />
      </React.Suspense>
    </Provider>
  )

  await findByText('loading')
  await waitFor(() => {
    getByText('count: 0')
  })
  expect(onMountFn).toBeCalledTimes(1)
  expect(onUnMountFn).toBeCalledTimes(0)
  fireEvent.click(getByText('button'))
  expect(onMountFn).toBeCalledTimes(1)
  expect(onUnMountFn).toBeCalledTimes(1)
})
// subscription usage test
