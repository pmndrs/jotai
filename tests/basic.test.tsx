import React, { StrictMode, useEffect } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom, WritableAtom } from '../src/index'

it('creates atoms', () => {
  // primitive atom
  const countAtom = atom(0)
  const anotherCountAtom = atom(1)
  // read-only derived atom
  const doubledCountAtom = atom((get) => get(countAtom) * 2)
  // read-write derived atom
  const sumCountAtom = atom(
    (get) => get(countAtom) + get(anotherCountAtom),
    (get, set, value: number) => {
      set(countAtom, get(countAtom) + value / 2)
      set(anotherCountAtom, get(anotherCountAtom) + value / 2)
    }
  )
  // write-only derived atom
  const decrementCountAtom = atom(null, (get, set) => {
    set(countAtom, get(countAtom) - 1)
  })
  expect({
    countAtom,
    doubledCountAtom,
    sumCountAtom,
    decrementCountAtom,
  }).toMatchInlineSnapshot(`
    Object {
      "countAtom": Object {
        "init": 0,
        "key": 1,
        "read": [Function],
        "write": [Function],
      },
      "decrementCountAtom": Object {
        "init": null,
        "key": 5,
        "read": [Function],
        "write": [Function],
      },
      "doubledCountAtom": Object {
        "key": 3,
        "read": [Function],
      },
      "sumCountAtom": Object {
        "key": 4,
        "read": [Function],
        "write": [Function],
      },
    }
  `)
})

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
    <Provider>
      <Counter />
    </Provider>
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

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0')
  await findByText('doubledCount: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
  await findByText('doubledCount: 2')
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

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0')
  await findByText('doubledCount: 0')

  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  await findByText('doubledCount: 4')
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
    <Provider>
      <Counter />
      <Control />
    </Provider>
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
    const renderCount = React.useRef(0)
    return (
      <>
        <div>
          renderCount: {++renderCount.current}, {name}: {count}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button-{name}</button>
      </>
    )
  }

  const Product: React.FC = () => {
    const [product] = useAtom(productAtom)
    const renderCount = React.useRef(0)
    return (
      <>
        <div>
          renderCount: {++renderCount.current}, product: {product}
        </div>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter countAtom={count1Atom} name="count1" />
      <Counter countAtom={count2Atom} name="count2" />
      <Product />
    </Provider>
  )

  await findByText('renderCount: 1, count1: 0')
  await findByText('renderCount: 1, count2: 0')
  await findByText('renderCount: 1, product: 0')

  fireEvent.click(getByText('button-count1'))
  await findByText('renderCount: 2, count1: 1')
  await findByText('renderCount: 1, count2: 0')
  await findByText('renderCount: 1, product: 0')

  fireEvent.click(getByText('button-count2'))
  await findByText('renderCount: 2, count1: 1')
  await findByText('renderCount: 2, count2: 1')
  await findByText('renderCount: 2, product: 1')
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
    const renderCount = React.useRef(0)
    return (
      <>
        <div>
          renderCount: {++renderCount.current}, count: {count}, delayedCount:{' '}
          {delayedCount}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <React.Suspense fallback="loading">
        <Counter />
      </React.Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('renderCount: 1, count: 0, delayedCount: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('renderCount: 2, count: 1, delayedCount: 1')
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
    const renderCount = React.useRef(0)
    return (
      <>
        <div>
          renderCount: {++renderCount.current}, count: {count}
        </div>
        <button onClick={() => setCount(count + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <React.Suspense fallback="loading">
        <Counter />
      </React.Suspense>
    </Provider>
  )

  await findByText('renderCount: 1, count: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')

  await findByText('renderCount: 2, count: 1')
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
    const renderCount = React.useRef(0)
    return (
      <>
        <div>
          renderCount: {++renderCount.current}, count: {count}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <React.Suspense fallback="loading">
        <Counter />
      </React.Suspense>
    </Provider>
  )

  await findByText('renderCount: 1, count: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('renderCount: 2, count: 1')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('renderCount: 3, count: 2')
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
      <Provider>
        <Counter />
      </Provider>
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
    const renderCount = React.useRef(0)
    return (
      <>
        <div>
          renderCount: {++renderCount.current}, count: {count}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <React.Suspense fallback="loading">
        <Counter />
      </React.Suspense>
    </Provider>
  )

  await findByText('renderCount: 1, count: 0')

  fireEvent.click(getByText('button'))
  await findByText('loading')

  await findByText('renderCount: 2, count: 1')
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
    <Provider>
      <React.Suspense fallback="loading">
        <Counter />
      </React.Suspense>
    </Provider>
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
    <Provider>
      <Counter />
    </Provider>
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
    <Provider>
      <Counter />
    </Provider>
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
    const renderCount = React.useRef(0)
    return (
      <>
        <div>
          renderCount: {++renderCount.current}, count: {count}, readCount:{' '}
          {readCount}, doubled: {doubledCount}
        </div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('renderCount: 1, count: 0, readCount: 1, doubled: 0')

  fireEvent.click(getByText('button'))
  await findByText('renderCount: 2, count: 1, readCount: 2, doubled: 2')
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
    <Provider>
      <Counter />
    </Provider>
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
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('countA: 1, countB: 1, sum: 2')

  fireEvent.click(getByText('button'))
  await findByText('countA: 2, countB: 2, sum: 4')
})
