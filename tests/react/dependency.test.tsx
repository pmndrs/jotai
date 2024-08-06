import { StrictMode, Suspense, useEffect, useRef, useState } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import { selectAtom } from 'jotai/utils'
import { atom } from 'jotai/vanilla'
import type { Atom, Getter } from 'jotai/vanilla'

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
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

  const { getByText, findByText } = render(
    <>
      <Counter />
    </>,
  )

  await findByText('commits: 1, count: 1, doubled: 2, tripled: 6')

  fireEvent.click(getByText('button'))
  await findByText('commits: 2, count: 2, doubled: 4, tripled: 12')
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

  const { getByText, findByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>,
  )

  await findByText('loading')
  resolve()
  await findByText('count: 1, doubled: 2')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  resolve()
  await findByText('count: 2, doubled: 4')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  resolve()
  await findByText('count: 3, doubled: 6')
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

  const { getByText } = render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await waitFor(() => {
    getByText('count: 0')
    getByText('derived: 0')
  })
  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 1')
    getByText('derived: 1')
  })
  expect(derivedFn).toHaveReturnedTimes(2)

  fireEvent.click(getByText('toggle'))
  await waitFor(() => {
    getByText('hidden')
  })
  expect(derivedFn).toHaveReturnedTimes(2)

  fireEvent.click(getByText('toggle'))
  await waitFor(() => {
    getByText('count: 1')
    getByText('derived: 1')
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

  const { getByText, findByText } = render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await findByText('derived: 0')
  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(getByText('toggle'))
  await findByText('count: 0')
  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(getByText('toggle'))
  await findByText('derived: 1')
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

  const { getByText } = render(
    <StrictMode>
      <Counter />
      <DerivedCounter />
    </StrictMode>,
  )

  await waitFor(() => {
    getByText('count: 0')
    getByText('derived: 0')
  })
  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 0')
    getByText('derived: 0')
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

  const { getByText } = render(
    <StrictMode>
      <Counter />
      <DerivedCounter />
    </StrictMode>,
  )

  await waitFor(() => {
    getByText('count: 1')
    getByText('anotherCount: 10')
  })
  expect(getDataCountFn).toHaveReturnedTimes(1)
  expect(getDataObjFn).toHaveReturnedTimes(1)
  expect(getAnotherCountFn).toHaveReturnedTimes(1)

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 2')
    getByText('anotherCount: 10')
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

  const { getByText, findByText } = render(
    <>
      <Counter />
    </>,
  )

  await findByText('commits: 1, count: 1, doubled: 2')

  fireEvent.click(getByText('button'))
  await findByText('commits: 2, count: 2, doubled: 4')
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

  const { getByText, findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 2')

  fireEvent.click(getByText('button'))
  await findByText('count: 3')
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

  const { getByText } = render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await waitFor(() => {
    getByText('count: 0')
    getByText('derived: 0')
  })

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 1')
    getByText('derived: 1')
  })

  fireEvent.click(getByText('toggle'))
  await waitFor(() => {
    getByText('hidden')
  })

  fireEvent.click(getByText('toggle'))
  await waitFor(() => {
    getByText('count: 1')
    getByText('derived: 1')
  })

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 2')
    getByText('derived: 2')
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

  const { getByText } = render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await waitFor(() => {
    getByText('count: 1')
    getByText('derived: 2')
  })

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 2')
    getByText('derived: 4')
  })

  fireEvent.click(getByText('toggle'))
  await waitFor(() => {
    getByText('count: 2')
    getByText('hidden')
  })

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 3')
    getByText('hidden')
  })

  fireEvent.click(getByText('toggle'))
  await waitFor(() => {
    getByText('count: 3')
    getByText('derived: 6')
  })

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 4')
    getByText('derived: 8')
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

  const { getByText } = render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await waitFor(() => {
    getByText('count: 1')
    getByText('derived: 2')
  })

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 2')
    getByText('derived: 4')
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

  const { getByText, findByText } = render(
    <StrictMode>
      <DerivedCounter />
      <Control />
    </StrictMode>,
  )

  await findByText('derived: 2')

  fireEvent.click(getByText('toggle enabled'))
  fireEvent.click(getByText('increment count'))
  await findByText('derived: -1')

  fireEvent.click(getByText('toggle enabled'))
  await findByText('derived: 4')
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

  const { getByText, findByText } = render(
    <StrictMode>
      <Input />
      <ForceValue />
    </StrictMode>,
  )

  await findByText('My very long data')
  expect(syncAtomCount).toBe(1)

  fireEvent.click(getByText(`set value to 'hello'`))

  await findByText('My very long data')
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

  const { getByText, findByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Input />
        <ForceValue />
      </Suspense>
    </StrictMode>,
  )

  await findByText('My very long data')
  expect(syncAtomCount).toBe(1)

  fireEvent.click(getByText(`set value to 'hello'`))

  await findByText('My very long data')
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

  const { getByText } = render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  await waitFor(() => {
    getByText('alsoCount: 0')
    getByText('countIsGreaterThanOne: false')
  })

  fireEvent.click(getByText('Increment Count Twice'))
  await waitFor(() => {
    getByText('alsoCount: 2')
    getByText('countIsGreaterThanOne: true')
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

    const { getByText, findByText } = render(
      <StrictMode>
        <App />
        <Control />
      </StrictMode>,
    )

    await findByText('value: v0: 0, v1: 0, v2: 0')
    expect(computeValue).toHaveBeenCalledTimes(1)

    fireEvent.click(getByText('button'))
    await findByText('value: v0: 1, v1: 1, v2: 1')
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

    const { getByText, findByText } = render(
      <StrictMode>
        <App />
        <Control />
      </StrictMode>,
    )

    await findByText('value: 0')
    expect(computeValue).toHaveBeenCalledTimes(1)

    fireEvent.click(getByText('button'))
    await findByText('value: 1')
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

    const { getByText, findByText } = render(
      <StrictMode>
        <App />
        <Control />
      </StrictMode>,
    )

    await findByText('value: 0')
    expect(computeValue).toHaveBeenCalledTimes(1)

    fireEvent.click(getByText('button'))
    await findByText('value: 1')
    expect(computeValue).toHaveBeenCalledTimes(2)
  })
})

it('should not call read function for unmounted atoms in StrictMode (#2076)', async () => {
  const countAtom = atom(1)
  let firstDerivedFn: ReturnType<typeof vi.fn> | undefined

  const Component = () => {
    const memoizedAtomRef = useRef<Atom<number> | null>(null)
    if (!memoizedAtomRef.current) {
      const derivedFn = vi.fn((get: Getter) => get(countAtom))
      if (!firstDerivedFn) {
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

  const { getByText } = render(
    <StrictMode>
      <Main />
    </StrictMode>,
  )

  fireEvent.click(getByText('hide'))
  expect(firstDerivedFn).toBeCalledTimes(1)
  firstDerivedFn?.mockClear()

  fireEvent.click(getByText('show'))
  expect(firstDerivedFn).toBeCalledTimes(0)
})

it('all dependencies should receive updated value', async () => {
  const baseAtom = atom({ name: 'Foo', favoriteNumber: 10 })
  baseAtom.debugLabel = 'baseAtom'
  const favoriteNumberAtom = selectAtom(baseAtom, (val) => val.favoriteNumber)

  const favoriteNumberIsEven = selectAtom(
    favoriteNumberAtom,
    (val) => val % 2 === 0,
  )

  const barsFavoriteNumberAtom = atom((get) => {
    // adding this fixes it, because the optional dependency becomes required.
    // get(favoriteNumberAtom)
    if (get(baseAtom).name === 'Bar') {
      return get(favoriteNumberAtom) // Optionally depend on a derived atom of baseAtom
    }
    return undefined
  })

  /* The above atom structure results in the following topographical sort when processing dependencies
   * - baseAtom
   * - barsFavoriteNumberAtom
   * - favoriteNumberAtom
   * - favoriteNumberIsEven
   *
   * The issue is barsFavoriteNumberAtom now depends on favoriteNumberAtom and should have been sorted below it.
   * The code as-is couldn't know that the dependencies array was going to change.
   */
  const Main = () => {
    const [base, setBase] = useAtom(baseAtom)
    const favoriteNumber = useAtomValue(favoriteNumberAtom)
    const isEven = useAtomValue(favoriteNumberIsEven)
    const barsFavoriteNumber = useAtomValue(barsFavoriteNumberAtom)

    console.debug(`
      name: ${base.name}
      base: ${base.favoriteNumber},
      favoriteNumber: ${favoriteNumber},
      isEven: ${isEven}
      barsFavoriteNumber: ${barsFavoriteNumber}
    `)

    const numberUpToDate = base.favoriteNumber === favoriteNumber
    const evenUpToDate = base.favoriteNumber === barsFavoriteNumber
    const evenIsCorrect = isEven === (base.favoriteNumber % 2 === 0)

    return (
      <>
        <span>{numberUpToDate ? 'Number Sync' : 'Number Desync'}</span>
        <span>{evenUpToDate ? 'Even Sync' : 'Even Desync'}</span>
        <span> {evenIsCorrect ? 'Even Correct' : 'Even Incorrect'}</span>
        <button
          onClick={() =>
            setBase({
              name: 'Bar',
              favoriteNumber: 15,
            })
          }
        >
          clickMe
        </button>
      </>
    )
  }

  const { getByText, findByText, queryByText } = render(
    <StrictMode>
      <Main />
    </StrictMode>,
  )

  await fireEvent.click(getByText('clickMe'))
  await findByText('Number Sync')
  await findByText('Even Sync')
  await findByText('Even Correct')

  expect(queryByText('Number Desync')).toBeNull()
  expect(queryByText('Even Desync')).toBeNull()
  expect(queryByText('Even Incorrect')).toBeNull()
})