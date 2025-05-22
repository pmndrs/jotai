import React, { StrictMode, Suspense } from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { it } from 'vitest'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

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

  await screen.findByText('count: 0')
  await userEvent.click(screen.getByText('dispatch'))
  await screen.findByText('count: 1')
})

it('useAtomValue with async atom (promise)', async () => {
  const asyncAtom = atom(async () => 42)

  const AsyncComponent = () => {
    const value = useAtomValue(asyncAtom)

    return <div>value: {value}</div>
  }

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <AsyncComponent />
        </Suspense>
      </StrictMode>,
    )
  })

  await screen.findByText('value: 42')
})

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
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

  await screen.findByText('error: fail')
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

  await screen.findByText('obj: 1,2')
})

it('useAtomValue with atom returning function', async () => {
  const fnAtom = atom(() => () => 'fn')

  const FnComponent = () => {
    const fn = useAtomValue(fnAtom)

    return <div>fn: {fn()}</div>
  }

  render(
    <StrictMode>
      <FnComponent />
    </StrictMode>,
  )

  await screen.findByText('fn: fn')
})
