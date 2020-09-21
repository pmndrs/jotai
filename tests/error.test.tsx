import React, { Suspense } from 'react'
import { fireEvent, cleanup, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../src/index'

const consoleError = console.error
afterEach(() => {
  cleanup()
  console.error = consoleError
})

it('can throw an initial error in read function', async () => {
  console.error = jest.fn()

  const errorAtom = atom(() => {
    throw new Error()
  })

  class ErrorBoundary extends React.Component<{}, { hasError: boolean }> {
    constructor(props: {}) {
      super(props)
      this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
      return { hasError: true }
    }
    render() {
      return this.state.hasError ? <div>errored</div> : this.props.children
    }
  }

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
  console.error = jest.fn()

  const countAtom = atom(0)
  const errorAtom = atom((get) => {
    if (get(countAtom) === 0) {
      return 0
    }
    throw new Error()
  })

  class ErrorBoundary extends React.Component<{}, { hasError: boolean }> {
    constructor(props: {}) {
      super(props)
      this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
      return { hasError: true }
    }
    render() {
      return this.state.hasError ? <div>errored</div> : this.props.children
    }
  }

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
  console.error = jest.fn()

  const errorAtom = atom(() => {
    throw new Error()
  })
  const derivedAtom = atom((get) => get(errorAtom))

  class ErrorBoundary extends React.Component<{}, { hasError: boolean }> {
    constructor(props: {}) {
      super(props)
      this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
      return { hasError: true }
    }
    render() {
      return this.state.hasError ? <div>errored</div> : this.props.children
    }
  }

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
  console.error = jest.fn()

  const countAtom = atom(0)
  const errorAtom = atom((get) => {
    if (get(countAtom) === 0) {
      return 0
    }
    throw new Error()
  })
  const derivedAtom = atom((get) => get(errorAtom))

  class ErrorBoundary extends React.Component<{}, { hasError: boolean }> {
    constructor(props: {}) {
      super(props)
      this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
      return { hasError: true }
    }
    render() {
      return this.state.hasError ? <div>errored</div> : this.props.children
    }
  }

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
  console.error = jest.fn()

  const errorAtom = atom(async () => {
    throw new Error()
  })

  class ErrorBoundary extends React.Component<{}, { hasError: boolean }> {
    constructor(props: {}) {
      super(props)
      this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
      return { hasError: true }
    }
    render() {
      return this.state.hasError ? <div>errored</div> : this.props.children
    }
  }

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
  console.error = jest.fn()

  const countAtom = atom(0)
  const errorAtom = atom(async (get) => {
    if (get(countAtom) === 0) {
      return 0
    }
    throw new Error()
  })

  class ErrorBoundary extends React.Component<{}, { hasError: boolean }> {
    constructor(props: {}) {
      super(props)
      this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
      return { hasError: true }
    }
    render() {
      return this.state.hasError ? <div>errored</div> : this.props.children
    }
  }

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
  console.error = jest.fn()

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

it('can throw an error in async write function', async () => {
  console.error = jest.fn()

  const countAtom = atom(0)
  const errorAtom = atom(
    (get) => get(countAtom),
    async () => {
      throw new Error()
    }
  )

  const Counter: React.FC = () => {
    const [count, dispatch] = useAtom(errorAtom)
    const onClick = async () => {
      try {
        await dispatch()
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
      <Suspense fallback={null}>
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('no error')

  fireEvent.click(getByText('button'))
  await new Promise((r) => setTimeout(r, 10))
  expect(console.error).toHaveBeenCalledTimes(1)
})

it('can throw a chained error in write function', async () => {
  console.error = jest.fn()

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
