import {
  StrictMode,
  Suspense,
  version as reactVersion,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { unstable_batchedUpdates } from 'react-dom'
import { expect, it, vi } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import type { PrimitiveAtom } from 'jotai/vanilla'

const IS_REACT18 = /^18\./.test(reactVersion)

const batchedUpdates = (fn: () => void) => {
  if (IS_REACT18) {
    fn()
  } else {
    unstable_batchedUpdates(fn)
  }
}

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  return commitCountRef.current
}

it('uses a primitive atom', async () => {
  const countAtom = atom(0)

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
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
})

it('uses a read-only derived atom', async () => {
  const countAtom = atom(0)
  const doubledCountAtom = atom((get) => get(countAtom) * 2)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const [doubledCount] = useAtom(doubledCountAtom)
    return (
      <>
        <div>count: {count}</div>
        <div>doubledCount: {doubledCount}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await waitFor(() => {
    getByText('count: 0')
    getByText('doubledCount: 0')
  })
  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 1')
    getByText('doubledCount: 2')
  })
})

it('uses a read-write derived atom', async () => {
  const countAtom = atom(0)
  const doubledCountAtom = atom(
    (get) => get(countAtom) * 2,
    (get, set, update: number) => set(countAtom, get(countAtom) + update)
  )

  const Counter = () => {
    const [count] = useAtom(countAtom)
    const [doubledCount, increaseCount] = useAtom(doubledCountAtom)
    return (
      <>
        <div>count: {count}</div>
        <div>doubledCount: {doubledCount}</div>
        <button onClick={() => increaseCount(2)}>button</button>
      </>
    )
  }

  const { getByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await waitFor(() => {
    getByText('count: 0')
    getByText('doubledCount: 0')
  })
  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 2')
    getByText('doubledCount: 4')
  })
})

it('uses a write-only derived atom', async () => {
  const countAtom = atom(0)
  const incrementCountAtom = atom(null, (get, set) =>
    set(countAtom, get(countAtom) + 1)
  )

  const Counter = () => {
    const [count] = useAtom(countAtom)
    return (
      <div>
        commits: {useCommitCount()}, count: {count}
      </div>
    )
  }

  const Control = () => {
    const [, increment] = useAtom(incrementCountAtom)
    return (
      <>
        <div>button commits: {useCommitCount()}</div>
        <button onClick={() => increment()}>button</button>
      </>
    )
  }

  const { getByText } = render(
    <>
      <Counter />
      <Control />
    </>
  )

  await waitFor(() => {
    getByText('commits: 1, count: 0')
    getByText('button commits: 1')
  })

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('commits: 2, count: 1')
    getByText('button commits: 1')
  })
})

it('only re-renders if value has changed', async () => {
  const count1Atom = atom(0)
  const count2Atom = atom(0)
  const productAtom = atom((get) => get(count1Atom) * get(count2Atom))

  type Props = { countAtom: typeof count1Atom; name: string }
  const Counter = ({ countAtom, name }: Props) => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>
          commits: {useCommitCount()}, {name}: {count}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button-{name}</button>
      </>
    )
  }

  const Product = () => {
    const [product] = useAtom(productAtom)
    return (
      <>
        <div data-testid="product">
          commits: {useCommitCount()}, product: {product}
        </div>
      </>
    )
  }

  const { getByText } = render(
    <>
      <Counter countAtom={count1Atom} name="count1" />
      <Counter countAtom={count2Atom} name="count2" />
      <Product />
    </>
  )

  await waitFor(() => {
    getByText('commits: 1, count1: 0')
    getByText('commits: 1, count2: 0')
    getByText('commits: 1, product: 0')
  })
  fireEvent.click(getByText('button-count1'))
  await waitFor(() => {
    getByText('commits: 2, count1: 1')
    getByText('commits: 1, count2: 0')
    getByText('commits: 1, product: 0')
  })
  fireEvent.click(getByText('button-count2'))
  await waitFor(() => {
    getByText('commits: 2, count1: 1')
    getByText('commits: 2, count2: 1')
    getByText('commits: 2, product: 1')
  })
})

it('re-renders a time delayed derived atom with the same initial value (#947)', async () => {
  const aAtom = atom(false)
  aAtom.onMount = (set) => {
    setTimeout(() => {
      set(true)
    })
  }

  const bAtom = atom(1)
  bAtom.onMount = (set) => {
    set(2)
  }

  const cAtom = atom((get) => {
    if (get(aAtom)) {
      return get(bAtom)
    }
    return 1
  })

  const App = () => {
    const [value] = useAtom(cAtom)
    return <>{value}</>
  }

  const { findByText } = render(
    <StrictMode>
      <App />
    </StrictMode>
  )

  await findByText('2')
})

it('works with async get', async () => {
  const countAtom = atom(0)
  let resolve = () => {}
  const asyncCountAtom = atom(async (get) => {
    await new Promise<void>((r) => (resolve = r))
    return get(countAtom)
  })

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const [delayedCount] = useAtom(asyncCountAtom)
    return (
      <>
        <div>
          commits: {useCommitCount()}, count: {count}, delayedCount:{' '}
          {delayedCount}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </>
  )

  await findByText('loading')
  resolve()
  await findByText('commits: 1, count: 0, delayedCount: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  resolve()
  await findByText('commits: 2, count: 1, delayedCount: 1')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  resolve()
  await findByText('commits: 3, count: 2, delayedCount: 2')
})

it('works with async get without setTimeout', async () => {
  const countAtom = atom(0)
  const asyncCountAtom = atom(async (get) => {
    return get(countAtom)
  })

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const [delayedCount] = useAtom(asyncCountAtom)
    return (
      <>
        <div>
          count: {count}, delayedCount: {delayedCount}
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
    </StrictMode>
  )

  await findByText('loading')
  await findByText('count: 0, delayedCount: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1, delayedCount: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 2, delayedCount: 2')
})

it('uses atoms with tree dependencies', async () => {
  const topAtom = atom(0)
  const leftAtom = atom((get) => get(topAtom))
  let resolve = () => {}
  const rightAtom = atom(
    (get) => get(topAtom),
    async (get, set, update: (prev: number) => number) => {
      await new Promise<void>((r) => (resolve = r))
      batchedUpdates(() => {
        set(topAtom, update(get(topAtom)))
      })
    }
  )

  const Counter = () => {
    const [count] = useAtom(leftAtom)
    const [, setCount] = useAtom(rightAtom)
    return (
      <>
        <div>
          commits: {useCommitCount()}, count: {count}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <>
      <Counter />
    </>
  )

  await findByText('commits: 1, count: 0')

  fireEvent.click(getByText('button'))
  resolve()
  await findByText('commits: 2, count: 1')

  fireEvent.click(getByText('button'))
  resolve()
  await findByText('commits: 3, count: 2')
})

it('runs update only once in StrictMode', async () => {
  let updateCount = 0
  const countAtom = atom(0)
  const derivedAtom = atom(
    (get) => get(countAtom),
    (_get, set, update: number) => {
      updateCount += 1
      set(countAtom, update)
    }
  )

  const Counter = () => {
    const [count, setCount] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(count + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('count: 0')
  expect(updateCount).toBe(0)

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
  expect(updateCount).toBe(1)
})

it('uses an async write-only atom', async () => {
  const countAtom = atom(0)
  let resolve = () => {}
  const asyncCountAtom = atom(
    null,
    async (get, set, update: (prev: number) => number) => {
      await new Promise<void>((r) => (resolve = r))
      set(countAtom, update(get(countAtom)))
    }
  )

  const Counter = () => {
    const [count] = useAtom(countAtom)
    const [, setCount] = useAtom(asyncCountAtom)
    return (
      <>
        <div>
          commits: {useCommitCount()}, count: {count}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <>
      <Counter />
    </>
  )

  await findByText('commits: 1, count: 0')

  fireEvent.click(getByText('button'))
  resolve()
  await findByText('commits: 2, count: 1')
})

it('uses a writable atom without read function', async () => {
  let resolve = () => {}
  const countAtom = atom(1, async (get, set, v: number) => {
    await new Promise<void>((r) => (resolve = r))
    set(countAtom, get(countAtom) + 10 * v)
  })

  const Counter = () => {
    const [count, addCount10Times] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => addCount10Times(1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  resolve()
  await findByText('count: 11')
})

it('can write an atom value on useEffect', async () => {
  const countAtom = atom(0)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    useEffect(() => {
      setCount((c) => c + 1)
    }, [setCount])
    return <div>count: {count}</div>
  }

  const { findByText } = render(
    <>
      <Counter />
    </>
  )

  await findByText('count: 1')
})

it('can write an atom value on useEffect in children', async () => {
  const countAtom = atom(0)

  const Child = ({
    setCount,
  }: {
    setCount: (f: (c: number) => number) => void
  }) => {
    useEffect(() => {
      setCount((c) => c + 1)
    }, [setCount])
    return null
  }

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <div>
        count: {count}
        <Child setCount={setCount} />
        <Child setCount={setCount} />
      </div>
    )
  }

  const { findByText } = render(
    <>
      <Counter />
    </>
  )

  await findByText('count: 2')
})

it('only invoke read function on use atom', async () => {
  const countAtom = atom(0)
  let readCount = 0
  const doubledCountAtom = atom((get) => {
    readCount += 1
    return get(countAtom) * 2
  })

  expect(readCount).toBe(0) // do not invoke on atom()

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const [doubledCount] = useAtom(doubledCountAtom)
    return (
      <>
        <div>
          commits: {useCommitCount()}, count: {count}, readCount: {readCount},
          doubled: {doubledCount}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <>
      <Counter />
    </>
  )

  await findByText('commits: 1, count: 0, readCount: 1, doubled: 0')

  fireEvent.click(getByText('button'))
  await findByText('commits: 2, count: 1, readCount: 2, doubled: 2')
})

it('uses a read-write derived atom with two primitive atoms', async () => {
  const countAAtom = atom(0)
  const countBAtom = atom(0)
  const sumAtom = atom(
    (get) => get(countAAtom) + get(countBAtom),
    (_get, set) => {
      set(countAAtom, 0)
      set(countBAtom, 0)
    }
  )
  const incBothAtom = atom(null, (get, set) => {
    set(countAAtom, get(countAAtom) + 1)
    set(countBAtom, get(countBAtom) + 1)
  })

  const Counter = () => {
    const [countA, setCountA] = useAtom(countAAtom)
    const [countB, setCountB] = useAtom(countBAtom)
    const [sum, reset] = useAtom(sumAtom)
    const [, incBoth] = useAtom(incBothAtom)
    return (
      <>
        <div>
          countA: {countA}, countB: {countB}, sum: {sum}
        </div>
        <button onClick={() => setCountA((c) => c + 1)}>incA</button>
        <button onClick={() => setCountB((c) => c + 1)}>incB</button>
        <button onClick={reset}>reset</button>
        <button onClick={incBoth}>incBoth</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('countA: 0, countB: 0, sum: 0')

  fireEvent.click(getByText('incA'))
  await findByText('countA: 1, countB: 0, sum: 1')

  fireEvent.click(getByText('incB'))
  await findByText('countA: 1, countB: 1, sum: 2')

  fireEvent.click(getByText('reset'))
  await findByText('countA: 0, countB: 0, sum: 0')

  fireEvent.click(getByText('incBoth'))
  await findByText('countA: 1, countB: 1, sum: 2')
})

it('updates a derived atom in useEffect with two primitive atoms', async () => {
  const countAAtom = atom(0)
  const countBAtom = atom(1)
  const sumAtom = atom((get) => get(countAAtom) + get(countBAtom))

  const Counter = () => {
    const [countA, setCountA] = useAtom(countAAtom)
    const [countB, setCountB] = useAtom(countBAtom)
    const [sum] = useAtom(sumAtom)
    useEffect(() => {
      setCountA((c) => c + 1)
    }, [setCountA, countB])
    return (
      <>
        <div>
          countA: {countA}, countB: {countB}, sum: {sum}
        </div>
        <button onClick={() => setCountB((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <>
      <Counter />
    </>
  )

  await findByText('countA: 1, countB: 1, sum: 2')

  fireEvent.click(getByText('button'))
  await findByText('countA: 2, countB: 2, sum: 4')
})

it('updates two atoms in child useEffect', async () => {
  const countAAtom = atom(0)
  const countBAtom = atom(10)

  const Child = () => {
    const [countB, setCountB] = useAtom(countBAtom)
    useEffect(() => {
      setCountB((c) => c + 1)
    }, [setCountB])
    return <div>countB: {countB}</div>
  }

  const Counter = () => {
    const [countA, setCountA] = useAtom(countAAtom)
    useEffect(() => {
      setCountA((c) => c + 1)
    }, [setCountA])
    return (
      <>
        <div>countA: {countA}</div>
        {countA > 0 && <Child />}
      </>
    )
  }

  const { getByText } = render(
    <>
      <Counter />
    </>
  )

  await waitFor(() => {
    getByText('countA: 1')
    getByText('countB: 11')
  })
})

it('set atom right after useEffect (#208)', async () => {
  const countAtom = atom(0)
  const effectFn = vi.fn()

  const Child = () => {
    const [count, setCount] = useAtom(countAtom)
    const [, setState] = useState(null)
    // rAF does not repro, so schedule update intentionally in render
    if (count === 1) {
      Promise.resolve().then(() => {
        setCount(2)
      })
    }
    useEffect(() => {
      effectFn(count)
      setState(null) // this is important to repro (set something stable)
    }, [count, setState])
    return <div>count: {count}</div>
  }

  const Parent = () => {
    const [, setCount] = useAtom(countAtom)
    useEffect(() => {
      setCount(1)
      // requestAnimationFrame(() => setCount(2))
    }, [setCount])
    return <Child />
  }

  const { findByText } = render(
    <StrictMode>
      <Parent />
    </StrictMode>
  )

  await findByText('count: 2')
  expect(effectFn).toHaveBeenLastCalledWith(2)
})

it('changes atom from parent (#273, #275)', async () => {
  const atomA = atom({ id: 'a' })
  const atomB = atom({ id: 'b' })

  const Item = ({ id }: { id: string }) => {
    const a = useMemo(() => (id === 'a' ? atomA : atomB), [id])
    const [atomValue] = useAtom(a)
    return (
      <div>
        commits: {useCommitCount()}, id: {atomValue.id}
      </div>
    )
  }

  const App = () => {
    const [id, setId] = useState('a')
    return (
      <div>
        <button onClick={() => setId('a')}>atom a</button>
        <button onClick={() => setId('b')}>atom b</button>
        <Item id={id} />
      </div>
    )
  }

  const { getByText, findByText } = render(
    <>
      <App />
    </>
  )

  await findByText('commits: 1, id: a')

  fireEvent.click(getByText('atom a'))
  await findByText('commits: 1, id: a')

  fireEvent.click(getByText('atom b'))
  await findByText('commits: 2, id: b')

  fireEvent.click(getByText('atom a'))
  await findByText('commits: 3, id: a')
})

it('should be able to use a double derived atom twice and useEffect (#373)', async () => {
  const countAtom = atom(0)
  const doubleAtom = atom((get) => get(countAtom) * 2)
  const fourfoldAtom = atom((get) => get(doubleAtom) * 2)

  const App = () => {
    const [count, setCount] = useAtom(countAtom)
    const [fourfold] = useAtom(fourfoldAtom)
    const [fourfold2] = useAtom(fourfoldAtom)

    useEffect(() => {
      setCount(count)
    }, [count, setCount])

    return (
      <div>
        count: {count},{fourfold},{fourfold2}
        <button onClick={() => setCount((c) => c + 1)}>one up</button>
      </div>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <App />
    </StrictMode>
  )

  await findByText('count: 0,0,0')
  fireEvent.click(getByText('one up'))
  await findByText('count: 1,4,4')
})

it('write self atom (undocumented usage)', async () => {
  const countAtom = atom(0, (get, set, _arg) => {
    set(countAtom, get(countAtom) + 1)
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

  const { getByText, findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
})

it('async chain for multiple sync and async atoms (#443)', async () => {
  const num1Atom = atom(async () => {
    return 1
  })
  const num2Atom = atom(async () => {
    return 2
  })

  // "async" is required to reproduce the issue
  const sumAtom = atom(
    async (get) => (await get(num1Atom)) + (await get(num2Atom))
  )
  const countAtom = atom((get) => get(sumAtom))

  const Counter = () => {
    const [count] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }
  const { findByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>
  )

  await findByText('loading')
  await findByText('count: 3')
})

it('sync re-renders with useState re-renders (#827)', async () => {
  const atom0 = atom('atom0')
  const atom1 = atom('atom1')
  const atom2 = atom('atom2')
  const atoms = [atom0, atom1, atom2]

  const App = () => {
    const [currentAtomIndex, setCurrentAtomIndex] = useState(0)
    const rotateAtoms = () => {
      setCurrentAtomIndex((prev) => (prev + 1) % atoms.length)
    }
    const [atomValue] = useAtom(
      atoms[currentAtomIndex] as (typeof atoms)[number]
    )

    return (
      <>
        <span>commits: {useCommitCount()}</span>
        <h1>{atomValue}</h1>
        <button onClick={rotateAtoms}>rotate</button>
      </>
    )
  }
  const { findByText, getByText } = render(
    <>
      <App />
    </>
  )

  await findByText('commits: 1')
  fireEvent.click(getByText('rotate'))
  await findByText('commits: 2')
  fireEvent.click(getByText('rotate'))
  await findByText('commits: 3')
})

it('chained derive atom with onMount and useEffect (#897)', async () => {
  const countAtom = atom(0)
  countAtom.onMount = (set) => {
    set(1)
  }
  const derivedAtom = atom((get) => get(countAtom))
  const derivedObjectAtom = atom((get) => ({
    count: get(derivedAtom),
  }))

  const Counter = () => {
    const [, setCount] = useAtom(countAtom)
    const [{ count }] = useAtom(derivedObjectAtom)
    useEffect(() => {
      setCount(1)
    }, [setCount])
    return <div>count: {count}</div>
  }

  const { findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('count: 1')
})

it('onMount is not called when atom value is accessed from writeGetter in derived atom (#942)', async () => {
  const onUnmount = vi.fn()
  const onMount = vi.fn(() => {
    return onUnmount
  })

  const aAtom = atom(false)
  aAtom.onMount = onMount

  const bAtom = atom(null, (get) => {
    get(aAtom)
  })

  const App = () => {
    const [, action] = useAtom(bAtom)
    useEffect(() => action(), [action])
    return null
  }

  render(
    <StrictMode>
      <App />
    </StrictMode>
  )

  expect(onMount).not.toHaveBeenCalled()
  expect(onUnmount).not.toHaveBeenCalled()
})

it('useAtom returns consistent value with input with changing atoms (#1235)', async () => {
  const countAtom = atom(0)
  const valueAtoms = [atom(0), atom(1)]

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const [value] = useAtom(valueAtoms[count] as PrimitiveAtom<number>)
    if (count !== value) {
      throw new Error('value mismatch')
    }
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
})
