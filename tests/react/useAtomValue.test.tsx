import { Component, StrictMode, Suspense } from 'react'
import type { ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('useAtomValue basic test', async () => {
  const countAtom = atom(0)

  const Counter = () => {
    const count = useAtomValue(countAtom)
    const setCount = useSetAtom(countAtom)

    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(count + 1)}>dispatch</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(screen.getByText('count: 0')).toBeInTheDocument()
  fireEvent.click(screen.getByText('dispatch'))
  expect(screen.getByText('count: 1')).toBeInTheDocument()
})

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)

    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <div>error: {this.state.error.message}</div>
    }

    return this.props.children
  }
}

it('useAtomValue with error throwing atom', async () => {
  const errorAtom = atom(() => {
    throw new Error('fail')
  })

  const ErrorComponent = () => {
    useAtomValue(errorAtom)

    return <div>no error</div>
  }

  render(
    <StrictMode>
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    </StrictMode>,
  )

  expect(screen.getByText('error: fail')).toBeInTheDocument()
})

it('useAtomValue with atom returning object', async () => {
  const objAtom = atom({ a: 1, b: 2 })

  const ObjComponent = () => {
    const value = useAtomValue(objAtom)

    return (
      <div>
        obj: {value.a},{value.b}
      </div>
    )
  }

  render(
    <StrictMode>
      <ObjComponent />
    </StrictMode>,
  )

  expect(screen.getByText('obj: 1,2')).toBeInTheDocument()
})

it('useAtomValue with async atom (promise)', async () => {
  const asyncAtom = atom(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
    return 42
  })

  const AsyncComponent = () => {
    const value = useAtomValue(asyncAtom)

    return <div>value: {value}</div>
  }

  await act(() =>
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <AsyncComponent />
        </Suspense>
      </StrictMode>,
    ),
  )

  expect(screen.getByText('loading')).toBeInTheDocument()

  await act(() => vi.advanceTimersByTimeAsync(10))
  expect(screen.getByText('value: 42')).toBeInTheDocument()
})
