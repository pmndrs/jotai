import { StrictMode, Suspense, useEffect, useRef } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEventOrig from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'

const userEvent = {
  click: (element: Element) => act(() => userEventOrig.click(element)),
}

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  return commitCountRef.current
}

it('does not show async stale result', async () => {
  const countAtom = atom(0)
  let resolve2 = () => {}
  const asyncCountAtom = atom(async (get) => {
    await new Promise<void>((r) => (resolve2 = r))
    return get(countAtom)
  })

  const committed: number[] = []

  let resolve1 = () => {}
  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const onClick = async () => {
      setCount((c) => c + 1)
      await new Promise<void>((r) => (resolve1 = r))
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

  await act(async () => {
    render(
      <>
        <Counter />
        <Suspense fallback="loading">
          <DelayedCounter />
        </Suspense>
      </>,
    )
  })

  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve1()
  resolve2()
  expect(await screen.findByText('count: 0')).toBeInTheDocument()
  expect(await screen.findByText('delayedCount: 0')).toBeInTheDocument()
  expect(committed).toEqual([0])

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('loading')).toBeInTheDocument()
  await act(async () => {
    resolve1()
    resolve2()
    await Promise.resolve()
    resolve2()
  })
  expect(await screen.findByText('count: 2')).toBeInTheDocument()
  expect(await screen.findByText('delayedCount: 2')).toBeInTheDocument()
  expect(committed).toEqual([0, 2])
})

it('does not show async stale result on derived atom', async () => {
  const countAtom = atom(0)
  let resolve = () => {}
  const asyncAlwaysNullAtom = atom(async (get) => {
    get(countAtom)
    await new Promise<void>((r) => (resolve = r))
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

  await act(async () => {
    render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
  })

  expect(await screen.findByText('count: 0')).toBeInTheDocument()
  expect(await screen.findByText('loading async value')).toBeInTheDocument()
  expect(await screen.findByText('loading derived value')).toBeInTheDocument()

  resolve()

  expect(await screen.findByText('async value: null')).toBeInTheDocument()
  expect(await screen.findByText('derived value: null')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))

  expect(await screen.findByText('count: 1')).toBeInTheDocument()
  expect(await screen.findByText('loading async value')).toBeInTheDocument()
  expect(await screen.findByText('loading derived value')).toBeInTheDocument()

  resolve()

  expect(await screen.findByText('async value: null')).toBeInTheDocument()
  expect(await screen.findByText('derived value: null')).toBeInTheDocument()
})

it('works with async get with extra deps', async () => {
  const countAtom = atom(0)
  const anotherAtom = atom(-1)
  let resolve = () => {}
  const asyncCountAtom = atom(async (get) => {
    get(anotherAtom)
    await new Promise<void>((r) => (resolve = r))
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

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
          <DelayedCounter />
        </Suspense>
      </StrictMode>,
    )
  })

  expect(await screen.findByText('loading')).toBeInTheDocument()

  resolve()

  expect(await screen.findByText('count: 0')).toBeInTheDocument()
  expect(await screen.findByText('delayedCount: 0')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('loading')).toBeInTheDocument()

  resolve()

  expect(await screen.findByText('count: 1')).toBeInTheDocument()
  expect(await screen.findByText('delayedCount: 1')).toBeInTheDocument()
})

it('reuses promises on initial read', async () => {
  let invokeCount = 0
  let resolve = () => {}
  const asyncAtom = atom(async () => {
    invokeCount += 1
    await new Promise<void>((r) => (resolve = r))
    return 'ready'
  })

  const Child = () => {
    const [str] = useAtom(asyncAtom)
    return <div>{str}</div>
  }

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Child />
          <Child />
        </Suspense>
      </StrictMode>,
    )
  })

  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve()
  const elements = await screen.findAllByText('ready')
  elements.forEach((element) => {
    expect(element).toBeInTheDocument()
  })
  expect(invokeCount).toBe(1)
})

it('uses multiple async atoms at once', async () => {
  const resolve: (() => void)[] = []
  const someAtom = atom(async () => {
    await new Promise<void>((r) => resolve.push(r))
    return 'ready'
  })
  const someAtom2 = atom(async () => {
    await new Promise<void>((r) => resolve.push(r))
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

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      </StrictMode>,
    )
  })

  expect(await screen.findByText('loading')).toBeInTheDocument()
  await waitFor(() => {
    resolve.splice(0).forEach((fn) => fn())
    expect(screen.getByText('ready ready2')).toBeInTheDocument()
  })
})

it('uses async atom in the middle of dependency chain', async () => {
  const countAtom = atom(0)
  let resolve = () => {}
  const asyncCountAtom = atom(async (get) => {
    await new Promise<void>((r) => (resolve = r))
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
  expect(await screen.findByText('count: 0, delayed: 0')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve()
  expect(await screen.findByText('count: 1, delayed: 1')).toBeInTheDocument()
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

  await act(async () => {
    render(
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>,
    )
  })

  // FIXME this is not working
  //await screen.findByText('count: 0')

  expect(await screen.findByText('count: 1')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('no child')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 2')).toBeInTheDocument()
})

it('updates an async atom in child useEffect on remount', async () => {
  const toggleAtom = atom(true)
  const countAtom = atom(0)
  const resolve: (() => void)[] = []
  const asyncCountAtom = atom(
    async (get) => {
      await new Promise<void>((r) => resolve.push(r))
      return get(countAtom)
    },
    async (get, set) => {
      await new Promise<void>((r) => resolve.push(r))
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

  await act(async () => {
    render(
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>,
    )
  })

  expect(await screen.findByText('loading')).toBeInTheDocument()

  resolve.splice(0).forEach((fn) => fn())
  expect(await screen.findByText('count: 0')).toBeInTheDocument()

  resolve.splice(0).forEach((fn) => fn())
  await new Promise((r) => setTimeout(r)) // wait for a tick
  resolve.splice(0).forEach((fn) => fn())
  expect(await screen.findByText('count: 1')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('no child')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  resolve.splice(0).forEach((fn) => fn())
  await new Promise((r) => setTimeout(r)) // wait for a tick
  resolve.splice(0).forEach((fn) => fn())
  expect(await screen.findByText('count: 2')).toBeInTheDocument()
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

  await act(async () => {
    render(
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>,
    )
  })

  // FIXME this is not working
  //await screen.findByText('loading')

  await waitFor(() => {
    expect(screen.getByText('count: 1')).toBeInTheDocument()
    expect(screen.getByText('text: resolved')).toBeInTheDocument()
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

  await act(async () => {
    render(
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>,
    )
  })

  // FIXME this is not working
  //await screen.findByText('loading')

  await waitFor(() => {
    expect(screen.getByText('count: 1')).toBeInTheDocument()
    expect(screen.getByText('async: 1')).toBeInTheDocument()
  })

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    expect(screen.getByText('count: 2')).toBeInTheDocument()
    expect(screen.getByText('async: 2')).toBeInTheDocument()
  })
})

it('set promise atom value on write (#304)', async () => {
  const countAtom = atom(Promise.resolve(0))
  let resolve = () => {}
  const asyncAtom = atom(null, (get, set, _arg) => {
    set(
      countAtom,
      Promise.resolve(get(countAtom)).then(
        (c) => new Promise((r) => (resolve = () => r(c + 1))),
      ),
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

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </StrictMode>,
    )
  })

  // FIXME this is not working
  //await screen.findByText('loading')

  expect(await screen.findByText('count: 0')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve()
  expect(await screen.findByText('count: 1')).toBeInTheDocument()
})

it('uses async atom double chain (#306)', async () => {
  const countAtom = atom(0)
  let resolve = () => {}
  const asyncCountAtom = atom(async (get) => {
    await new Promise<void>((r) => (resolve = r))
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
  expect(await screen.findByText('count: 0, delayed: 0')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve()
  expect(await screen.findByText('count: 1, delayed: 1')).toBeInTheDocument()
})

it('uses an async atom that depends on another async atom', async () => {
  let resolve = () => {}
  const asyncAtom = atom(async (get) => {
    await new Promise<void>((r) => (resolve = r))
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
  expect(await screen.findByText('num: 1')).toBeInTheDocument()
})

// FIXME fireEvent.click doesn't work with the patched RTL and React 19-rc.1
it.skip('a derived atom from a newly created async atom (#351)', async () => {
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

  render(
    <>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </>,
  )

  expect(await screen.findByText('loading')).toBeInTheDocument()
  expect(await screen.findByText('derived: 11, commits: 1')).toBeInTheDocument()

  // The use of fireEvent is required to reproduce the issue
  fireEvent.click(screen.getByText('button'))
  expect(await screen.findByText('loading')).toBeInTheDocument()
  expect(await screen.findByText('derived: 12, commits: 2')).toBeInTheDocument()

  // The use of fireEvent is required to reproduce the issue
  fireEvent.click(screen.getByText('button'))
  expect(await screen.findByText('loading')).toBeInTheDocument()
  expect(await screen.findByText('derived: 13, commits: 3')).toBeInTheDocument()
})

it('Handles synchronously invoked async set (#375)', async () => {
  const loadingAtom = atom(false)
  const documentAtom = atom<string | undefined>(undefined)
  let resolve = () => {}
  const loadDocumentAtom = atom(null, (_get, set) => {
    const fetch = async () => {
      set(loadingAtom, true)
      const response = await new Promise<string>(
        (r) => (resolve = () => r('great document')),
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

  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve()
  expect(await screen.findByText('great document')).toBeInTheDocument()
})

it('async write self atom', async () => {
  let resolve = () => {}
  const countAtom = atom(0, async (get, set, _arg) => {
    set(countAtom, get(countAtom) + 1)
    await new Promise<void>((r) => (resolve = r))
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

  expect(await screen.findByText('count: 0')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  resolve()
  expect(await screen.findByText('count: -1')).toBeInTheDocument()
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

  expect(await screen.findByText('count: 0')).toBeInTheDocument()

  // The use of fireEvent is required to reproduce the issue
  fireEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 1')).toBeInTheDocument()
  expect(await screen.findByText('count: -1')).toBeInTheDocument()
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

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Control />
      </StrictMode>,
    )
  })

  expect(await screen.findByText('loading')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 1')).toBeInTheDocument()
})

it('combine two promise atom values (#442)', async () => {
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

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Control />
      </StrictMode>,
    )
  })

  // FIXME this is not working
  //await screen.findByText('loading')

  expect(await screen.findByText('count: 3')).toBeInTheDocument()
})

it('set two promise atoms at once', async () => {
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

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Control />
      </StrictMode>,
    )
  })

  expect(await screen.findByText('loading')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 3')).toBeInTheDocument()
})

it('async write chain', async () => {
  const countAtom = atom(0)
  let resolve1 = () => {}
  const asyncWriteAtom = atom(null, async (_get, set, _arg) => {
    await new Promise<void>((r) => (resolve1 = r))
    set(countAtom, 2)
  })
  let resolve2 = () => {}
  const controlAtom = atom(null, async (_get, set, _arg) => {
    set(countAtom, 1)
    await set(asyncWriteAtom, null)
    await new Promise<void>((r) => (resolve2 = r))
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

  expect(await screen.findByText('count: 0')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 1')).toBeInTheDocument()
  resolve1()
  expect(await screen.findByText('count: 2')).toBeInTheDocument()
  resolve2()
  expect(await screen.findByText('count: 3')).toBeInTheDocument()
})

it('async atom double chain without setTimeout (#751)', async () => {
  const enabledAtom = atom(false)
  let resolve = () => {}
  const asyncAtom = atom(async (get) => {
    const enabled = get(enabledAtom)
    if (!enabled) {
      return 'init'
    }
    await new Promise<void>((r) => (resolve = r))
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

  await act(async () => {
    render(
      <StrictMode>
        <Parent />
      </StrictMode>,
    )
  })

  // FIXME this is not working
  //await screen.findByText('loading')

  expect(await screen.findByText('async: init')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve()
  expect(await screen.findByText('async: ready')).toBeInTheDocument()
})

it('async atom double chain with setTimeout', async () => {
  const enabledAtom = atom(false)
  const resolve: (() => void)[] = []
  const asyncAtom = atom(async (get) => {
    const enabled = get(enabledAtom)
    if (!enabled) {
      return 'init'
    }
    await new Promise<void>((r) => resolve.push(r))
    return 'ready'
  })
  const derivedAsyncAtom = atom(async (get) => {
    await new Promise<void>((r) => resolve.push(r))
    return get(asyncAtom)
  })
  const anotherAsyncAtom = atom(async (get) => {
    await new Promise<void>((r) => resolve.push(r))
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

  await act(async () => {
    render(
      <StrictMode>
        <Parent />
      </StrictMode>,
    )
  })

  resolve.splice(0).forEach((fn) => fn())
  expect(await screen.findByText('loading')).toBeInTheDocument()

  resolve.splice(0).forEach((fn) => fn())
  expect(await screen.findByText('async: init')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve.splice(0).forEach((fn) => fn())
  expect(await screen.findByText('async: ready')).toBeInTheDocument()
})

it('update unmounted async atom with intermediate atom', async () => {
  const enabledAtom = atom(true)
  const countAtom = atom(1)

  const resolve: (() => void)[] = []
  const intermediateAtom = atom((get) => {
    const count = get(countAtom)
    const enabled = get(enabledAtom)
    const tmpAtom = atom(async () => {
      if (!enabled) {
        return -1
      }
      await new Promise<void>((r) => resolve.push(r))
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

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <DerivedCounter />
        </Suspense>
        <Control />
      </StrictMode>,
    )
  })

  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve.splice(0).forEach((fn) => fn())
  expect(await screen.findByText('derived: 2')).toBeInTheDocument()

  await userEvent.click(screen.getByText('toggle enabled'))
  await userEvent.click(screen.getByText('increment count'))
  expect(await screen.findByText('derived: -1')).toBeInTheDocument()

  await userEvent.click(screen.getByText('toggle enabled'))
  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve.splice(0).forEach((fn) => fn())
  expect(await screen.findByText('derived: 4')).toBeInTheDocument()
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

  await waitFor(() => {
    expect(screen.getByText('aName: alpha')).toBeInTheDocument()
    expect(screen.getByText('bName: beta')).toBeInTheDocument()
  })
})
