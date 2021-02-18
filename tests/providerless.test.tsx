import React, {
  StrictMode,
  Suspense,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom, WritableAtom, useBridge, Bridge } from '../src/index'

it('uses a primitive atom', async () => {
  const countAtom = atom(0)

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
    <>
      <Counter />
    </>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
})

it('uses a read-only derived atom', async () => {
  const countAtom = atom(0)
  const doubledCountAtom = atom((get) => get(countAtom) * 2)

  const Counter: React.FC = () => {
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
    <>
      <Counter />
    </>
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

  const Counter: React.FC = () => {
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
    <>
      <Counter />
    </>
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

  const Counter: React.FC = () => {
    const [count] = useAtom(countAtom)
    return <div>count: {count}</div>
  }

  const Control: React.FC = () => {
    const [, increment] = useAtom(incrementCountAtom)
    return <button onClick={() => increment()}>button</button>
  }

  const { getByText, findByText } = render(
    <>
      <Counter />
      <Control />
    </>
  )

  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
})

it('only re-renders if value has changed', async () => {
  const count1Atom = atom(0)
  const count2Atom = atom(0)
  const productAtom = atom((get) => get(count1Atom) * get(count2Atom))

  type Props = { countAtom: typeof count1Atom; name: string }
  const Counter: React.FC<Props> = ({ countAtom, name }) => {
    const [count, setCount] = useAtom(countAtom)
    const commits = useRef(1)
    useEffect(() => {
      ++commits.current
    })
    return (
      <>
        <div>
          commits: {commits.current}, {name}: {count}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button-{name}</button>
      </>
    )
  }

  const Product: React.FC = () => {
    const [product] = useAtom(productAtom)
    const commits = useRef(1)
    useEffect(() => {
      ++commits.current
    })
    return (
      <>
        <div data-testid="product">
          commits: {commits.current}, product: {product}
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

it('works with async get', async () => {
  const countAtom = atom(0)
  const asyncCountAtom = atom(async (get) => {
    await new Promise((r) => setTimeout(r, 10))
    return get(countAtom)
  })

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const [delayedCount] = useAtom(asyncCountAtom)
    const commits = useRef(1)
    useEffect(() => {
      ++commits.current
    })
    return (
      <>
        <div>
          commits: {commits.current}, count: {count}, delayedCount:{' '}
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
  await findByText('commits: 1, count: 0, delayedCount: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('commits: 2, count: 1, delayedCount: 1')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('commits: 3, count: 2, delayedCount: 2')
})

it('works with async get without setTimeout', async () => {
  const countAtom = atom(0)
  const asyncCountAtom = atom(async (get) => {
    return get(countAtom)
  })

  const Counter: React.FC = () => {
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
    <>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </>
  )

  await findByText('loading')
  await findByText('count: 0, delayedCount: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1, delayedCount: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 2, delayedCount: 2')
})

it('shows loading with async set', async () => {
  const countAtom = atom(0)
  const asyncCountAtom = atom(
    (get) => get(countAtom),
    async (_get, set, value: number) => {
      await new Promise((r) => setTimeout(r, 10))
      set(countAtom, value)
    }
  )

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(asyncCountAtom)
    const commits = useRef(1)
    useEffect(() => {
      ++commits.current
    })
    return (
      <>
        <div>
          commits: {commits.current}, count: {count}
        </div>
        <button onClick={() => setCount(count + 1)}>button</button>
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

  await findByText('commits: 1, count: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')

  await findByText('commits: 2, count: 1')
})

it('uses atoms with tree dependencies', async () => {
  const topAtom = atom(0)
  const leftAtom = atom((get) => get(topAtom))
  const rightAtom = atom(
    (get) => get(topAtom),
    async (get, set, update: (prev: number) => number) => {
      await new Promise((r) => setTimeout(r, 10))
      set(topAtom, update(get(topAtom)))
    }
  )

  const Counter: React.FC = () => {
    const [count] = useAtom(leftAtom)
    const [, setCount] = useAtom(rightAtom)
    const commits = useRef(1)
    useEffect(() => {
      ++commits.current
    })
    return (
      <>
        <div>
          commits: {commits.current}, count: {count}
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

  await findByText('commits: 1, count: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('commits: 2, count: 1')

  fireEvent.click(getByText('button'))
  await findByText('loading')
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

  const Counter: React.FC = () => {
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
      <>
        <Counter />
      </>
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
  const asyncCountAtom = atom(
    null,
    async (get, set, update: (prev: number) => number) => {
      await new Promise((r) => setTimeout(r, 10))
      set(countAtom, update(get(countAtom)))
    }
  )

  const Counter: React.FC = () => {
    const [count] = useAtom(countAtom)
    const [, setCount] = useAtom(asyncCountAtom)
    const commits = useRef(1)
    useEffect(() => {
      ++commits.current
    })
    return (
      <>
        <div>
          commits: {commits.current}, count: {count}
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

  await findByText('commits: 1, count: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')

  await findByText('commits: 2, count: 1')
})

it('uses a writable atom without read function', async () => {
  const countAtom: WritableAtom<number, number> = atom(
    1,
    async (get, set, v) => {
      await new Promise((r) => setTimeout(r, 10))
      set(countAtom, get(countAtom) + 10 * v)
    }
  )

  const Counter: React.FC = () => {
    const [count, addCount10Times] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => addCount10Times(1)}>button</button>
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

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('count: 11')
})

it('can write an atom value on useEffect', async () => {
  const countAtom = atom(0)

  const Counter: React.FC = () => {
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

  const Child: React.FC<{
    setCount: (f: (c: number) => number) => void
  }> = ({ setCount }) => {
    useEffect(() => {
      setCount((c) => c + 1)
    }, [setCount])
    return null
  }

  const Counter: React.FC = () => {
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

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const [doubledCount] = useAtom(doubledCountAtom)
    const commits = useRef(1)
    useEffect(() => {
      ++commits.current
    })
    return (
      <>
        <div>
          commits: {commits.current}, count: {count}, readCount: {readCount},
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

  const Counter: React.FC = () => {
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
    <>
      <Counter />
    </>
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

  const Counter: React.FC = () => {
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

  const Child: React.FC = () => {
    const [countB, setCountB] = useAtom(countBAtom)
    useEffect(() => {
      setCountB((c) => c + 1)
    }, [setCountB])
    return <div>countB: {countB}</div>
  }

  const Counter: React.FC = () => {
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
  const effectFn = jest.fn()

  const Child: React.FC = () => {
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

  const Parent: React.FC = () => {
    const [, setCount] = useAtom(countAtom)
    useEffect(() => {
      setCount(1)
      // requestAnimationFrame(() => setCount(2))
    }, [setCount])
    return <Child />
  }

  const { findByText } = render(
    <>
      <Parent />
    </>
  )

  await findByText('count: 2')
  expect(effectFn).lastCalledWith(2)
})

it('works with Brige', async () => {
  const countAtom = atom(0)

  const Child: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>child: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>child</button>
      </>
    )
  }

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const Parent: React.FC = () => {
    const valueToBridge = useBridge()
    return (
      <>
        <Counter />
        <Bridge value={valueToBridge}>
          <Child />
        </Bridge>
      </>
    )
  }

  const { getByText } = render(
    <>
      <Parent />
    </>
  )

  await waitFor(() => {
    getByText('count: 0')
    getByText('child: 0')
  })

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 1')
    getByText('child: 1')
  })

  fireEvent.click(getByText('child'))
  await waitFor(() => {
    getByText('count: 2')
    getByText('child: 2')
  })
})

it('only relevant render function called (#156)', async () => {
  if (process.env.IS_REACT_EXPERIMENTAL) {
    return // skip this test
  }
  const count1Atom = atom(0)
  const count2Atom = atom(0)

  const Counter1: React.FC = () => {
    const [count, setCount] = useAtom(count1Atom)
    const renderCount = useRef(0)
    ++renderCount.current
    return (
      <>
        <div>
          count1: {count} ({renderCount.current})
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button1</button>
      </>
    )
  }

  const Counter2: React.FC = () => {
    const [count, setCount] = useAtom(count2Atom)
    const renderCount = useRef(0)
    ++renderCount.current
    return (
      <>
        <div>
          count2: {count} ({renderCount.current})
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button2</button>
      </>
    )
  }

  const { getByText } = render(
    <>
      <Counter1 />
      <Counter2 />
    </>
  )

  await waitFor(() => {
    getByText('count1: 0 (1)')
    getByText('count2: 0 (1)')
  })

  fireEvent.click(getByText('button1'))
  await waitFor(() => {
    getByText('count1: 1 (2)')
    getByText('count2: 0 (1)')
  })

  fireEvent.click(getByText('button2'))
  await waitFor(() => {
    getByText('count1: 1 (2)')
    getByText('count2: 1 (2)')
  })
})

it('changes atom from parent (#273, #275)', async () => {
  const atomA = atom({ id: 'a' })
  const atomB = atom({ id: 'b' })

  const Item: React.FC<{ id: string }> = ({ id }) => {
    const a = useMemo(() => (id === 'a' ? atomA : atomB), [id])
    const [atomValue] = useAtom(a)
    const commits = useRef(1)
    useEffect(() => {
      ++commits.current
    })
    return (
      <div>
        commits: {commits.current}, id: {atomValue.id}
      </div>
    )
  }

  const App: React.FC = () => {
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
      <>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
        <Suspense fallback="loading">
          <DelayedCounter />
        </Suspense>
      </>
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
      <>
        <Suspense fallback="loading">
          <Counter />
          <DelayedCounter />
        </Suspense>
      </>
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
      <>
        <Suspense fallback="loading">
          <Child />
          <Child />
        </Suspense>
      </>
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
      <>
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      </>
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
      <>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </>
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
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>
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
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>
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
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>
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
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>
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
      <>
        <Suspense fallback="loading">
          <Parent />
        </Suspense>
      </>
    </StrictMode>
  )

  await findByText('loading')
  await findByText('count: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('count: 1')
})
