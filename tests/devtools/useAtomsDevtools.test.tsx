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

beforeEach(() => {
  extensionConnector.connect.mockClear()
  extension.subscribe.mockClear()
  extension.unsubscribe.mockClear()
  extension.send.mockClear()
  extension.init.mockClear()
  extension.error.mockClear()
  extensionSubscriber = undefined
})

it('connects to the extension by initialiing', () => {
  const countAtom = atom(0)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    useAtomsDevtools('test')
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }
  render(
    <Provider>
      <Counter />
    </Provider>
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
    useAtomsDevtools('test')
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }
  it('does not throw', () => {
    expect(() => {
      render(
        <Provider>
          <Counter />
        </Provider>
      )
    }).not.toThrow()
  })

  it('warns in dev env', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    const originalConsoleWarn = console.warn
    console.warn = jest.fn()

    render(
      <Provider>
        <Counter />
      </Provider>
    )
    expect(console.warn).toHaveBeenLastCalledWith(
      'Please install/enable Redux devtools extension'
    )

    process.env.NODE_ENV = originalNodeEnv
    console.warn = originalConsoleWarn
  })

  it('does not warn if not in dev env', () => {
    const consoleWarn = jest.spyOn(console, 'warn')

    render(
      <Provider>
        <Counter />
      </Provider>
    )
    expect(consoleWarn).not.toBeCalled()

    consoleWarn.mockRestore()
  })
})

it('updating state should call devtools.send', async () => {
  const countAtom = atom(0)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    useAtomsDevtools('test')
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  extension.send.mockClear()
  const { getByText, findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )


  await waitFor(() => expect(extension.send).toBeCalledTimes(1))
  fireEvent.click(getByText('button'))
  await findByText('count: 1')
  await waitFor(() => expect(extension.send).toBeCalledTimes(2))
  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  await waitFor(() => expect(extension.send).toBeCalledTimes(3))
})

it('dependencies + updating state should call devtools.send', async () => {
  const countAtom = atom(0)
  const doubleAtom = atom((get) => get(countAtom) * 2)
  const Counter = () => {
    useAtomsDevtools('test')
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
    <Provider>
      <Counter />
    </Provider>
  )
  await waitFor(() => expect(extension.send).toBeCalledTimes(1))
  await waitFor(() => expect(extension.send).toBeCalledWith(
    expect.objectContaining({ type: '1' }),
    expect.anything()
  ))
  await waitFor(() => expect(extension.send).toBeCalledWith(
    expect.anything(),
    expect.objectContaining({
      values: {
        [`${countAtom}`]: 0,
        [`${doubleAtom}`]: 0,
      },
    })
  ))
  await waitFor(() => expect(extension.send).toBeCalledWith(
    expect.anything(),
    expect.objectContaining({
      dependencies: {
        [`${countAtom}`]: [`${countAtom}`],
        [`${doubleAtom}`]: [`${countAtom}`],
      },
    })
  ))
  fireEvent.click(getByText('button'))
  await findByText('count: 1')
  await findByText('double: 2')
  await waitFor(() => expect(extension.send).toBeCalledWith(
    expect.anything(),
    expect.objectContaining({
      values: {
        [`${countAtom}`]: 1,
        [`${doubleAtom}`]: 2,
      },
    })
  ))
  await waitFor(() => expect(extension.send).toBeCalledTimes(2))
  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  await findByText('double: 4')
  await waitFor(() => expect(extension.send).toBeCalledTimes(3))
})

describe('when it receives an message of type...', () => {
  describe('DISPATCH and payload of type...', () => {
    it('dispatch & COMMIT', async () => {
      const countAtom = atom(0)

      const Counter = () => {
        useAtomsDevtools('test')
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
        <Provider>
          <Counter />
        </Provider>
      )

      await waitFor(() => expect(extension.send).toBeCalledTimes(1))
      fireEvent.click(getByText('button'))
      await findByText('count: 1')
      await waitFor(() => expect(extension.send).toBeCalledTimes(2))
      act(() =>
        (extensionSubscriber as (message: any) => void)({
          type: 'DISPATCH',
          payload: { type: 'COMMIT' },
        })
      )
      await findByText('count: 1')
      await waitFor(() =>
        expect(extension.init).toBeCalledWith({
          values: {
            [`${countAtom}`]: 1,
          },
          dependencies: {
            [`${countAtom}`]: [`${countAtom}`],
          },
        })
      )
    })

    describe('JUMP_TO_STATE | JUMP_TO_ACTION...', () => {
      it('time travelling', async () => {
        const countAtom = atom(0)

        const Counter = () => {
          const [count, setCount] = useAtom(countAtom)
          useAtomsDevtools('test')
          return (
            <>
              <div>count: {count}</div>
              <button onClick={() => setCount((c) => c + 1)}>button</button>
            </>
          )
        }

        extension.send.mockClear()
        const { getByText, findByText } = render(
          <Provider>
            <Counter />
          </Provider>
        )

        await waitFor(() => expect(extension.send).toBeCalledTimes(1))

        fireEvent.click(getByText('button'))
        await findByText('count: 1')
        await waitFor(() => expect(extension.send).toBeCalledTimes(2))
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
        await waitFor(() => expect(extension.send).toBeCalledTimes(3))
        fireEvent.click(getByText('button'))
        await findByText('count: 2')
        await waitFor(() => expect(extension.send).toBeCalledTimes(4))
      })
    })

    it('PAUSE_RECORDING, it toggles the sending of actions', async () => {
      const countAtom = atom(0)

      const Counter = () => {
        const [count, setCount] = useAtom(countAtom)
        useAtomsDevtools('test')
        return (
          <>
            <div>count: {count}</div>
            <button onClick={() => setCount((c) => c + 1)}>button</button>
          </>
        )
      }

      extension.send.mockClear()
      const { getByText, findByText } = render(
        <Provider>
          <Counter />
        </Provider>
      )

      await waitFor(() => expect(extension.send).toBeCalledTimes(1))
      await findByText('count: 0')
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
      await waitFor(() => expect(extension.send).toBeCalledTimes(2))
    })
  })
})
