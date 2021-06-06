import React, { Suspense, useState, useEffect } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { atom, useAtom } from '../src/index'
import { getTestProvider } from './testUtils'

const Provider = getTestProvider()

const consoleError = console.error
beforeEach(() => {
  console.error = jest.fn()
})
afterEach(() => {
  console.error = consoleError
})

class ErrorBoundary extends React.Component<
  { message?: string },
  { hasError: boolean }
> {
  constructor(props: { message?: string }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    return this.state.hasError ? (
      <div>{this.props.message || 'errored'}</div>
    ) : (
      this.props.children
    )
  }
}

it('can throw an initial error in read function', async () => {
  const errorAtom = atom(() => {
    throw new Error()
  })

  const Counter: React.FC = () => {
    useAtom(errorAtom)
    return (
      <>
        <div>no error</div>
      </>
    )
  }

  const { findByText } = render(
    <Provider>
      <ErrorBoundary>
        <Counter />
      </ErrorBoundary>
    </Provider>
  )

  await findByText('errored')
})

it('can throw an error in read function', async () => {
  const countAtom = atom(0)
  const errorAtom = atom((get) => {
    if (get(countAtom) === 0) {
      return 0
    }
    throw new Error()
  })

  const Counter: React.FC = () => {
    const [, setCount] = useAtom(countAtom)
    const [count] = useAtom(errorAtom)
    return (
      <>
        <div>count: {count}</div>
        <div>no error</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <ErrorBoundary>
        <Counter />
      </ErrorBoundary>
    </Provider>
  )

  await findByText('no error')

  fireEvent.click(getByText('button'))
  await findByText('errored')
})

it('can throw an initial chained error in read function', async () => {
  const errorAtom = atom(() => {
    throw new Error()
  })
  const derivedAtom = atom((get) => get(errorAtom))

  const Counter: React.FC = () => {
    useAtom(derivedAtom)
    return (
      <>
        <div>no error</div>
      </>
    )
  }

  const { findByText } = render(
    <Provider>
      <ErrorBoundary>
        <Counter />
      </ErrorBoundary>
    </Provider>
  )

  await findByText('errored')
})

it('can throw a chained error in read function', async () => {
  const countAtom = atom(0)
  const errorAtom = atom((get) => {
    if (get(countAtom) === 0) {
      return 0
    }
    throw new Error()
  })
  const derivedAtom = atom((get) => get(errorAtom))

  const Counter: React.FC = () => {
    const [, setCount] = useAtom(countAtom)
    const [count] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
        <div>no error</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <ErrorBoundary>
        <Counter />
      </ErrorBoundary>
    </Provider>
  )

  await findByText('no error')

  fireEvent.click(getByText('button'))
  await findByText('errored')
})

it('can throw an initial error in async read function', async () => {
  const errorAtom = atom(async () => {
    throw new Error()
  })

  const Counter: React.FC = () => {
    useAtom(errorAtom)
    return (
      <>
        <div>no error</div>
      </>
    )
  }

  const { findByText } = render(
    <Provider>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Counter />
        </Suspense>
      </ErrorBoundary>
    </Provider>
  )

  await findByText('errored')
})

it('can throw an error in async read function', async () => {
  const countAtom = atom(0)
  const errorAtom = atom(async (get) => {
    if (get(countAtom) === 0) {
      return 0
    }
    throw new Error()
  })

  const Counter: React.FC = () => {
    const [, setCount] = useAtom(countAtom)
    const [count] = useAtom(errorAtom)
    return (
      <>
        <div>count: {count}</div>
        <div>no error</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Counter />
        </Suspense>
      </ErrorBoundary>
    </Provider>
  )

  await findByText('no error')

  fireEvent.click(getByText('button'))
  await findByText('errored')
})

it('can throw an error in write function', async () => {
  const countAtom = atom(0)
  const errorAtom = atom(
    (get) => get(countAtom),
    () => {
      throw new Error()
    }
  )

  const Counter: React.FC = () => {
    const [count, dispatch] = useAtom(errorAtom)
    const onClick = () => {
      try {
        dispatch()
      } catch (e) {
        console.error(e)
      }
    }
    return (
      <>
        <div>count: {count}</div>
        <div>no error</div>
        <button onClick={onClick}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('no error')

  fireEvent.click(getByText('button'))
  expect(console.error).toHaveBeenCalledTimes(1)
})

it('can throw a chained error in write function', async () => {
  const countAtom = atom(0)
  const errorAtom = atom(
    (get) => get(countAtom),
    () => {
      throw new Error()
    }
  )
  const chainedAtom = atom(
    (get) => get(errorAtom),
    (_get, set) => {
      set(errorAtom, null)
    }
  )

  const Counter: React.FC = () => {
    const [count, dispatch] = useAtom(chainedAtom)
    const onClick = () => {
      try {
        dispatch()
      } catch (e) {
        console.error(e)
      }
    }
    return (
      <>
        <div>count: {count}</div>
        <div>no error</div>
        <button onClick={onClick}>button</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('no error')

  fireEvent.click(getByText('button'))
  expect(console.error).toHaveBeenCalledTimes(1)
})

it('throws an error while updating in effect', async () => {
  const countAtom = atom(0)

  const Counter: React.FC = () => {
    const [, setCount] = useAtom(countAtom)
    useEffect(() => {
      try {
        setCount(() => {
          throw Error()
        })
      } catch (e) {
        console.error(e)
      }
    }, [setCount])
    return (
      <>
        <div>no error</div>
      </>
    )
  }

  const { findByText } = render(
    <Provider>
      <ErrorBoundary>
        <Counter />
      </ErrorBoundary>
    </Provider>
  )

  await findByText('no error')
  expect(console.error).toHaveBeenCalledTimes(1)
})

describe('throws an error while updating in effect cleanup', () => {
  const countAtom = atom(0)

  let doubleSetCount = false

  const Counter: React.FC = () => {
    const [, setCount] = useAtom(countAtom)
    useEffect(() => {
      return () => {
        if (doubleSetCount) {
          setCount((x) => x + 1)
        }
        setCount(() => {
          throw Error()
        })
      }
    }, [setCount])
    return (
      <>
        <div>no error</div>
      </>
    )
  }

  const Main: React.FC = () => {
    const [hide, setHide] = useState(false)
    return (
      <>
        <button onClick={() => setHide(true)}>close</button>
        {!hide && <Counter />}
      </>
    )
  }

  it('single setCount', async () => {
    const { getByText, findByText } = render(
      <Provider>
        <ErrorBoundary>
          <Main />
        </ErrorBoundary>
      </Provider>
    )

    await findByText('no error')
    expect(console.error).toHaveBeenCalledTimes(0)

    fireEvent.click(getByText('close'))
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('dobule setCount', async () => {
    doubleSetCount = true

    const { getByText, findByText } = render(
      <Provider>
        <ErrorBoundary>
          <Main />
        </ErrorBoundary>
      </Provider>
    )

    await findByText('no error')
    expect(console.error).toHaveBeenCalledTimes(0)

    fireEvent.click(getByText('close'))
    expect(console.error).toHaveBeenCalledTimes(1)
  })
})
