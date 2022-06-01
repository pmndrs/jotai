import { Component, StrictMode, Suspense, useEffect } from 'react'
import type { ReactNode } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom, useSetAtom } from 'jotai'
import { atomFamily, waitForAll } from 'jotai/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

const consoleWarn = console.warn
const consoleError = console.error
beforeEach(() => {
  console.warn = jest.fn()
  console.error = jest.fn()
})
afterEach(() => {
  console.warn = consoleWarn
  console.error = consoleError
})

class ErrorBoundary extends Component<
  { message?: string; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { message?: string; children: ReactNode }) {
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

it('waits for two async atoms', async () => {
  let isAsyncAtomRunning = false
  let isAnotherAsyncAtomRunning = false
  const asyncAtom = atom(async () => {
    isAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAsyncAtomRunning = false
        resolve(true)
      }, 100)
    })
    return 1
  })
  const anotherAsyncAtom = atom(async () => {
    isAnotherAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAnotherAsyncAtomRunning = false
        resolve(true)
      }, 100)
    })
    return 'a'
  })

  const Counter = () => {
    const [[num, str]] = useAtom(waitForAll([asyncAtom, anotherAsyncAtom]))
    return (
      <div>
        num: {num * 1}, str: {str.toLowerCase()}
      </div>
    )
  }

  const { getByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await waitFor(() => {
    getByText('loading')
    expect(isAsyncAtomRunning).toBe(true)
    expect(isAnotherAsyncAtomRunning).toBe(true)
  })

  await waitFor(() => {
    getByText('num: 1, str: a')
    expect(isAsyncAtomRunning).toBe(false)
    expect(isAnotherAsyncAtomRunning).toBe(false)
  })
})

it('can use named atoms in derived atom', async () => {
  let isAsyncAtomRunning = false
  let isAnotherAsyncAtomRunning = false
  const asyncAtom = atom(async () => {
    isAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAsyncAtomRunning = false
        resolve(true)
      }, 100)
    })
    return 1
  })
  const anotherAsyncAtom = atom(async () => {
    isAnotherAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAnotherAsyncAtomRunning = false
        resolve(true)
      }, 100)
    })
    return 'a'
  })

  const combinedWaitingAtom = atom((get) => {
    const { num, str } = get(
      waitForAll({
        num: asyncAtom,
        str: anotherAsyncAtom,
      })
    )
    return { num, str }
  })

  const Counter = () => {
    const [{ num, str }] = useAtom(combinedWaitingAtom)
    return (
      <div>
        num: {num}, str: {str}
      </div>
    )
  }

  const { getByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await waitFor(() => {
    getByText('loading')
    expect(isAsyncAtomRunning).toBe(true)
    expect(isAnotherAsyncAtomRunning).toBe(true)
  })

  await waitFor(() => {
    getByText('num: 1, str: a')
    expect(isAsyncAtomRunning).toBe(false)
    expect(isAnotherAsyncAtomRunning).toBe(false)
  })
})

it('can handle errors', async () => {
  let isAsyncAtomRunning = false
  let isErrorAtomRunning = false
  const asyncAtom = atom(async () => {
    isAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAsyncAtomRunning = false
        resolve(true)
      }, 100)
    })
    return 1
  })
  const errorAtom = atom(async () => {
    isErrorAtomRunning = true
    await new Promise((_, reject) => {
      setTimeout(() => {
        isErrorAtomRunning = false
        reject(false)
      }, 100)
    })
    return 'a'
  })

  const combinedWaitingAtom = atom((get) => {
    return get(
      waitForAll({
        num: asyncAtom,
        error: errorAtom,
      })
    )
  })

  const Counter = () => {
    const [{ num, error }] = useAtom(combinedWaitingAtom)
    return (
      <>
        <div>num: {num}</div>
        <div>str: {error}</div>
      </>
    )
  }

  const { getByText } = render(
    <StrictMode>
      <Provider>
        <ErrorBoundary>
          <Suspense fallback="loading">
            <Counter />
          </Suspense>
        </ErrorBoundary>
      </Provider>
    </StrictMode>
  )

  await waitFor(() => {
    getByText('loading')
    expect(isAsyncAtomRunning).toBe(true)
    expect(isErrorAtomRunning).toBe(true)
  })

  await waitFor(() => {
    getByText('errored')
    expect(isAsyncAtomRunning).toBe(false)
    expect(isErrorAtomRunning).toBe(false)
  })
})

it('handles scope', async () => {
  const scope = Symbol()
  let isAsyncAtomRunning = false
  let isAnotherAsyncAtomRunning = false
  const valueAtom = atom(1)
  const asyncAtom = atom(async (get) => {
    isAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAsyncAtomRunning = false
        resolve(true)
      }, 500)
    })
    return get(valueAtom)
  })

  const anotherAsyncAtom = atom(async () => {
    isAnotherAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAnotherAsyncAtomRunning = false
        resolve(true)
      }, 500)
    })
    return '2'
  })

  const Counter = () => {
    const [[num1, num2]] = useAtom(
      waitForAll([asyncAtom, anotherAsyncAtom]),
      scope
    )
    const setValue = useSetAtom(valueAtom, scope)
    return (
      <>
        <div>
          num1: {num1}, num2: {num2}
        </div>
        <button onClick={() => setValue((v) => v + 1)}>increment</button>
      </>
    )
  }

  const { getByText, findByText } = render(
    <StrictMode>
      <Provider scope={scope}>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await waitFor(() => {
    getByText('loading')
    expect(isAsyncAtomRunning).toBe(true)
    expect(isAnotherAsyncAtomRunning).toBe(true)
  })

  await waitFor(() => {
    getByText('num1: 1, num2: 2')
    expect(isAsyncAtomRunning).toBe(false)
    expect(isAnotherAsyncAtomRunning).toBe(false)
  })

  await new Promise((r) => setTimeout(r, 500))
  fireEvent.click(getByText('increment'))
  await findByText('loading')
  await findByText('num1: 2, num2: 2')
})

it('large atom count', async () => {
  const createArray = (n: number) =>
    Array(n)
      .fill(0)
      .map((_, i) => i)

  let result: number[] | null = null

  const chunksFamily = atomFamily((i: number) => atom(() => i))

  const selector = atomFamily((count: number) =>
    atom((getter) => {
      const data = createArray(count)
      const atoms = data.map(chunksFamily)
      const values = waitForAll(atoms)
      return getter(values)
    })
  )

  const Loader = ({ count }: { count: number }) => {
    const [value, _] = useAtom(selector(count))

    useEffect(() => {
      result = value
    }, [value])

    return <div></div>
  }

  const passingCount = 500
  render(
    <StrictMode>
      <Provider>
        <Loader count={passingCount} />
      </Provider>
    </StrictMode>
  )

  waitFor(() => {
    expect(result).toEqual(createArray(passingCount))
  })

  const failingCount = 8000
  render(
    <StrictMode>
      <Provider>
        <Loader count={failingCount} />
      </Provider>
    </StrictMode>
  )

  waitFor(() => {
    expect(result).toEqual(createArray(failingCount))
  })
})

it('works with an empty list (#1177)', async () => {
  const Component = () => {
    // useAtom(waitForAll([]))
    return <span>works!</span>
  }

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <Component />
      </Provider>
    </StrictMode>
  )

  await findByText('works!')
})
