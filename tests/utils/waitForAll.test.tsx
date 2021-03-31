import React, { Fragment, StrictMode, Suspense } from 'react'
import { render } from '@testing-library/react'
import { Provider as ProviderOrig, atom, useAtom } from '../../src/index'
import { waitForAll } from '../../src/utils'

const Provider = process.env.PROVIDER_LESS_MODE ? Fragment : ProviderOrig

const consoleError = console.error
beforeEach(() => {
  console.error = jest.fn()
})
afterEach(() => {
  console.error = consoleError
})

jest.useFakeTimers()

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

it('waits for two async atoms', async () => {
  let isAsyncAtomRunning = false
  let isAnotherAsyncAtomRunning = false
  const asyncAtom = atom(async () => {
    isAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAsyncAtomRunning = false
        resolve(true)
      }, 10)
    })
    return 1
  })
  const anotherAsyncAtom = atom(async () => {
    isAnotherAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAnotherAsyncAtomRunning = false
        resolve(true)
      }, 10)
    })
    return 'a'
  })

  const Counter: React.FC = () => {
    const [[num, str]] = useAtom(
      waitForAll([asyncAtom, anotherAsyncAtom] as const)
    )
    return (
      <div>
        num: {num * 2}, str: {str.toUpperCase()}
      </div>
    )
  }

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  expect(isAsyncAtomRunning).toBe(true)
  expect(isAnotherAsyncAtomRunning).toBe(true)

  jest.runOnlyPendingTimers()

  await findByText('num: 2, str: A')
  expect(isAsyncAtomRunning).toBe(false)
  expect(isAnotherAsyncAtomRunning).toBe(false)
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
      }, 10)
    })
    return 1
  })
  const anotherAsyncAtom = atom(async () => {
    isAnotherAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAnotherAsyncAtomRunning = false
        resolve(true)
      }, 10)
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
    return { num: num * 2, str: str.toUpperCase() }
  })

  const Counter: React.FC = () => {
    const [{ num, str }] = useAtom(combinedWaitingAtom)
    return (
      <div>
        num: {num}, str: {str}
      </div>
    )
  }

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  expect(isAsyncAtomRunning).toBe(true)
  expect(isAnotherAsyncAtomRunning).toBe(true)

  jest.runOnlyPendingTimers()

  await findByText('num: 2, str: A')
  expect(isAsyncAtomRunning).toBe(false)
  expect(isAnotherAsyncAtomRunning).toBe(false)
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
      }, 10)
    })
    return 1
  })
  const errorAtom = atom(async () => {
    isErrorAtomRunning = true
    await new Promise((_, reject) => {
      setTimeout(() => {
        isErrorAtomRunning = false
        reject('Charlotte')
      }, 10)
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

  const Counter: React.FC = () => {
    const [{ num, error }] = useAtom(combinedWaitingAtom)
    return (
      <>
        <div>num: {num}</div>
        <div>str: {error}</div>
      </>
    )
  }

  const { findByText } = render(
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

  await findByText('loading')
  expect(isAsyncAtomRunning).toBe(true)
  expect(isErrorAtomRunning).toBe(true)

  jest.runOnlyPendingTimers()

  await findByText('errored')
  expect(isAsyncAtomRunning).toBe(false)
  expect(isErrorAtomRunning).toBe(false)
})
