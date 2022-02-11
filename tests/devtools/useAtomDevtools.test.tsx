import { Suspense } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { atom, useAtom } from 'jotai'
import { useAtomDevtools } from 'jotai/devtools'
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
    useAtomDevtools(countAtom)
    const [count, setCount] = useAtom(countAtom)
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

  expect(extension.init).toHaveBeenLastCalledWith(0)
})

describe('If there is no extension installed...', () => {
  let savedDEV: boolean
  beforeAll(() => {
    savedDEV = __DEV__
    ;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = undefined
  })
  afterAll(() => {
    __DEV__ = savedDEV
    ;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = extensionConnector
  })

  const countAtom = atom(0)

  const Counter = () => {
    useAtomDevtools(countAtom)
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }
  it('does not throw', () => {
    __DEV__ = false
    expect(() => {
      render(
        <Provider>
          <Counter />
        </Provider>
      )
    }).not.toThrow()
  })

  it('[DEV-ONLY] warns in dev env', () => {
    __DEV__ = true
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

    console.warn = originalConsoleWarn
  })

  it('[PRD-ONLY] does not warn if not in dev env', () => {
    __DEV__ = false
    console.error = jest.fn()
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
    useAtomDevtools(countAtom)
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

  expect(extension.send).toBeCalledTimes(0)
  fireEvent.click(getByText('button'))
  await findByText('count: 1')
  expect(extension.send).toBeCalledTimes(1)
  fireEvent.click(getByText('button'))
  await findByText('count: 2')
  expect(extension.send).toBeCalledTimes(2)
})

describe('when it receives an message of type...', () => {
  it('updating state with ACTION', async () => {
    const countAtom = atom(0)

    const Counter = () => {
      useAtomDevtools(countAtom)
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
        <Suspense fallback={'loading'}>
          <Counter />
        </Suspense>
      </Provider>
    )

    expect(extension.send).toBeCalledTimes(0)
    fireEvent.click(getByText('button'))
    await findByText('count: 1')
    expect(extension.send).toBeCalledTimes(1)
    act(() =>
      (extensionSubscriber as (message: any) => void)({
        type: 'ACTION',
        payload: JSON.stringify(0),
      })
    )
    await findByText('count: 0')
    expect(extension.send).toBeCalledTimes(2)
  })

  describe('DISPATCH and payload of type...', () => {
    it('dispatch & COMMIT', async () => {
      const countAtom = atom(0)

      const Counter = () => {
        useAtomDevtools(countAtom)
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

      expect(extension.send).toBeCalledTimes(0)
      fireEvent.click(getByText('button'))
      await findByText('count: 1')
      expect(extension.send).toBeCalledTimes(1)
      fireEvent.click(getByText('button'))
      await findByText('count: 2')
      act(() =>
        (extensionSubscriber as (message: any) => void)({
          type: 'DISPATCH',
          payload: { type: 'COMMIT' },
        })
      )
      await findByText('count: 2')
      expect(extension.init).toBeCalledWith(2)
    })

    it('dispatch & IMPORT_STATE', async () => {
      const countAtom = atom(0)

      const Counter = () => {
        useAtomDevtools(countAtom)
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

      const nextLiftedState = {
        computedStates: [{ state: 5 }, { state: 6 }],
      }
      expect(extension.send).toBeCalledTimes(0)
      fireEvent.click(getByText('button'))
      await findByText('count: 1')
      expect(extension.send).toBeCalledTimes(1)
      fireEvent.click(getByText('button'))
      await findByText('count: 2')
      act(() =>
        (extensionSubscriber as (message: any) => void)({
          type: 'DISPATCH',
          payload: { type: 'IMPORT_STATE', nextLiftedState },
        })
      )
      expect(extension.init).toBeCalledWith(5)
      await findByText('count: 6')
    })

    describe('JUMP_TO_STATE | JUMP_TO_ACTION...', () => {
      it('time travelling', async () => {
        const countAtom = atom(0)

        const Counter = () => {
          useAtomDevtools(countAtom)
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

        expect(extension.send).toBeCalledTimes(0)
        fireEvent.click(getByText('button'))
        await findByText('count: 1')
        expect(extension.send).toBeCalledTimes(1)
        act(() =>
          (extensionSubscriber as (message: any) => void)({
            type: 'DISPATCH',
            payload: { type: 'JUMP_TO_ACTION' },
            state: JSON.stringify(0),
          })
        )
        await findByText('count: 0')
        expect(extension.send).toBeCalledTimes(1)
        fireEvent.click(getByText('button'))
        await findByText('count: 1')
        fireEvent.click(getByText('button'))
        await findByText('count: 2')
        expect(extension.send).toBeCalledTimes(3)
      })
    })
  })
})
