import React, { useState } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Provider as ProviderOrig, atom, useAtom } from '../src/index'

const Provider = process.env.PROVIDER_LESS_MODE
  ? (props: any) => props.children
  : ProviderOrig

const consoleError = console.error
beforeEach(() => {
  console.error = jest.fn()
})
afterEach(() => {
  console.error = consoleError
})

it('simple scoped provider with scoped atom', async () => {
  const scope = Symbol()
  const countAtom = atom(0)
  countAtom.scope = scope

  const Display: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)

    return (
      <>
        <p>count: {count}</p>
        <button onClick={() => setCount((c) => c + 1)}>dispatch</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider scope={scope}>
      <Display />
    </Provider>
  )
  await findByText('count: 0')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 1')
})

it('default provider and atom with scoped provider and scoped atom', async () => {
  const scope = Symbol()

  const scopedCountAtom = atom(0)
  scopedCountAtom.scope = scope
  const countAtom = atom(0)

  const Display: React.FC = () => {
    const [scopedCount, setScopedCount] = useAtom(scopedCountAtom)
    const [count, setCount] = useAtom(countAtom)

    return (
      <>
        <p>scopedCount: {scopedCount}</p>
        <p>count: {count}</p>
        <button
          onClick={() => {
            setScopedCount((c) => c + 1)
            setCount((c) => c + 1)
          }}>
          dispatch
        </button>
      </>
    )
  }

  const { getByText } = render(
    <Provider>
      <Provider scope={scope}>
        <Display />
      </Provider>
    </Provider>
  )
  await waitFor(() => {
    getByText('count: 0')
    getByText('scopedCount: 0')
  })
  fireEvent.click(getByText('dispatch'))
  await waitFor(() => {
    getByText('count: 1')
    getByText('scopedCount: 1')
  })
})

it('keeps scoped atom value when default provider is removed', async () => {
  const scope = Symbol()

  const scopedCountAtom = atom(0)
  scopedCountAtom.scope = scope

  const Display: React.FC = () => {
    const [scopedCount, setScopedCount] = useAtom(scopedCountAtom)

    return (
      <>
        <p>scopedCount: {scopedCount}</p>
        <button
          onClick={() => {
            setScopedCount((c) => c + 1)
          }}>
          dispatch
        </button>
      </>
    )
  }

  const App = () => {
    const [hide, setHide] = useState(false)
    if (hide) {
      return (
        <Provider scope={scope}>
          <Display />
        </Provider>
      )
    }
    return (
      <Provider scope={scope}>
        <Provider>
          <button onClick={() => setHide(true)}>hide</button>
          <Display />
        </Provider>
      </Provider>
    )
  }

  const { getByText, findByText } = render(<App />)
  await findByText('scopedCount: 0')
  fireEvent.click(getByText('dispatch'))
  await findByText('scopedCount: 1')
  fireEvent.click(getByText('hide'))
  await findByText('scopedCount: 1')
})

it('two different scoped providers and scoped atoms', async () => {
  const scope = Symbol()
  const secondScope = Symbol()

  const scopedCountAtom = atom(0)
  const secondScopedCountAtom = atom(10)

  scopedCountAtom.scope = scope
  secondScopedCountAtom.scope = secondScope

  const Display: React.FC = () => {
    const [scopedCount, setScopedCount] = useAtom(scopedCountAtom)
    const [secondScopedCount, setSecondScopedCount] = useAtom(
      secondScopedCountAtom
    )

    return (
      <>
        <p>scopedCount: {scopedCount}</p>
        <p>secondScopedCount: {secondScopedCount}</p>
        <button
          onClick={() => {
            setScopedCount((c) => c + 1)
            setSecondScopedCount((c) => c + 2)
          }}>
          dispatch
        </button>
      </>
    )
  }

  const { getByText } = render(
    <Provider scope={scope}>
      <Provider scope={secondScope}>
        <Display />
      </Provider>
    </Provider>
  )
  await waitFor(() => {
    getByText('scopedCount: 0')
    getByText('secondScopedCount: 10')
  })
  fireEvent.click(getByText('dispatch'))
  await waitFor(() => {
    getByText('scopedCount: 1')
    getByText('secondScopedCount: 12')
  })
})
