import { StrictMode, Suspense, useState } from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom } from 'jotai'
import { StrictModeUnlessVersionedWrite, getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('one atom, one effect', async () => {
  const countAtom = atom(1)
  const onMountFn = jest.fn()
  countAtom.onMount = onMountFn

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <>
      <Provider>
        <Counter />
      </Provider>
    </>
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

  const Counter = () => {
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
    <>
      <Provider>
        <Counter />
      </Provider>
    </>
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

  const Counter = () => {
    const [count] = useAtom(countAtom2)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const { findByText } = render(
    <>
      <Provider>
        <Counter />
      </Provider>
    </>
  )

  await findByText('count: 1')
  expect(onMountFn).toBeCalledTimes(1)
})

it('mount/unmount test', async () => {
  const countAtom = atom(1)

  const onUnMountFn = jest.fn()
  const onMountFn = jest.fn(() => onUnMountFn)
  countAtom.onMount = onMountFn

  const Counter = () => {
    const [count] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Display = () => {
    const [display, setDisplay] = useState(true)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  const { getByText } = render(
    <>
      <Provider>
        <Display />
      </Provider>
    </>
  )

  expect(onMountFn).toBeCalledTimes(1)
  expect(onUnMountFn).toBeCalledTimes(0)

  fireEvent.click(getByText('button'))
  // FIXME is there a better way?
  await waitFor(() => {})

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

  const Counter = () => {
    const [count] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Display = () => {
    const [display, setDisplay] = useState(true)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  const { getByText } = render(
    <>
      <Provider>
        <Display />
      </Provider>
    </>
  )
  expect(derivedOnMountFn).toBeCalledTimes(1)
  expect(derivedOnUnMountFn).toBeCalledTimes(0)
  expect(onMountFn).toBeCalledTimes(1)
  expect(onUnMountFn).toBeCalledTimes(0)

  fireEvent.click(getByText('button'))
  // FIXME is there a better way?
  await waitFor(() => {})

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

  const Counter2 = () => {
    const [count] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }
  const Counter = () => {
    const [count] = useAtom(countAtom)
    const [display, setDisplay] = useState(false)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setDisplay((c) => !c)}>derived atom</button>
        {display ? <Counter2 /> : null}
      </>
    )
  }

  const Display = () => {
    const [display, setDisplay] = useState(false)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  const { getByText } = render(
    <StrictMode>
      <Provider>
        <Display />
      </Provider>
    </StrictMode>
  )
  expect(committed).toEqual([0, 0])

  fireEvent.click(getByText('button'))
  // FIXME is there a better way?
  await waitFor(() => {})

  expect(committed).toEqual([1, 0])

  fireEvent.click(getByText('derived atom'))
  // FIXME is there a better way?
  await waitFor(() => {})

  expect(committed).toEqual([1, 1])

  fireEvent.click(getByText('derived atom'))
  // FIXME is there a better way?
  await waitFor(() => {})

  expect(committed).toEqual([1, 0])

  fireEvent.click(getByText('button'))
  // FIXME is there a better way?
  await waitFor(() => {})

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

  const Counter = () => {
    const [count] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Display = () => {
    const [display, setDisplay] = useState(true)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <>
      <Provider>
        <Suspense fallback="loading">
          <Display />
        </Suspense>
      </Provider>
    </>
  )

  await findByText('loading')
  await waitFor(() => {
    getByText('count: 0')
    expect(onMountFn).toBeCalledTimes(1)
    expect(onUnMountFn).toBeCalledTimes(0)
  })

  fireEvent.click(getByText('button'))
  expect(onMountFn).toBeCalledTimes(1)
  expect(onUnMountFn).toBeCalledTimes(1)
})

it('subscription usage test', async () => {
  const store = {
    count: 10,
    listeners: new Set<() => void>(),
    inc: () => {
      store.count += 1
      store.listeners.forEach((listener) => listener())
    },
  }

  const countAtom = atom(1)
  countAtom.onMount = (setCount) => {
    const callback = () => {
      setCount(store.count)
    }
    store.listeners.add(callback)
    callback()
    return () => store.listeners.delete(callback)
  }

  const Counter = () => {
    const [count] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Display = () => {
    const [display, setDisplay] = useState(true)
    return (
      <>
        {display ? <Counter /> : 'N/A'}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Display />
      </Provider>
    </StrictMode>
  )

  await findByText('count: 10')

  act(() => {
    store.inc()
  })
  await findByText('count: 11')

  fireEvent.click(getByText('button'))
  await findByText('N/A')

  fireEvent.click(getByText('button'))
  await findByText('count: 11')

  fireEvent.click(getByText('button'))
  await findByText('N/A')

  act(() => {
    store.inc()
  })
  await findByText('N/A')

  fireEvent.click(getByText('button'))
  await findByText('count: 12')
})

it('subscription in base atom test', async () => {
  const store = {
    count: 10,
    listeners: new Set<() => void>(),
    add: (n: number) => {
      store.count += n
      store.listeners.forEach((listener) => listener())
    },
  }

  const countAtom = atom(1)
  countAtom.onMount = (setCount) => {
    const callback = () => {
      setCount(store.count)
    }
    store.listeners.add(callback)
    callback()
    return () => store.listeners.delete(callback)
  }
  const derivedAtom = atom(
    (get) => get(countAtom),
    (_get, _set, n: number) => {
      store.add(n)
    }
  )

  const Counter = () => {
    const [count, add] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => add(1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictModeUnlessVersionedWrite>
      <Provider>
        <Counter />
      </Provider>
    </StrictModeUnlessVersionedWrite>
  )

  await findByText('count: 10')

  fireEvent.click(getByText('button'))
  await findByText('count: 11')

  fireEvent.click(getByText('button'))
  await findByText('count: 12')
})

it('create atom with onMount in async get', async () => {
  const store = {
    count: 10,
    listeners: new Set<() => void>(),
    add: (n: number) => {
      store.count += n
      store.listeners.forEach((listener) => listener())
    },
  }

  const holderAtom = atom(async () => {
    const countAtom = atom(1)
    countAtom.onMount = (setCount) => {
      const callback = () => {
        setCount(store.count)
      }
      store.listeners.add(callback)
      callback()
      return () => store.listeners.delete(callback)
    }
    return countAtom
  })
  const derivedAtom = atom(
    (get) => get(get(holderAtom)),
    (_get, _set, n: number) => {
      store.add(n)
    }
  )

  const Counter = () => {
    const [count, add] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => add(1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictModeUnlessVersionedWrite>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictModeUnlessVersionedWrite>
  )

  await findByText('count: 10')

  fireEvent.click(getByText('button'))
  await findByText('count: 11')

  fireEvent.click(getByText('button'))
  await findByText('count: 12')
})
