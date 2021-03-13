import React, { Fragment, StrictMode, Suspense, useEffect } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Provider as ProviderOrig, atom, useAtom } from '../src/index'

const Provider = process.env.PROVIDER_LESS_MODE ? Fragment : ProviderOrig

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
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Suspense fallback="loading">
          <DelayedCounter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await waitFor(() => {
    getByText('count: 0')
    getByText('delayedCount: 0')
  })
  expect(committed).toEqual([0])

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await waitFor(() => {
    getByText('count: 2')
    getByText('delayedCount: 2')
  })
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
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
          <DelayedCounter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await waitFor(() => {
    getByText('count: 0')
    getByText('delayedCount: 0')
  })
  fireEvent.click(getByText('button'))
  await findByText('loading')
  await waitFor(() => {
    getByText('count: 1')
    getByText('delayedCount: 1')
  })
})

it('reuses promises on initial read', async () => {
  let invokeCount = 0
  const asyncAtom = atom(async () => {
    invokeCount += 1
    await new Promise((r) => setTimeout(r, 10))
    return 'ready'
  })

  const Child: React.FC = () => {
    const [str] = useAtom(asyncAtom)
    return <div>{str}</div>
  }

  const { findByText, findAllByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Child />
          <Child />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await findAllByText('ready')
  expect(invokeCount).toBe(1)
})

it('uses multiple async atoms at once', async () => {
  const someAtom = atom(async () => {
    await new Promise((r) => setTimeout(r, 10))
    return 'ready'
  })
  const someAtom2 = atom(async () => {
    await new Promise((r) => setTimeout(r, 10))
    return 'ready2'
  })

  const Component: React.FC = () => {
    const [some] = useAtom(someAtom)
    const [some2] = useAtom(someAtom2)
    return (
      <>
        <div>
          {some} {some2}
        </div>
      </>
    )
  }

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await findByText('ready ready2')
})

it('uses async atom in the middle of dependency chain', async () => {
  const countAtom = atom(0)
  const asyncCountAtom = atom(async (get) => {
    await new Promise((r) => setTimeout(r, 10))
    return get(countAtom)
  })
  const delayedCountAtom = atom((get) => get(asyncCountAtom))

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const [delayedCount] = useAtom(delayedCountAtom)
    return (
      <>
        <div>
          count: {count}, delayed: {delayedCount}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await findByText('count: 0, delayed: 0')

  fireEvent.click(getByText('button'))
  // no loading
  await findByText('count: 1, delayed: 1')
})

it('updates an async atom in child useEffect on remount without setTimeout', async () => {
  const toggleAtom = atom(true)
  const countAtom = atom(0)
  const asyncCountAtom = atom(
    async (get) => get(countAtom),
    async (get, set) => set(countAtom, get(countAtom) + 1)
  )

  const Counter: React.FC = () => {
    const [count, incCount] = useAtom(asyncCountAtom)
    useEffect(() => {
      incCount()
    }, [incCount])
    return <div>count: {count}</div>
  }

  const Parent: React.FC = () => {
    const [toggle, setToggle] = useAtom(toggleAtom)
    return (
      <>
        <button onClick={() => setToggle((x) => !x)}>button</button>
        {toggle ? <Counter /> : <div>no child</div>}
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('no child')

  fireEvent.click(getByText('button'))
  await findByText('count: 2')
})

it('updates an async atom in child useEffect on remount', async () => {
  const toggleAtom = atom(true)
  const countAtom = atom(0)
  const asyncCountAtom = atom(
    async (get) => {
      await new Promise((r) => setTimeout(r, 10))
      return get(countAtom)
    },
    async (get, set) => {
      await new Promise((r) => setTimeout(r, 10))
      set(countAtom, get(countAtom) + 1)
    }
  )

  const Counter: React.FC = () => {
    const [count, incCount] = useAtom(asyncCountAtom)
    useEffect(() => {
      incCount()
    }, [incCount])
    return <div>count: {count}</div>
  }

  const Parent: React.FC = () => {
    const [toggle, setToggle] = useAtom(toggleAtom)
    return (
      <>
        <button onClick={() => setToggle((x) => !x)}>button</button>
        {toggle ? <Counter /> : <div>no child</div>}
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('no child')

  fireEvent.click(getByText('button'))
  await findByText('count: 2')
})

it('async get and useEffect on parent', async () => {
  const countAtom = atom(0)
  const asyncAtom = atom(async (get) => {
    const count = get(countAtom)
    if (!count) return 'none'
    return 'resolved'
  })

  const AsyncComponent: React.FC = () => {
    const [text] = useAtom(asyncAtom)
    return <div>text: {text}</div>
  }

  const Parent: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    useEffect(() => {
      setCount((c) => c + 1)
    }, [setCount])
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
        <AsyncComponent />
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await waitFor(() => {
    getByText('count: 1')
    getByText('text: resolved')
  })
})

it('async get with another dep and useEffect on parent', async () => {
  const countAtom = atom(0)
  const derivedAtom = atom((get) => get(countAtom))
  const asyncAtom = atom(async (get) => {
    const count = get(derivedAtom)
    if (!count) return 'none'
    return count
  })

  const AsyncComponent: React.FC = () => {
    const [count] = useAtom(asyncAtom)
    return <div>async: {count}</div>
  }

  const Parent: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    useEffect(() => {
      setCount((c) => c + 1)
    }, [setCount])
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
        <AsyncComponent />
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await waitFor(() => {
    getByText('count: 1')
    getByText('async: 1')
  })

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 2')
    getByText('async: 2')
  })
})

it('set promise atom value on write (#304)', async () => {
  const countAtom = atom<any>(Promise.resolve(0))
  countAtom.debugLabel = 'countAtom'
  const asyncAtom = atom(null, (get, set, _arg) => {
    set(
      countAtom,
      Promise.resolve(get(countAtom)).then((c) => c + 1)
    )
  })
  asyncAtom.debugLabel = 'asyncAtom'

  const Counter: React.FC = () => {
    const [count] = useAtom(countAtom)
    return <div>count: {count}</div>
  }

  const Parent: React.FC = () => {
    const [, dispatch] = useAtom(asyncAtom)
    return (
      <>
        <Counter />
        <button onClick={dispatch}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('count: 1')
})

it('uses async atom double chain (#306)', async () => {
  const countAtom = atom(0)
  const asyncCountAtom = atom(async (get) => {
    await new Promise((r) => setTimeout(r, 10))
    return get(countAtom)
  })
  const delayedCountAtom = atom(async (get) => {
    return get(asyncCountAtom)
  })

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const [delayedCount] = useAtom(delayedCountAtom)
    return (
      <>
        <div>
          count: {count}, delayed: {delayedCount}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await findByText('count: 0, delayed: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('count: 1, delayed: 1')
})

it('uses an async atom that depends on another async atom (#351)', async () => {
  const asyncAtom = atom(async (get) => {
    await new Promise((r) => setTimeout(r, 10))
    get(anotherAsyncAtom)
    return 1
  })
  const anotherAsyncAtom = atom(async () => {
    return 2
  })

  const Counter: React.FC = () => {
    const [num] = useAtom(asyncAtom)
    return <div>num: {num}</div>
  }

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  await findByText('num: 1')
})
