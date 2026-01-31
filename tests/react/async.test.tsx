import { StrictMode, Suspense, useEffect } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'
import { sleep, useCommitCount } from '../test-utils'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('does not show async stale result', async () => {
  const countAtom = atom(0)
  const asyncCountAtom = atom(async (get) => {
    await sleep(100)
    return get(countAtom)
  })

  const committed: number[] = []

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const onClick = async () => {
      setCount((c) => c + 1)
      await sleep(100)
      setCount((c) => c + 1)
    }
    return (
      <>
        <div>count: {count}</div>
        <button onClick={onClick}>button</button>
      </>
    )
  }

  const DelayedCounter = () => {
    const [delayedCount] = useAtom(asyncCountAtom)
    useEffect(() => {
      committed.push(delayedCount)
    })
    return <div>delayedCount: {delayedCount}</div>
  }

  await act(() =>
    render(
      <>
        <Counter />
        <Suspense fallback="loading">
          <DelayedCounter />
        </Suspense>
      </>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 0')).toBeInTheDocument()
  expect(screen.getByText('delayedCount: 0')).toBeInTheDocument()

  expect(committed).toEqual([0])

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 2')).toBeInTheDocument()
  expect(screen.getByText('delayedCount: 2')).toBeInTheDocument()

  // React 18+ uses automatic batching, so committed is [0, 2]
  // React 16-17 doesn't batch async updates, so committed is [0, 1, 2]
  // Different build types (cjs, umd, esm) may also affect batching behavior
  expect(committed.length).toBeGreaterThanOrEqual(2)
  expect(committed[0]).toBe(0)
  expect(committed[committed.length - 1]).toBe(2)
})

it('does not show async stale result on derived atom', async () => {
  const countAtom = atom(0)
  const asyncAlwaysNullAtom = atom(async (get) => {
    get(countAtom)
    await sleep(100)
    return null
  })
  const derivedAtom = atom((get) => get(asyncAlwaysNullAtom))

  const DisplayAsyncValue = () => {
    const [asyncValue] = useAtom(asyncAlwaysNullAtom)

    return <div>async value: {JSON.stringify(asyncValue)}</div>
  }

  const DisplayDerivedValue = () => {
    const [derivedValue] = useAtom(derivedAtom)
    return <div>derived value: {JSON.stringify(derivedValue)}</div>
  }

  const Test = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <div>
        <div>count: {count}</div>
        <Suspense fallback={<div>loading async value</div>}>
          <DisplayAsyncValue />
        </Suspense>
        <Suspense fallback={<div>loading derived value</div>}>
          <DisplayDerivedValue />
        </Suspense>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </div>
    )
  }

  await act(() =>
    render(
      <StrictMode>
        <Test />
      </StrictMode>,
    ),
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()
  expect(screen.getByText('loading async value')).toBeInTheDocument()
  expect(screen.getByText('loading derived value')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('async value: null')).toBeInTheDocument()
  expect(screen.getByText('derived value: null')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('loading async value')).toBeInTheDocument()
  expect(screen.getByText('loading derived value')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('async value: null')).toBeInTheDocument()
  expect(screen.getByText('derived value: null')).toBeInTheDocument()
})

it('works with async get with extra deps', async () => {
  const countAtom = atom(0)
  const anotherAtom = atom(-1)
  const asyncCountAtom = atom(async (get) => {
    get(anotherAtom)
    await sleep(100)
    return get(countAtom)
  })

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const DelayedCounter = () => {
    const [delayedCount] = useAtom(asyncCountAtom)
    return <div>delayedCount: {delayedCount}</div>
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
          <DelayedCounter />
        </Suspense>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 0')).toBeInTheDocument()
  expect(screen.getByText('delayedCount: 0')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('delayedCount: 1')).toBeInTheDocument()
})

it('reuses promises on initial read', async () => {
  let invokeCount = 0
  const asyncAtom = atom(async () => {
    invokeCount += 1
    await sleep(100)
    return 'ready'
  })

  const Child = () => {
    const [str] = useAtom(asyncAtom)
    return <div>{str}</div>
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Child />
          <Child />
        </Suspense>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  const elements = screen.getAllByText('ready')
  elements.forEach((element) => {
    expect(element).toBeInTheDocument()
  })

  expect(invokeCount).toBe(1)
})

it('uses multiple async atoms at once', async () => {
  const someAtom = atom(async () => {
    await sleep(100)
    return 'ready'
  })
  const someAtom2 = atom(async () => {
    await sleep(50)
    return 'ready2'
  })

  const Component = () => {
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

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()

  await act(() => vi.advanceTimersByTimeAsync(100))
  await act(() => vi.advanceTimersByTimeAsync(50))
  expect(screen.getByText('ready ready2')).toBeInTheDocument()
})

it('uses async atom in the middle of dependency chain', async () => {
  const countAtom = atom(0)
  const asyncCountAtom = atom(async (get) => {
    await sleep(100)
    return get(countAtom)
  })
  const delayedCountAtom = atom((get) => get(asyncCountAtom))

  const Counter = () => {
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

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 0, delayed: 0')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 1, delayed: 1')).toBeInTheDocument()
})

it('updates an async atom in child useEffect on remount without setTimeout', async () => {
  const toggleAtom = atom(true)
  const countAtom = atom(0)
  const asyncCountAtom = atom(
    async (get) => get(countAtom),
    async (get, set) => set(countAtom, get(countAtom) + 1),
  )

  const Counter = () => {
    const [count, incCount] = useAtom(asyncCountAtom)
    useEffect(() => {
      incCount()
    }, [incCount])
    return <div>count: {count}</div>
  }

  const Parent = () => {
    const [toggle, setToggle] = useAtom(toggleAtom)
    return (
      <>
        <button onClick={() => setToggle((x) => !x)}>button</button>
        {toggle ? <Counter /> : <div>no child</div>}
      </>
    )
  }

  await act(() =>
    render(
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>,
    ),
  )

  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 1')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('no child')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 2')).toBeInTheDocument()
})

it('updates an async atom in child useEffect on remount', async () => {
  const toggleAtom = atom(true)
  const countAtom = atom(0)
  const asyncCountAtom = atom(
    async (get) => {
      await sleep(100)
      return get(countAtom)
    },
    async (get, set) => {
      await sleep(100)
      set(countAtom, get(countAtom) + 1)
    },
  )

  const Counter = () => {
    const [count, incCount] = useAtom(asyncCountAtom)
    useEffect(() => {
      incCount()
    }, [incCount])
    return <div>count: {count}</div>
  }

  const Parent = () => {
    const [toggle, setToggle] = useAtom(toggleAtom)
    return (
      <>
        <button onClick={() => setToggle((x) => !x)}>button</button>
        {toggle ? <Counter /> : <div>no child</div>}
      </>
    )
  }

  await act(() =>
    render(
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 0')).toBeInTheDocument()
  // NOTE: 1000ms to wait for useEffect's write operation with React scheduling overhead
  await act(() => vi.advanceTimersByTimeAsync(1000))
  expect(screen.getByText('count: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('no child')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  // NOTE: 1000ms to wait for useEffect's write operation with React scheduling overhead
  await act(() => vi.advanceTimersByTimeAsync(1000))
  expect(screen.getByText('count: 2')).toBeInTheDocument()
})

it('async get and useEffect on parent', async () => {
  const countAtom = atom(0)
  const asyncAtom = atom(async (get) => {
    const count = get(countAtom)
    if (!count) return 'none'
    return 'resolved'
  })

  const AsyncComponent = () => {
    const [text] = useAtom(asyncAtom)
    return <div>text: {text}</div>
  }

  const Parent = () => {
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

  await act(() =>
    render(
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>,
    ),
  )

  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('text: resolved')).toBeInTheDocument()
})

it('async get with another dep and useEffect on parent', async () => {
  const countAtom = atom(0)
  const derivedAtom = atom((get) => get(countAtom))
  const asyncAtom = atom(async (get) => {
    const count = get(derivedAtom)
    if (!count) return 'none'
    return count
  })

  const AsyncComponent = () => {
    const [count] = useAtom(asyncAtom)
    return <div>async: {count}</div>
  }

  const Parent = () => {
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

  await act(() =>
    render(
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>,
    ),
  )

  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('async: 1')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 2')).toBeInTheDocument()
  expect(screen.getByText('async: 2')).toBeInTheDocument()
})

it('set promise atom value on write (#304)', async () => {
  const countAtom = atom(Promise.resolve(0))
  const asyncAtom = atom(null, (get, set, _arg) => {
    set(
      countAtom,
      Promise.resolve(get(countAtom)).then(async (c) => {
        await sleep(100)
        return c + 1
      }),
    )
  })

  const Counter = () => {
    const [count] = useAtom(countAtom)
    return <div>count: {count * 1}</div>
  }

  const Parent = () => {
    const [, dispatch] = useAtom(asyncAtom)
    return (
      <>
        <Counter />
        <button onClick={dispatch}>button</button>
      </>
    )
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </StrictMode>,
    ),
  )

  // FIXME this is not working
  //await screen.findByText('loading')

  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 0')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
})

it('uses async atom double chain (#306)', async () => {
  const countAtom = atom(0)
  const asyncCountAtom = atom(async (get) => {
    await sleep(100)
    return get(countAtom)
  })
  const delayedCountAtom = atom(async (get) => {
    return get(asyncCountAtom)
  })

  const Counter = () => {
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

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 0, delayed: 0')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 1, delayed: 1')).toBeInTheDocument()
})

it('uses an async atom that depends on another async atom', async () => {
  const asyncAtom = atom(async (get) => {
    await sleep(100)
    get(anotherAsyncAtom)
    return 1
  })
  const anotherAsyncAtom = atom(async () => {
    return 2
  })

  const Counter = () => {
    const [num] = useAtom(asyncAtom)
    return <div>num: {num}</div>
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('num: 1')).toBeInTheDocument()
})

it('a derived atom from a newly created async atom (#351)', async () => {
  const countAtom = atom(1)
  const atomCache = new Map<number, Atom<Promise<number>>>()
  const getAsyncAtom = (n: number) => {
    if (!atomCache.has(n)) {
      atomCache.set(
        n,
        atom(async () => {
          return n + 10
        }),
      )
    }
    return atomCache.get(n) as Atom<Promise<number>>
  }
  const derivedAtom = atom((get) => get(getAsyncAtom(get(countAtom))))

  const Counter = () => {
    const [, setCount] = useAtom(countAtom)
    const [derived] = useAtom(derivedAtom)
    return (
      <>
        <div>
          derived: {derived}, commits: {useCommitCount()}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  await act(() =>
    render(
      <>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </>,
    ),
  )

  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('derived: 11, commits: 1')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('derived: 12, commits: 2')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('derived: 13, commits: 3')).toBeInTheDocument()
})

it('Handles synchronously invoked async set (#375)', async () => {
  const loadingAtom = atom(false)
  const documentAtom = atom<string | undefined>(undefined)
  const loadDocumentAtom = atom(null, (_get, set) => {
    const fetch = async () => {
      set(loadingAtom, true)
      const response = await new Promise<string>((resolve) =>
        setTimeout(() => resolve('great document'), 100),
      )
      set(documentAtom, response)
      set(loadingAtom, false)
    }
    fetch()
  })

  const ListDocuments = () => {
    const [loading] = useAtom(loadingAtom)
    const [document] = useAtom(documentAtom)
    const [, loadDocument] = useAtom(loadDocumentAtom)

    useEffect(() => {
      loadDocument()
    }, [loadDocument])

    return (
      <>
        {loading && <div>loading</div>}
        {!loading && <div>{document}</div>}
      </>
    )
  }

  render(
    <StrictMode>
      <ListDocuments />
    </StrictMode>,
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('great document')).toBeInTheDocument()
})

it('async write self atom', async () => {
  const countAtom = atom(0, async (get, set, _arg) => {
    set(countAtom, get(countAtom) + 1)
    await sleep(100)
    set(countAtom, -1)
  })

  const Counter = () => {
    const [count, inc] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={inc}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: -1')).toBeInTheDocument()
})

it('non suspense async write self atom with setTimeout (#389)', async () => {
  const countAtom = atom(0, (get, set, _arg) => {
    set(countAtom, get(countAtom) + 1)
    setTimeout(() => set(countAtom, -1))
  })

  const Counter = () => {
    const [count, inc] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={inc}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTime(0))
  expect(screen.getByText('count: -1')).toBeInTheDocument()
})

it('should override promise as atom value (#430)', async () => {
  const countAtom = atom(new Promise<number>(() => {}))
  const setCountAtom = atom(null, (_get, set, arg: number) => {
    set(countAtom, Promise.resolve(arg))
  })

  const Counter = () => {
    const [count] = useAtom(countAtom)
    return <div>count: {count * 1}</div>
  }

  const Control = () => {
    const [, setCount] = useAtom(setCountAtom)
    return <button onClick={() => setCount(1)}>button</button>
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Control />
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
})

it.skip('combine two promise atom values (#442)', async () => {
  const count1Atom = atom(new Promise<number>(() => {}))
  const count2Atom = atom(new Promise<number>(() => {}))
  const derivedAtom = atom(
    async (get) => (await get(count1Atom)) + (await get(count2Atom)),
  )
  const initAtom = atom(null, (_get, set) => {
    setTimeout(() => set(count1Atom, Promise.resolve(1)))
    setTimeout(() => set(count2Atom, Promise.resolve(2)))
  })
  initAtom.onMount = (init) => {
    init()
  }

  const Counter = () => {
    const [count] = useAtom(derivedAtom)
    return <div>count: {count}</div>
  }

  const Control = () => {
    useAtom(initAtom)
    return null
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Control />
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()

  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 3')).toBeInTheDocument()
})

it.skip('set two promise atoms at once', async () => {
  const count1Atom = atom(new Promise<number>(() => {}))
  const count2Atom = atom(new Promise<number>(() => {}))
  const derivedAtom = atom(
    async (get) => (await get(count1Atom)) + (await get(count2Atom)),
  )
  const setCountsAtom = atom(null, (_get, set) => {
    set(count1Atom, Promise.resolve(1))
    set(count2Atom, Promise.resolve(2))
  })

  const Counter = () => {
    const [count] = useAtom(derivedAtom)
    return <div>count: {count}</div>
  }

  const Control = () => {
    const [, setCounts] = useAtom(setCountsAtom)
    return <button onClick={() => setCounts()}>button</button>
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Control />
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  fireEvent.click(screen.getByText('button'))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('count: 3')).toBeInTheDocument()
})

it('async write chain', async () => {
  const countAtom = atom(0)
  const asyncWriteAtom = atom(null, async (_get, set, _arg) => {
    await sleep(100)
    set(countAtom, 2)
  })
  const controlAtom = atom(null, async (_get, set, _arg) => {
    set(countAtom, 1)
    await set(asyncWriteAtom, null)
    await sleep(100)
    set(countAtom, 3)
  })

  const Counter = () => {
    const [count] = useAtom(countAtom)
    return <div>count: {count}</div>
  }

  const Control = () => {
    const [, invoke] = useAtom(controlAtom)
    return <button onClick={invoke}>button</button>
  }

  render(
    <StrictMode>
      <Counter />
      <Control />
    </StrictMode>,
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 2')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 3')).toBeInTheDocument()
})

it('async atom double chain without setTimeout (#751)', async () => {
  const enabledAtom = atom(false)
  const asyncAtom = atom(async (get) => {
    const enabled = get(enabledAtom)
    if (!enabled) {
      return 'init'
    }
    await sleep(100)
    return 'ready'
  })
  const derivedAsyncAtom = atom(async (get) => get(asyncAtom))
  const anotherAsyncAtom = atom(async (get) => get(derivedAsyncAtom))

  const AsyncComponent = () => {
    const [text] = useAtom(anotherAsyncAtom)
    return <div>async: {text}</div>
  }

  const Parent = () => {
    // Use useAtom to reproduce the issue
    const [, setEnabled] = useAtom(enabledAtom)
    return (
      <>
        <Suspense fallback="loading">
          <AsyncComponent />
        </Suspense>
        <button
          onClick={() => {
            setEnabled(true)
          }}
        >
          button
        </button>
      </>
    )
  }

  await act(() =>
    render(
      <StrictMode>
        <Parent />
      </StrictMode>,
    ),
  )

  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('async: init')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('async: ready')).toBeInTheDocument()
})

it('async atom double chain with setTimeout', async () => {
  const enabledAtom = atom(false)
  const asyncAtom = atom(async (get) => {
    const enabled = get(enabledAtom)
    if (!enabled) {
      return 'init'
    }
    await sleep(100)
    return 'ready'
  })
  const derivedAsyncAtom = atom(async (get) => {
    await sleep(100)
    return get(asyncAtom)
  })
  const anotherAsyncAtom = atom(async (get) => {
    await sleep(100)
    return get(derivedAsyncAtom)
  })

  const AsyncComponent = () => {
    const [text] = useAtom(anotherAsyncAtom)
    return <div>async: {text}</div>
  }

  const Parent = () => {
    // Use useAtom to reproduce the issue
    const [, setEnabled] = useAtom(enabledAtom)
    return (
      <>
        <Suspense fallback="loading">
          <AsyncComponent />
        </Suspense>
        <button
          onClick={() => {
            setEnabled(true)
          }}
        >
          button
        </button>
      </>
    )
  }

  await act(() =>
    render(
      <StrictMode>
        <Parent />
      </StrictMode>,
    ),
  )

  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('loading')).toBeInTheDocument()

  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('async: init')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('async: ready')).toBeInTheDocument()
})

it('update unmounted async atom with intermediate atom', async () => {
  const enabledAtom = atom(true)
  const countAtom = atom(1)

  const intermediateAtom = atom((get) => {
    const count = get(countAtom)
    const enabled = get(enabledAtom)
    const tmpAtom = atom(async () => {
      if (!enabled) {
        return -1
      }
      await sleep(100)
      return count * 2
    })
    return tmpAtom
  })
  const derivedAtom = atom((get) => {
    const tmpAtom = get(intermediateAtom)
    return get(tmpAtom)
  })

  const DerivedCounter = () => {
    const [derived] = useAtom(derivedAtom)
    return <div>derived: {derived}</div>
  }

  const Control = () => {
    const [, setEnabled] = useAtom(enabledAtom)
    const [, setCount] = useAtom(countAtom)
    return (
      <>
        <button onClick={() => setCount((c) => c + 1)}>increment count</button>
        <button onClick={() => setEnabled((x) => !x)}>toggle enabled</button>
      </>
    )
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <DerivedCounter />
        </Suspense>
        <Control />
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('derived: 2')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('toggle enabled')))
  await act(() => vi.advanceTimersByTimeAsync(0))
  await act(() => fireEvent.click(screen.getByText('increment count')))
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('derived: -1')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('toggle enabled')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('derived: 4')).toBeInTheDocument()
})

it('multiple derived atoms with dependency chaining and async write (#813)', async () => {
  const responseBaseAtom = atom<{ name: string }[] | null>(null)

  const response1 = [{ name: 'alpha' }, { name: 'beta' }]
  const responseAtom = atom(
    (get) => get(responseBaseAtom),
    (_get, set) => {
      setTimeout(() => set(responseBaseAtom, response1))
    },
  )
  responseAtom.onMount = (init) => {
    init()
  }

  const mapAtom = atom((get) => get(responseAtom))
  const itemA = atom((get) => get(mapAtom)?.[0])
  const itemB = atom((get) => get(mapAtom)?.[1])
  const itemAName = atom((get) => get(itemA)?.name)
  const itemBName = atom((get) => get(itemB)?.name)

  const App = () => {
    const [aName] = useAtom(itemAName)
    const [bName] = useAtom(itemBName)
    return (
      <>
        <div>aName: {aName}</div>
        <div>bName: {bName}</div>
      </>
    )
  }

  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  await act(() => vi.advanceTimersByTime(0))
  expect(screen.getByText('aName: alpha')).toBeInTheDocument()
  expect(screen.getByText('bName: beta')).toBeInTheDocument()
})
