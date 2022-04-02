import { StrictMode } from 'react'
import type { ReactElement } from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom } from 'jotai'
import { useAtomsDevtools } from 'jotai/devtools'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

let extensionSubscriber: ((message: any) => void) | undefined

const extension = {
  subscribe: jest.fn((f) => {
    extensionSubscriber = f
    return () => {}
  }),
  unsubscribe: jest.fn(),
  send: jest.fn(),
  init: jest.fn(),
  error: jest.fn(),
}
const extensionConnector = { connect: jest.fn(() => extension) }
;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = extensionConnector

const savedDev = __DEV__

beforeEach(() => {
  extensionConnector.connect.mockClear()
  extension.subscribe.mockClear()
  extension.unsubscribe.mockClear()
  extension.send.mockClear()
  extension.init.mockClear()
  extension.error.mockClear()
  extensionSubscriber = undefined
})

afterEach(() => {
  __DEV__ = savedDev
})

const AtomsDevtools = ({
  children,
  enabled,
}: {
  children: ReactElement
  enabled?: boolean
}) => {
  useAtomsDevtools('test', enabled ? { enabled } : undefined)
  return children
}

it('[DEV-ONLY] connects to the extension by initialiing', () => {
    __DEV__ = true
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

  render(
    <StrictMode>
      <Provider>
        <AtomsDevtools>
          <Counter />
        </AtomsDevtools>
      </Provider>
    </StrictMode>
  )

  expect(extension.init).toHaveBeenLastCalledWith(undefined)
})

describe('If there is no extension installed...', () => {
  beforeAll(() => {
    ;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = undefined
  })
  afterAll(() => {
    ;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = extensionConnector
  })

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

  it('[DEV-ONLY] does not throw', () => {
    __DEV__ = true
    const originalConsoleWarn = console.warn
    console.warn = jest.fn()

    expect(() => {
      render(
        <StrictMode>
          <Provider>
            <AtomsDevtools>
              <Counter />
            </AtomsDevtools>
          </Provider>
        </StrictMode>
      )
    }).not.toThrow()

    console.warn = originalConsoleWarn
  })

  it('[DEV-ONLY] warns in dev env only if enabled', () => {
    __DEV__ = true
    const originalConsoleWarn = console.warn
    console.warn = jest.fn()

    render(
      <StrictMode>
        <Provider>
          <AtomsDevtools enabled={true}>
            <Counter />
          </AtomsDevtools>
        </Provider>
      </StrictMode>
    )

    expect(console.warn).toHaveBeenLastCalledWith(
      'Please install/enable Redux devtools extension'
    )

    console.warn = originalConsoleWarn
  })

  it('[PRD-ONLY] does not warn in prod env even if enabled is true', () => {
    __DEV__ = false
    const originalConsoleWarn = console.warn
    console.warn = jest.fn()

    render(
      <StrictMode>
        <Provider>
          <AtomsDevtools enabled={true}>
            <Counter />
          </AtomsDevtools>
        </Provider>
      </StrictMode>
    )

    expect(console.warn).not.toHaveBeenLastCalledWith(
      'Please install/enable Redux devtools extension'
    )

    console.warn = originalConsoleWarn
  })
})

it('[DEV-ONLY] updating state should call devtools.send', async () => {
    __DEV__ = true
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

  extension.send.mockClear()
  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <AtomsDevtools>
          <Counter />
        </AtomsDevtools>
      </Provider>
    </StrictMode>
  )

  await findByText('count: 0')
  expect(extension.send).toBeCalledTimes(1)

  fireEvent.click(getByText('button'))
  await findByText('count: 1')
  expect(extension.send).toBeCalledTimes(2)

  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  expect(extension.send).toBeCalledTimes(3)
})

it('[DEV-ONLY] dependencies + updating state should call devtools.send', async () => {
    __DEV__ = true
  const countAtom = atom(0)
  const doubleAtom = atom((get) => get(countAtom) * 2)
  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const [double] = useAtom(doubleAtom)
    return (
      <>
        <div>count: {count}</div>
        <div>double: {double}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  extension.send.mockClear()
  const { getByText, findByText } = render(
    <StrictMode>
      <Provider>
        <AtomsDevtools>
          <Counter />
        </AtomsDevtools>
      </Provider>
    </StrictMode>
  )

  await findByText('count: 0')
  expect(extension.send).toBeCalledTimes(1)
  expect(extension.send).lastCalledWith(
    expect.objectContaining({ type: '1' }),
    expect.objectContaining({
      values: expect.objectContaining({
        [`${countAtom}`]: 0,
        [`${doubleAtom}`]: 0,
      }),
      dependents: expect.objectContaining({
        [`${countAtom}`]: expect.arrayContaining([
          `${countAtom}`,
          `${doubleAtom}`,
        ]),
        [`${doubleAtom}`]: [],
      }),
    })
  )

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 1')
    getByText('double: 2')
  })
  expect(extension.send).toBeCalledTimes(2)
  expect(extension.send).lastCalledWith(
    expect.objectContaining({ type: '2' }),
    expect.objectContaining({
      values: expect.objectContaining({
        [`${countAtom}`]: 1,
        [`${doubleAtom}`]: 2,
      }),
      dependents: expect.objectContaining({
        [`${countAtom}`]: expect.arrayContaining([
          `${countAtom}`,
          `${doubleAtom}`,
        ]),
        [`${doubleAtom}`]: [],
      }),
    })
  )

  fireEvent.click(getByText('button'))
  await waitFor(() => {
    getByText('count: 2')
    getByText('double: 4')
  })
  expect(extension.send).toBeCalledTimes(3)
  expect(extension.send).lastCalledWith(
    expect.objectContaining({ type: '3' }),
    expect.objectContaining({
      values: expect.objectContaining({
        [`${countAtom}`]: 2,
        [`${doubleAtom}`]: 4,
      }),
      dependents: expect.objectContaining({
        [`${countAtom}`]: expect.arrayContaining([
          `${countAtom}`,
          `${doubleAtom}`,
        ]),
        [`${doubleAtom}`]: [],
      }),
    })
  )
})

it('[DEV-ONLY] conditional dependencies + updating state should call devtools.send', async () => {
    __DEV__ = true
  const countAtom = atom(0)
  const secondCountAtom = atom(0)
  const enabledAtom = atom(true)
  const anAtom = atom((get) =>
    get(enabledAtom) ? get(countAtom) : get(secondCountAtom)
  )
  const App = () => {
    const [enabled, setEnabled] = useAtom(enabledAtom)
    const [cond] = useAtom(anAtom)
    return (
      <div className="App">
        <h1>enabled: {enabled ? 'true' : 'false'}</h1>
        <h1>condition: {cond}</h1>
        <button onClick={() => setEnabled(!enabled)}>change</button>
      </div>
    )
  }

  extension.send.mockClear()
  const { getByText } = render(
    <StrictMode>
      <Provider>
        <AtomsDevtools>
          <App />
        </AtomsDevtools>
      </Provider>
    </StrictMode>
  )

  await waitFor(() => {
    getByText('enabled: true')
    getByText('condition: 0')
  })
  expect(extension.send).toBeCalledTimes(1)
  expect(extension.send).lastCalledWith(
    expect.objectContaining({ type: '1' }),
    expect.objectContaining({
      values: expect.objectContaining({
        [`${enabledAtom}`]: true,
        [`${countAtom}`]: 0,
        [`${anAtom}`]: 0,
      }),
      dependents: expect.objectContaining({
        [`${enabledAtom}`]: expect.arrayContaining([
          `${enabledAtom}`,
          `${anAtom}`,
        ]),
        [`${countAtom}`]: expect.arrayContaining([`${countAtom}`, `${anAtom}`]),
        [`${anAtom}`]: [],
      }),
    })
  )

  fireEvent.click(getByText('change'))
  await waitFor(() => {
    getByText('enabled: false')
    getByText('condition: 0')
  })
  expect(extension.send).toBeCalledTimes(2)
  expect(extension.send).lastCalledWith(
    expect.objectContaining({ type: '2' }),
    expect.objectContaining({
      values: expect.objectContaining({
        [`${enabledAtom}`]: false,
        [`${secondCountAtom}`]: 0,
        [`${anAtom}`]: 0,
      }),
      dependents: expect.objectContaining({
        [`${enabledAtom}`]: expect.arrayContaining([
          `${enabledAtom}`,
          `${anAtom}`,
        ]),
        [`${secondCountAtom}`]: expect.arrayContaining([
          `${secondCountAtom}`,
          `${anAtom}`,
        ]),
        [`${anAtom}`]: [],
      }),
    })
  )

  fireEvent.click(getByText('change'))
  await waitFor(() => {
    getByText('enabled: true')
    getByText('condition: 0')
  })
  expect(extension.send).toBeCalledTimes(3)
  expect(extension.send).lastCalledWith(
    expect.objectContaining({ type: '3' }),
    expect.objectContaining({
      values: expect.objectContaining({
        [`${enabledAtom}`]: true,
        [`${countAtom}`]: 0,
        [`${anAtom}`]: 0,
      }),
      dependents: expect.objectContaining({
        [`${enabledAtom}`]: expect.arrayContaining([
          `${enabledAtom}`,
          `${anAtom}`,
        ]),
        [`${countAtom}`]: expect.arrayContaining([`${countAtom}`, `${anAtom}`]),
        [`${anAtom}`]: [],
      }),
    })
  )
})

describe('when it receives an message of type...', () => {
  it('[DEV-ONLY] dispatch & COMMIT', async () => {
    __DEV__ = true
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

    extension.send.mockClear()
    const { getByText, findByText } = render(
      <StrictMode>
        <Provider>
          <AtomsDevtools>
            <Counter />
          </AtomsDevtools>
        </Provider>
      </StrictMode>
    )

    await findByText('count: 0')
    expect(extension.send).toBeCalledTimes(1)

    fireEvent.click(getByText('button'))
    await findByText('count: 1')
    expect(extension.send).toBeCalledTimes(2)

    act(() =>
      (extensionSubscriber as (message: any) => void)({
        type: 'DISPATCH',
        payload: { type: 'COMMIT' },
      })
    )
    await waitFor(() =>
      expect(extension.init).toBeCalledWith({
        values: {
          [`${countAtom}`]: 1,
        },
        dependents: {
          [`${countAtom}`]: [`${countAtom}`],
        },
      })
    )
  })

  it('[DEV-ONLY] JUMP_TO_STATE & JUMP_TO_ACTION should not call devtools.send', async () => {
    __DEV__ = true
    const countAtom = atom(0)
    const secondCountAtom = atom(0)
    const enabledAtom = atom(true)
    const anAtom = atom((get) =>
      get(enabledAtom) ? get(countAtom) : get(secondCountAtom)
    )
    const App = () => {
      const [enabled, setEnabled] = useAtom(enabledAtom)
      const [cond] = useAtom(anAtom)
      return (
        <div className="App">
          <h1>enabled: {enabled ? 'true' : 'false'}</h1>
          <h1>condition: {cond}</h1>
          <button onClick={() => setEnabled(!enabled)}>change</button>
        </div>
      )
    }

    extension.send.mockClear()
    const { getByText, findByText } = render(
      <StrictMode>
        <Provider>
          <AtomsDevtools>
            <App />
          </AtomsDevtools>
        </Provider>
      </StrictMode>
    )

    await findByText('enabled: true')

    fireEvent.click(getByText('change'))
    await findByText('enabled: false')

    fireEvent.click(getByText('change'))
    await findByText('enabled: true')

    fireEvent.click(getByText('change'))
    await waitFor(() => {
      getByText('enabled: false')
      getByText('condition: 0')
    })
    expect(extension.send).toBeCalledTimes(4)

    act(() =>
      (extensionSubscriber as (message: any) => void)({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE', actionId: 3 },
      })
    )
    await waitFor(() => {
      getByText('enabled: true')
      getByText('condition: 0')
    })
    expect(extension.send).toBeCalledTimes(4)

    act(() =>
      (extensionSubscriber as (message: any) => void)({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE', actionId: 2 },
      })
    )
    await waitFor(() => {
      getByText('enabled: false')
      getByText('condition: 0')
    })
    expect(extension.send).toBeCalledTimes(4)
  })

  it('[DEV-ONLY] time travelling with JUMP_TO_ACTION', async () => {
    __DEV__ = true
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

    extension.send.mockClear()
    const { getByText, findByText } = render(
      <StrictMode>
        <Provider>
          <AtomsDevtools>
            <Counter />
          </AtomsDevtools>
        </Provider>
      </StrictMode>
    )

    await findByText('count: 0')
    expect(extension.send).toBeCalledTimes(1)

    fireEvent.click(getByText('button'))
    await findByText('count: 1')
    expect(extension.send).toBeCalledTimes(2)

    act(() =>
      (extensionSubscriber as (message: any) => void)({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_ACTION', actionId: 1 },
      })
    )
    await findByText('count: 0')
    expect(extension.send).toBeCalledTimes(2)

    fireEvent.click(getByText('button'))
    await findByText('count: 1')
    expect(extension.send).toBeCalledTimes(3)

    fireEvent.click(getByText('button'))
    await findByText('count: 2')
    expect(extension.send).toBeCalledTimes(4)
  })

  it('[DEV-ONLY] time travelling with JUMP_TO_STATE', async () => {
    __DEV__ = true
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

    extension.send.mockClear()
    const { getByText, findByText } = render(
      <StrictMode>
        <Provider>
          <AtomsDevtools>
            <Counter />
          </AtomsDevtools>
        </Provider>
      </StrictMode>
    )

    await findByText('count: 0')
    expect(extension.send).toBeCalledTimes(1)

    fireEvent.click(getByText('button'))
    await findByText('count: 1')
    expect(extension.send).toBeCalledTimes(2)

    fireEvent.click(getByText('button'))
    await findByText('count: 2')
    expect(extension.send).toBeCalledTimes(3)

    act(() =>
      (extensionSubscriber as (message: any) => void)({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE', actionId: 2 },
      })
    )
    await findByText('count: 1')

    act(() =>
      (extensionSubscriber as (message: any) => void)({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE', actionId: 1 },
      })
    )
    await findByText('count: 0')

    act(() =>
      (extensionSubscriber as (message: any) => void)({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE', actionId: 0 },
      })
    )
    await findByText('count: 0')

    act(() =>
      (extensionSubscriber as (message: any) => void)({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE', actionId: 3 },
      })
    )
    await findByText('count: 2')
  })

  it('[DEV-ONLY] PAUSE_RECORDING, it toggles the sending of actions', async () => {
    __DEV__ = true
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

    extension.send.mockClear()
    const { getByText, findByText } = render(
      <StrictMode>
        <Provider>
          <AtomsDevtools>
            <Counter />
          </AtomsDevtools>
        </Provider>
      </StrictMode>
    )

    await findByText('count: 0')
    expect(extension.send).toBeCalledTimes(1)

    act(() =>
      (extensionSubscriber as (message: any) => void)({
        type: 'DISPATCH',
        payload: { type: 'PAUSE_RECORDING' },
      })
    )
    fireEvent.click(getByText('button'))
    await findByText('count: 1')
    expect(extension.send).toBeCalledTimes(1)

    act(() =>
      (extensionSubscriber as (message: any) => void)({
        type: 'DISPATCH',
        payload: { type: 'PAUSE_RECORDING' },
      })
    )
    fireEvent.click(getByText('button'))
    await findByText('count: 2')
    expect(extension.send).toBeCalledTimes(2)
  })
})
