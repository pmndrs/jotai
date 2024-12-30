import { StrictMode, Suspense, useEffect, useRef, useState } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEventOrig from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import type { Atom, Getter } from 'jotai/vanilla'

const userEvent = {
  click: (element: Element) => act(() => userEventOrig.click(element)),
}

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  // eslint-disable-next-line react-compiler/react-compiler
  return commitCountRef.current
}

it('works with 2 level dependencies', async () => {
  const countAtom = atom(1)
  const doubledAtom = atom((get) => get(countAtom) * 2)
  const tripledAtom = atom((get) => get(doubledAtom) * 3)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const [doubledCount] = useAtom(doubledAtom)
    const [tripledCount] = useAtom(tripledAtom)
    return (
      <>
        <div>
          commits: {useCommitCount()}, count: {count}, doubled: {doubledCount},
          tripled: {tripledCount}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  render(
    <>
      <Counter />
    </>,
  )

  await screen.findByText('commits: 1, count: 1, doubled: 2, tripled: 6')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('commits: 2, count: 2, doubled: 4, tripled: 12')
})

it('works a primitive atom and a dependent async atom', async () => {
  const countAtom = atom(1)
  let resolve = () => {}
  const doubledAtom = atom(async (get) => {
    await new Promise<void>((r) => (resolve = r))
    return get(countAtom) * 2
  })

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const [doubledCount] = useAtom(doubledAtom)
    return (
      <>
        <div>
          count: {count}, doubled: {doubledCount}
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

  await screen.findByText('loading')
  resolve()
  await screen.findByText('count: 1, doubled: 2')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('loading')
  resolve()
  await screen.findByText('count: 2, doubled: 4')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('loading')
  resolve()
  await screen.findByText('count: 3, doubled: 6')
})

it('should keep an atom value even if unmounted', async () => {
  const countAtom = atom(0)
  const derivedFn = vi.fn((get: Getter) => get(countAtom))
  const derivedAtom = atom(derivedFn)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const DerivedCounter = () => {
    const [derived] = useAtom(derivedAtom)
    return <div>derived: {derived}</div>
  }

  const Parent = () => {
    const [show, setShow] = useState(true)
    return (
      <div>
        <button onClick={() => setShow((x) => !x)}>toggle</button>
        {show ? (
          <>
            <Counter />
            <DerivedCounter />
          </>
        ) : (
          <div>hidden</div>
        )}
      </div>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await waitFor(() => {
    screen.getByText('count: 0')
    screen.getByText('derived: 0')
  })
  expect(derivedFn).toHaveReturnedTimes(1)

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 1')
    screen.getByText('derived: 1')
  })
  expect(derivedFn).toHaveReturnedTimes(2)

  await userEvent.click(screen.getByText('toggle'))
  await waitFor(() => {
    screen.getByText('hidden')
  })
  expect(derivedFn).toHaveReturnedTimes(2)

  await userEvent.click(screen.getByText('toggle'))
  await waitFor(() => {
    screen.getByText('count: 1')
    screen.getByText('derived: 1')
  })
  expect(derivedFn).toHaveReturnedTimes(2)
})

it('should keep a dependent atom value even if unmounted', async () => {
  const countAtom = atom(0)
  const derivedFn = vi.fn((get: Getter) => get(countAtom))
  const derivedAtom = atom(derivedFn)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const DerivedCounter = () => {
    const [derived] = useAtom(derivedAtom)
    return <div>derived: {derived}</div>
  }

  const Parent = () => {
    const [showDerived, setShowDerived] = useState(true)
    return (
      <div>
        <button onClick={() => setShowDerived((x) => !x)}>toggle</button>
        {showDerived ? <DerivedCounter /> : <Counter />}
      </div>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await screen.findByText('derived: 0')
  expect(derivedFn).toHaveReturnedTimes(1)

  await userEvent.click(screen.getByText('toggle'))
  await screen.findByText('count: 0')
  expect(derivedFn).toHaveReturnedTimes(1)

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('count: 1')
  expect(derivedFn).toHaveReturnedTimes(1)

  await userEvent.click(screen.getByText('toggle'))
  await screen.findByText('derived: 1')
  expect(derivedFn).toHaveReturnedTimes(2)
})

it('should bail out updating if not changed', async () => {
  const countAtom = atom(0)
  const derivedFn = vi.fn((get: Getter) => get(countAtom))
  const derivedAtom = atom(derivedFn)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(0)}>button</button>
      </>
    )
  }

  const DerivedCounter = () => {
    const [derived] = useAtom(derivedAtom)
    return <div>derived: {derived}</div>
  }

  render(
    <StrictMode>
      <Counter />
      <DerivedCounter />
    </StrictMode>,
  )

  await waitFor(() => {
    screen.getByText('count: 0')
    screen.getByText('derived: 0')
  })
  expect(derivedFn).toHaveReturnedTimes(1)

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 0')
    screen.getByText('derived: 0')
  })
  expect(derivedFn).toHaveReturnedTimes(1)
})

it('should bail out updating if not changed, 2 level', async () => {
  const dataAtom = atom({ count: 1, obj: { anotherCount: 10 } })
  const getDataCountFn = vi.fn((get: Getter) => get(dataAtom).count)
  const countAtom = atom(getDataCountFn)
  const getDataObjFn = vi.fn((get: Getter) => get(dataAtom).obj)
  const objAtom = atom(getDataObjFn)
  const getAnotherCountFn = vi.fn((get: Getter) => get(objAtom).anotherCount)
  const anotherCountAtom = atom(getAnotherCountFn)

  const Counter = () => {
    const [count] = useAtom(countAtom)
    const [, setData] = useAtom(dataAtom)
    return (
      <>
        <div>count: {count}</div>
        <button
          onClick={() =>
            setData((prev) => ({ ...prev, count: prev.count + 1 }))
          }
        >
          button
        </button>
      </>
    )
  }

  const DerivedCounter = () => {
    const [anotherCount] = useAtom(anotherCountAtom)
    return <div>anotherCount: {anotherCount}</div>
  }

  render(
    <StrictMode>
      <Counter />
      <DerivedCounter />
    </StrictMode>,
  )

  await waitFor(() => {
    screen.getByText('count: 1')
    screen.getByText('anotherCount: 10')
  })
  expect(getDataCountFn).toHaveReturnedTimes(1)
  expect(getDataObjFn).toHaveReturnedTimes(1)
  expect(getAnotherCountFn).toHaveReturnedTimes(1)

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 2')
    screen.getByText('anotherCount: 10')
  })
  expect(getDataCountFn).toHaveReturnedTimes(2)
  expect(getDataObjFn).toHaveReturnedTimes(2)
  expect(getAnotherCountFn).toHaveReturnedTimes(1)
})

it('derived atom to update base atom in callback', async () => {
  const countAtom = atom(1)
  const doubledAtom = atom(
    (get) => get(countAtom) * 2,
    (_get, _set, callback: () => void) => {
      callback()
    },
  )

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const [doubledCount, dispatch] = useAtom(doubledAtom)
    return (
      <>
        <div>
          commits: {useCommitCount()}, count: {count}, doubled: {doubledCount}
        </div>
        <button onClick={() => dispatch(() => setCount((c) => c + 1))}>
          button
        </button>
      </>
    )
  }

  render(
    <>
      <Counter />
    </>,
  )

  await screen.findByText('commits: 1, count: 1, doubled: 2')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('commits: 2, count: 2, doubled: 4')
})

it('can read sync derived atom in write without initializing', async () => {
  const countAtom = atom(1)
  const doubledAtom = atom((get) => get(countAtom) * 2)
  const addAtom = atom(null, (get, set, num: number) => {
    set(countAtom, get(doubledAtom) / 2 + num)
  })

  const Counter = () => {
    const [count] = useAtom(countAtom)
    const [, add] = useAtom(addAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => add(1)}>button</button>
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
})

it('can remount atoms with dependency (#490)', async () => {
  const countAtom = atom(0)
  const derivedAtom = atom((get) => get(countAtom))

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const DerivedCounter = () => {
    const [derived] = useAtom(derivedAtom)
    return <div>derived: {derived}</div>
  }

  const Parent = () => {
    const [showChildren, setShowChildren] = useState(true)
    return (
      <div>
        <button onClick={() => setShowChildren((x) => !x)}>toggle</button>
        {showChildren ? (
          <>
            <Counter />
            <DerivedCounter />
          </>
        ) : (
          <div>hidden</div>
        )}
      </div>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await waitFor(() => {
    screen.getByText('count: 0')
    screen.getByText('derived: 0')
  })

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 1')
    screen.getByText('derived: 1')
  })

  await userEvent.click(screen.getByText('toggle'))
  await waitFor(() => {
    screen.getByText('hidden')
  })

  await userEvent.click(screen.getByText('toggle'))
  await waitFor(() => {
    screen.getByText('count: 1')
    screen.getByText('derived: 1')
  })

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 2')
    screen.getByText('derived: 2')
  })
})

it('can remount atoms with intermediate atom', async () => {
  const countAtom = atom(1)

  const resultAtom = atom(0)
  const intermediateAtom = atom((get) => {
    const count = get(countAtom)
    const initAtom = atom(null, (_get, set) => {
      set(resultAtom, count * 2)
    })
    initAtom.onMount = (init) => {
      init()
    }
    return initAtom
  })
  const derivedAtom = atom((get) => {
    const initAtom = get(intermediateAtom)
    get(initAtom)
    return get(resultAtom)
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

  const DerivedCounter = () => {
    const [derived] = useAtom(derivedAtom)
    return <div>derived: {derived}</div>
  }

  const Parent = () => {
    const [showChildren, setShowChildren] = useState(true)
    return (
      <div>
        <Counter />
        <button onClick={() => setShowChildren((x) => !x)}>toggle</button>
        {showChildren ? <DerivedCounter /> : <div>hidden</div>}
      </div>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await waitFor(() => {
    screen.getByText('count: 1')
    screen.getByText('derived: 2')
  })

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 2')
    screen.getByText('derived: 4')
  })

  await userEvent.click(screen.getByText('toggle'))
  await waitFor(() => {
    screen.getByText('count: 2')
    screen.getByText('hidden')
  })

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 3')
    screen.getByText('hidden')
  })

  await userEvent.click(screen.getByText('toggle'))
  await waitFor(() => {
    screen.getByText('count: 3')
    screen.getByText('derived: 6')
  })

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 4')
    screen.getByText('derived: 8')
  })
})

it('can update dependents with useEffect (#512)', async () => {
  const enabledAtom = atom(false)
  const countAtom = atom(1)

  const derivedAtom = atom((get) => {
    const enabled = get(enabledAtom)
    if (!enabled) {
      return 0
    }
    const count = get(countAtom)
    return count * 2
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

  const DerivedCounter = () => {
    const [derived] = useAtom(derivedAtom)
    return <div>derived: {derived}</div>
  }

  const Parent = () => {
    const [, setEnabled] = useAtom(enabledAtom)
    useEffect(() => {
      setEnabled(true)
    }, [setEnabled])
    return (
      <div>
        <Counter />
        <DerivedCounter />
      </div>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await waitFor(() => {
    screen.getByText('count: 1')
    screen.getByText('derived: 2')
  })

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 2')
    screen.getByText('derived: 4')
  })
})

it('update unmounted atom with intermediate atom', async () => {
  const enabledAtom = atom(true)
  const countAtom = atom(1)

  const intermediateAtom = atom((get) => {
    const count = get(countAtom)
    const enabled = get(enabledAtom)
    const tmpAtom = atom(enabled ? count * 2 : -1)
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

  render(
    <StrictMode>
      <DerivedCounter />
      <Control />
    </StrictMode>,
  )

  await screen.findByText('derived: 2')

  await userEvent.click(screen.getByText('toggle enabled'))
  await userEvent.click(screen.getByText('increment count'))
  await screen.findByText('derived: -1')

  await userEvent.click(screen.getByText('toggle enabled'))
  await screen.findByText('derived: 4')
})

it('Should bail for derived sync chains (#877)', async () => {
  let syncAtomCount = 0
  const textAtom = atom('hello')

  const syncAtom = atom((get) => {
    get(textAtom)
    syncAtomCount++
    return 'My very long data'
  })

  const derivedAtom = atom((get) => {
    return get(syncAtom)
  })

  const Input = () => {
    const [result] = useAtom(derivedAtom)
    return <div>{result}</div>
  }

  const ForceValue = () => {
    const setText = useAtom(textAtom)[1]
    return (
      <div>
        <button onClick={() => setText('hello')}>set value to 'hello'</button>
      </div>
    )
  }

  render(
    <StrictMode>
      <Input />
      <ForceValue />
    </StrictMode>,
  )

  await screen.findByText('My very long data')
  expect(syncAtomCount).toBe(1)

  await userEvent.click(screen.getByText(`set value to 'hello'`))

  await screen.findByText('My very long data')
  expect(syncAtomCount).toBe(1)
})

it('Should bail for derived async chains (#877)', async () => {
  let syncAtomCount = 0
  const textAtom = atom('hello')

  const asyncAtom = atom(async (get) => {
    get(textAtom)
    syncAtomCount++
    return 'My very long data'
  })

  const derivedAtom = atom((get) => {
    return get(asyncAtom)
  })

  const Input = () => {
    const [result] = useAtom(derivedAtom)
    return <div>{result}</div>
  }

  const ForceValue = () => {
    const setText = useAtom(textAtom)[1]
    return (
      <div>
        <button onClick={() => setText('hello')}>set value to 'hello'</button>
      </div>
    )
  }

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Input />
          <ForceValue />
        </Suspense>
      </StrictMode>,
    )
  })

  await screen.findByText('My very long data')
  expect(syncAtomCount).toBe(1)

  await userEvent.click(screen.getByText(`set value to 'hello'`))

  await screen.findByText('My very long data')
  expect(syncAtomCount).toBe(1)
})

it('update correctly with async updates (#1250)', async () => {
  const countAtom = atom(0)

  const countIsGreaterThanOneAtom = atom((get) => get(countAtom) > 1)

  const alsoCountAtom = atom((get) => {
    const count = get(countAtom)
    get(countIsGreaterThanOneAtom)
    return count
  })

  const App = () => {
    const setCount = useSetAtom(countAtom)
    const alsoCount = useAtomValue(alsoCountAtom)
    const countIsGreaterThanOne = useAtomValue(countIsGreaterThanOneAtom)
    const incrementCountTwice = () => {
      setTimeout(() => setCount((count) => count + 1))
      setTimeout(() => setCount((count) => count + 1))
    }
    return (
      <div>
        <button onClick={incrementCountTwice}>Increment Count Twice</button>
        <div>alsoCount: {alsoCount}</div>
        <div>countIsGreaterThanOne: {countIsGreaterThanOne.toString()}</div>
      </div>
    )
  }

  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  await waitFor(() => {
    screen.getByText('alsoCount: 0')
    screen.getByText('countIsGreaterThanOne: false')
  })

  await userEvent.click(screen.getByText('Increment Count Twice'))
  await waitFor(() => {
    screen.getByText('alsoCount: 2')
    screen.getByText('countIsGreaterThanOne: true')
  })
})

describe('glitch free', () => {
  it('basic', async () => {
    const baseAtom = atom(0)
    const derived1Atom = atom((get) => get(baseAtom))
    const derived2Atom = atom((get) => get(derived1Atom))
    const computeValue = vi.fn((get: Getter) => {
      const v0 = get(baseAtom)
      const v1 = get(derived1Atom)
      const v2 = get(derived2Atom)
      return `v0: ${v0}, v1: ${v1}, v2: ${v2}`
    })
    const derived3Atom = atom(computeValue)

    const App = () => {
      const value = useAtomValue(derived3Atom)
      return <div>value: {value}</div>
    }

    const Control = () => {
      const setCount = useSetAtom(baseAtom)
      return (
        <>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
        </>
      )
    }

    render(
      <StrictMode>
        <App />
        <Control />
      </StrictMode>,
    )

    await screen.findByText('value: v0: 0, v1: 0, v2: 0')
    expect(computeValue).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByText('button'))
    await screen.findByText('value: v0: 1, v1: 1, v2: 1')
    expect(computeValue).toHaveBeenCalledTimes(2)
  })

  it('same value', async () => {
    const baseAtom = atom(0)
    const derived1Atom = atom((get) => get(baseAtom) * 0)
    const derived2Atom = atom((get) => get(derived1Atom) * 0)
    const computeValue = vi.fn((get: Getter) => {
      const v0 = get(baseAtom)
      const v1 = get(derived1Atom)
      const v2 = get(derived2Atom)
      return v0 + (v1 - v2)
    })
    const derived3Atom = atom(computeValue)

    const App = () => {
      const value = useAtomValue(derived3Atom)
      return <div>value: {value}</div>
    }

    const Control = () => {
      const setCount = useSetAtom(baseAtom)
      return (
        <>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
        </>
      )
    }

    render(
      <StrictMode>
        <App />
        <Control />
      </StrictMode>,
    )

    await screen.findByText('value: 0')
    expect(computeValue).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByText('button'))
    await screen.findByText('value: 1')
    expect(computeValue).toHaveBeenCalledTimes(2)
  })

  it('double chain', async () => {
    const baseAtom = atom(0)
    const derived1Atom = atom((get) => get(baseAtom))
    const derived2Atom = atom((get) => get(derived1Atom))
    const derived3Atom = atom((get) => get(derived2Atom))
    const computeValue = vi.fn((get: Getter) => {
      const v0 = get(baseAtom)
      const v1 = get(derived1Atom)
      const v2 = get(derived2Atom)
      const v3 = get(derived3Atom)
      return v0 + (v1 - v2) + v3 * 0
    })
    const derived4Atom = atom(computeValue)

    const App = () => {
      const value = useAtomValue(derived4Atom)
      return <div>value: {value}</div>
    }

    const Control = () => {
      const setCount = useSetAtom(baseAtom)
      return (
        <>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
        </>
      )
    }

    render(
      <StrictMode>
        <App />
        <Control />
      </StrictMode>,
    )

    await screen.findByText('value: 0')
    expect(computeValue).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByText('button'))
    await screen.findByText('value: 1')
    expect(computeValue).toHaveBeenCalledTimes(2)
  })
})

it('should not call read function for unmounted atoms in StrictMode (#2076)', async () => {
  const countAtom = atom(1)
  let firstDerivedFn:
    | (((get: Getter) => number) & { mockClear: () => void })
    | undefined

  const Component = () => {
    const memoizedAtomRef = useRef<Atom<number> | null>(null)
    if (!memoizedAtomRef.current) {
      const derivedFn = vi.fn((get: Getter) => get(countAtom))
      if (!firstDerivedFn) {
        // eslint-disable-next-line react-compiler/react-compiler
        firstDerivedFn = derivedFn
      }
      memoizedAtomRef.current = atom(derivedFn)
    }
    useAtomValue(memoizedAtomRef.current)
    return null
  }

  const Main = () => {
    const [show, setShow] = useState(true)
    const setCount = useSetAtom(countAtom)
    return (
      <>
        <button onClick={() => setShow(false)}>hide</button>
        <button
          onClick={() => {
            setShow(true)
            setCount((c) => c + 1)
          }}
        >
          show
        </button>
        {show && <Component />}
      </>
    )
  }

  render(
    <StrictMode>
      <Main />
    </StrictMode>,
  )

  await userEvent.click(screen.getByText('hide'))
  expect(firstDerivedFn).toBeCalledTimes(1)
  firstDerivedFn?.mockClear()

  await userEvent.click(screen.getByText('show'))
  expect(firstDerivedFn).toBeCalledTimes(0)
})

it('works with unused hook (#2554)', async () => {
  const isFooAtom = atom(false)
  const isBarAtom = atom(false)
  const isActive1Atom = atom<boolean>((get) => {
    return get(isFooAtom) && get(isBarAtom)
  })
  const isActive2Atom = atom<boolean>((get) => {
    return get(isFooAtom) && get(isActive1Atom)
  })
  const activateAction = atom(undefined, async (_get, set) => {
    set(isFooAtom, true)
    set(isBarAtom, true)
  })

  const App = () => {
    const activate = useSetAtom(activateAction)
    useAtomValue(isActive1Atom)
    const isRunning = useAtomValue(isActive2Atom)
    return (
      <div>
        <button onClick={() => activate()}>Activate</button>
        {isRunning ? 'running' : 'not running'}
      </div>
    )
  }

  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  await screen.findByText('not running')

  await userEvent.click(screen.getByText('Activate'))
  await screen.findByText('running')
})

it('works with async dependencies (#2565)', async () => {
  const countAtom = atom(0)
  const countUpAction = atom(null, (_get, set) => {
    set(countAtom, (prev) => prev + 1)
  })
  const totalCountAtom = atom(async (get) => {
    const base = await Promise.resolve(100)
    const count = get(countAtom)
    return base + count
  })

  const Count = () => {
    const count = useAtomValue(totalCountAtom)
    return <p>count: {count}</p>
  }
  const App = () => {
    const up = useSetAtom(countUpAction)
    return (
      <div>
        <button onClick={up}>Count Up</button>
        <Suspense fallback="loading">
          <Count />
        </Suspense>
      </div>
    )
  }

  await act(async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })

  // FIXME this is not working
  //await screen.findByText('loading')

  await screen.findByText('count: 100')

  await userEvent.click(screen.getByText('Count Up'))
  await screen.findByText('count: 101')

  await userEvent.click(screen.getByText('Count Up'))
  await screen.findByText('count: 102')
})
