/* eslint-disable react/no-unescaped-entities */
import { StrictMode, Suspense, useEffect, useRef, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import type { Atom, Getter } from 'jotai/vanilla'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  // eslint-disable-next-line react-hooks/refs
  return commitCountRef.current
}

it('works with 2 level dependencies', () => {
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

  expect(
    screen.getByText('commits: 1, count: 1, doubled: 2, tripled: 6'),
  ).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(
    screen.getByText('commits: 2, count: 2, doubled: 4, tripled: 12'),
  ).toBeInTheDocument()
})

it('works a primitive atom and a dependent async atom', async () => {
  const countAtom = atom(1)
  const doubledAtom = atom(async (get) => {
    await new Promise<void>((r) => setTimeout(r, 100))
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

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback={<div>loading</div>}>
          <Counter />
        </Suspense>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 1, doubled: 2')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  await act(() => vi.advanceTimersByTimeAsync(1))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(99))
  expect(screen.getByText('count: 2, doubled: 4')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('button')))
  await act(() => vi.advanceTimersByTimeAsync(1))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(99))
  expect(screen.getByText('count: 3, doubled: 6')).toBeInTheDocument()
})

it('should keep an atom value even if unmounted', () => {
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

  expect(screen.getByText('count: 0')).toBeInTheDocument()
  expect(screen.getByText('derived: 0')).toBeInTheDocument()

  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('derived: 1')).toBeInTheDocument()

  expect(derivedFn).toHaveReturnedTimes(2)

  fireEvent.click(screen.getByText('toggle'))
  expect(screen.getByText('hidden')).toBeInTheDocument()

  expect(derivedFn).toHaveReturnedTimes(2)

  fireEvent.click(screen.getByText('toggle'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('derived: 1')).toBeInTheDocument()

  expect(derivedFn).toHaveReturnedTimes(2)
})

it('should keep a dependent atom value even if unmounted', () => {
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

  expect(screen.getByText('derived: 0')).toBeInTheDocument()
  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(screen.getByText('toggle'))
  expect(screen.getByText('count: 0')).toBeInTheDocument()
  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(screen.getByText('toggle'))
  expect(screen.getByText('derived: 1')).toBeInTheDocument()
  expect(derivedFn).toHaveReturnedTimes(2)
})

it('should bail out updating if not changed', () => {
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

  expect(screen.getByText('count: 0')).toBeInTheDocument()
  expect(screen.getByText('derived: 0')).toBeInTheDocument()

  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 0')).toBeInTheDocument()
  expect(screen.getByText('derived: 0')).toBeInTheDocument()

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

  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('anotherCount: 10')).toBeInTheDocument()

  expect(getDataCountFn).toHaveReturnedTimes(1)
  expect(getDataObjFn).toHaveReturnedTimes(1)
  expect(getAnotherCountFn).toHaveReturnedTimes(1)

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 2')).toBeInTheDocument()
  expect(screen.getByText('anotherCount: 10')).toBeInTheDocument()

  expect(getDataCountFn).toHaveReturnedTimes(2)
  expect(getDataObjFn).toHaveReturnedTimes(2)
  expect(getAnotherCountFn).toHaveReturnedTimes(1)
})

it('derived atom to update base atom in callback', () => {
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

  expect(
    screen.getByText('commits: 1, count: 1, doubled: 2'),
  ).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(
    screen.getByText('commits: 2, count: 2, doubled: 4'),
  ).toBeInTheDocument()
})

it('can read sync derived atom in write without initializing', () => {
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

  expect(screen.getByText('count: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 3')).toBeInTheDocument()
})

it('can remount atoms with dependency (#490)', () => {
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

  expect(screen.getByText('count: 0')).toBeInTheDocument()
  expect(screen.getByText('derived: 0')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('derived: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('toggle'))
  expect(screen.getByText('hidden')).toBeInTheDocument()

  fireEvent.click(screen.getByText('toggle'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('derived: 1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 2')).toBeInTheDocument()
  expect(screen.getByText('derived: 2')).toBeInTheDocument()
})

it('can remount atoms with intermediate atom', () => {
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

  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('derived: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 2')).toBeInTheDocument()
  expect(screen.getByText('derived: 4')).toBeInTheDocument()

  fireEvent.click(screen.getByText('toggle'))
  expect(screen.getByText('count: 2')).toBeInTheDocument()
  expect(screen.getByText('hidden')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 3')).toBeInTheDocument()
  expect(screen.getByText('hidden')).toBeInTheDocument()

  fireEvent.click(screen.getByText('toggle'))
  expect(screen.getByText('count: 3')).toBeInTheDocument()
  expect(screen.getByText('derived: 6')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 4')).toBeInTheDocument()
  expect(screen.getByText('derived: 8')).toBeInTheDocument()
})

it('can update dependents with useEffect (#512)', () => {
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

  expect(screen.getByText('count: 1')).toBeInTheDocument()
  expect(screen.getByText('derived: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('button'))
  expect(screen.getByText('count: 2')).toBeInTheDocument()
  expect(screen.getByText('derived: 4')).toBeInTheDocument()
})

it('update unmounted atom with intermediate atom', () => {
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

  expect(screen.getByText('derived: 2')).toBeInTheDocument()

  fireEvent.click(screen.getByText('toggle enabled'))
  fireEvent.click(screen.getByText('increment count'))
  expect(screen.getByText('derived: -1')).toBeInTheDocument()

  fireEvent.click(screen.getByText('toggle enabled'))
  expect(screen.getByText('derived: 4')).toBeInTheDocument()
})

it('Should bail for derived sync chains (#877)', () => {
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

  expect(screen.getByText('My very long data')).toBeInTheDocument()

  expect(syncAtomCount).toBe(1)

  fireEvent.click(screen.getByText(`set value to 'hello'`))
  expect(screen.getByText('My very long data')).toBeInTheDocument()

  expect(syncAtomCount).toBe(1)
})

it('Should bail for derived async chains (#877)', async () => {
  let syncAtomCount = 0
  const textAtom = atom('hello')

  const asyncAtom = atom(async (get) => {
    get(textAtom)
    await new Promise((resolve) => setTimeout(resolve, 100))
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

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback={<div>loading</div>}>
          <Input />
          <ForceValue />
        </Suspense>
      </StrictMode>,
    ),
  )

  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('My very long data')).toBeInTheDocument()

  expect(syncAtomCount).toBe(1)

  fireEvent.click(screen.getByText("set value to 'hello'"))
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('My very long data')).toBeInTheDocument()

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

  expect(screen.getByText('alsoCount: 0')).toBeInTheDocument()
  expect(screen.getByText('countIsGreaterThanOne: false')).toBeInTheDocument()

  fireEvent.click(screen.getByText('Increment Count Twice'))
  await act(() => vi.advanceTimersByTime(0))
  expect(screen.getByText('alsoCount: 2')).toBeInTheDocument()
  expect(screen.getByText('countIsGreaterThanOne: true')).toBeInTheDocument()
})

describe('glitch free', () => {
  it('basic', () => {
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

    expect(screen.getByText('value: v0: 0, v1: 0, v2: 0')).toBeInTheDocument()
    expect(computeValue).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('button'))
    expect(screen.getByText('value: v0: 1, v1: 1, v2: 1')).toBeInTheDocument()
    expect(computeValue).toHaveBeenCalledTimes(2)
  })

  it('same value', () => {
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

    expect(screen.getByText('value: 0')).toBeInTheDocument()
    expect(computeValue).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('button'))
    expect(screen.getByText('value: 1')).toBeInTheDocument()
    expect(computeValue).toHaveBeenCalledTimes(2)
  })

  it('double chain', () => {
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

    expect(screen.getByText('value: 0')).toBeInTheDocument()
    expect(computeValue).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('button'))
    expect(screen.getByText('value: 1')).toBeInTheDocument()
    expect(computeValue).toHaveBeenCalledTimes(2)
  })
})

it('should not call read function for unmounted atoms in StrictMode (#2076)', () => {
  const countAtom = atom(1)
  let firstDerivedFn:
    | (((get: Getter) => number) & { mockClear: () => void })
    | undefined

  const Component = () => {
    const memoizedAtomRef = useRef<Atom<number> | null>(null)
    if (!memoizedAtomRef.current) {
      const derivedFn = vi.fn((get: Getter) => get(countAtom))
      if (!firstDerivedFn) {
        // eslint-disable-next-line react-hooks/globals
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

  fireEvent.click(screen.getByText('hide'))
  expect(firstDerivedFn).toBeCalledTimes(1)
  firstDerivedFn?.mockClear()

  fireEvent.click(screen.getByText('show'))
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

  expect(screen.getByText('not running')).toBeInTheDocument()

  fireEvent.click(screen.getByText('Activate'))
  expect(screen.getByText('running')).toBeInTheDocument()
})

it('works with async dependencies (#2565)', async () => {
  const countAtom = atom(0)
  const countUpAction = atom(null, (_get, set) => {
    set(countAtom, (prev) => prev + 1)
  })
  const totalCountAtom = atom(async (get) => {
    const base = await new Promise<number>((resolve) =>
      setTimeout(() => resolve(100), 100),
    )
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
        <Suspense fallback={<div>loading</div>}>
          <Count />
        </Suspense>
      </div>
    )
  }

  await act(() =>
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )

  // FIXME this is not working
  // await screen.findByText('loading')

  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 100')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('Count Up')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 101')).toBeInTheDocument()

  await act(() => fireEvent.click(screen.getByText('Count Up')))
  expect(screen.getByText('loading')).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(screen.getByText('count: 102')).toBeInTheDocument()
})
