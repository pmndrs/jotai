import React, { Fragment, Suspense, useEffect, useRef, useState } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Provider as ProviderOrig, atom, useAtom } from '../src/index'

const Provider = process.env.PROVIDER_LESS_MODE ? Fragment : ProviderOrig

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  return commitCountRef.current
}

const consoleError = console.error
afterEach(() => {
  console.error = consoleError
})

it('works with 2 level dependencies', async () => {
  const countAtom = atom(1)
  const doubledAtom = atom((get) => get(countAtom) * 2)
  const tripledAtom = atom((get) => get(doubledAtom) * 3)

  const Counter: React.FC = () => {
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
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('commits: 1, count: 1, doubled: 2, tripled: 6')

  fireEvent.click(getByText('button'))
  await findByText('commits: 2, count: 2, doubled: 4, tripled: 12')
})

it('works a primitive atom and a dependent async atom', async () => {
  const countAtom = atom(1)
  const doubledAtom = atom(async (get) => {
    await new Promise((r) => setTimeout(r, 10))
    return get(countAtom) * 2
  })

  const Counter: React.FC = () => {
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
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 1, doubled: 2')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('count: 2, doubled: 4')

  fireEvent.click(getByText('button'))
  await findByText('loading')
  await findByText('count: 3, doubled: 6')
})

it('should keep an atom value even if unmounted', async () => {
  const countAtom = atom(0)
  const derivedFn = jest.fn().mockImplementation((get) => get(countAtom))
  const derivedAtom = atom(derivedFn)

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const DerivedCounter: React.FC = () => {
    const [derived] = useAtom(derivedAtom)
    return <div>derived: {derived}</div>
  }

  const Parent: React.FC = () => {
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
    <Provider>
      <Parent />
    </Provider>
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
  const derivedFn = jest.fn().mockImplementation((get) => get(countAtom))
  const derivedAtom = atom(derivedFn)

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const DerivedCounter: React.FC = () => {
    const [derived] = useAtom(derivedAtom)
    return <div>derived: {derived}</div>
  }

  const Parent: React.FC = () => {
    const [showDerived, setShowDerived] = useState(true)
    return (
      <div>
        <button onClick={() => setShowDerived((x) => !x)}>toggle</button>
        {showDerived ? <DerivedCounter /> : <Counter />}
      </div>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Parent />
    </Provider>
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
  const derivedFn = jest.fn().mockImplementation((get) => get(countAtom))
  const derivedAtom = atom(derivedFn)

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(0)}>button</button>
      </>
    )
  }

  const DerivedCounter: React.FC = () => {
    const [derived] = useAtom(derivedAtom)
    return <div>derived: {derived}</div>
  }

  const { getByText } = render(
    <Provider>
      <Counter />
      <DerivedCounter />
    </Provider>
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

it('should bail out updating if not changed (custom equalityFn)', async () => {
  let commits: Record<string, number> = {}

  const useCommitCount = (key: string) => {
    useEffect(() => {
      commits[key] = (commits[key] ?? 0) + 1
    })
  }

  type V = { value: number }

  const countAtom = atom<V>({ value: 0 })
  const derivedFn = jest.fn().mockImplementation((get) => get(countAtom))
  const derivedAtom = atom(derivedFn)
  // @ts-ignore
  derivedAtom.equalityFn = (a: V, b: V) => {
    return a.value === b.value
  }

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    useCommitCount('Counter')
    return (
      <>
        <div>count: {count.value}</div>
        <button onClick={() => setCount((c) => ({ value: 0 }))}>button</button>
      </>
    )
  }

  const DerivedCounter: React.FC = () => {
    const [derived] = useAtom(derivedAtom)
    useCommitCount('DerivedCounter')
    return <div>derived: {derived.value}</div>
  }

  const { getByText } = render(
    <Provider>
      <Counter />
      <DerivedCounter />
    </Provider>
  )

  await waitFor(() => {
    getByText('count: 0')
    getByText('derived: 0')
  })
  expect(commits.Counter).toEqual(1)
  expect(commits.DerivedCounter).toEqual(1)
  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 0')
    getByText('derived: 0')
  })
  expect(commits.Counter).toEqual(2)
  expect(commits.DerivedCounter).toEqual(1)
  expect(derivedFn).toHaveReturnedTimes(2)
})

it('should bail out updating if not changed (custom equalityFn) 2', async () => {
  let commits: Record<string, number> = {}

  const useCommitCount = (key: string) => {
    useEffect(() => {
      commits[key] = (commits[key] ?? 0) + 1
    })
  }

  type V = { value: number }

  const countAtom = atom<V>({ value: 0 })
  // @ts-ignore
  countAtom.equalityFn = (a: V, b: V) => {
    return a.value === b.value
  }

  const derivedFn = jest.fn().mockImplementation((get) => get(countAtom))
  const derivedAtom = atom(derivedFn)

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    useCommitCount('Counter')
    return (
      <>
        <div>count: {count.value}</div>
        <button onClick={() => setCount((c) => ({ value: 0 }))}>button</button>
      </>
    )
  }

  const DerivedCounter: React.FC = () => {
    const [derived] = useAtom(derivedAtom)
    useCommitCount('DerivedCounter')
    return <div>derived: {derived.value}</div>
  }

  const { getByText } = render(
    <Provider>
      <Counter />
      <DerivedCounter />
    </Provider>
  )

  await waitFor(() => {
    getByText('count: 0')
    getByText('derived: 0')
  })
  expect(commits.Counter).toEqual(1)
  expect(commits.DerivedCounter).toEqual(1)
  expect(derivedFn).toHaveReturnedTimes(1)

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 0')
    getByText('derived: 0')
  })
  expect(commits.Counter).toEqual(1)
  expect(commits.DerivedCounter).toEqual(1)
  expect(derivedFn).toHaveReturnedTimes(1)
})

it('should bail out updating if not changed, 2 level', async () => {
  const dataAtom = atom({ count: 1, obj: { anotherCount: 10 } })
  const getDataCountFn = jest
    .fn()
    .mockImplementation((get) => get(dataAtom).count)
  const countAtom = atom(getDataCountFn)
  const getDataObjFn = jest.fn().mockImplementation((get) => get(dataAtom).obj)
  const objAtom = atom(getDataObjFn)
  const getAnotherCountFn = jest
    .fn()
    .mockImplementation((get) => get(objAtom).anotherCount)
  const anotherCountAtom = atom(getAnotherCountFn)

  const Counter: React.FC = () => {
    const [count] = useAtom(countAtom)
    const [, setData] = useAtom(dataAtom)
    return (
      <>
        <div>count: {count}</div>
        <button
          onClick={() =>
            setData((prev) => ({ ...prev, count: prev.count + 1 }))
          }>
          button
        </button>
      </>
    )
  }

  const DerivedCounter: React.FC = () => {
    const [anotherCount] = useAtom(anotherCountAtom)
    return <div>anotherCount: {anotherCount}</div>
  }

  const { getByText } = render(
    <Provider>
      <Counter />
      <DerivedCounter />
    </Provider>
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
    }
  )

  const Counter: React.FC = () => {
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
    <Provider>
      <Counter />
    </Provider>
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

  const Counter: React.FC = () => {
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
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 2')

  fireEvent.click(getByText('button'))
  await findByText('count: 3')
})
