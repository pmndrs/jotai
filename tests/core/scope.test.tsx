import { StrictMode, useState } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom } from 'jotai'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('simple scoped provider with scoped atom', async () => {
  const scope = Symbol()
  const countAtom = atom(0)

  const Display = () => {
    const [count, setCount] = useAtom(countAtom, scope)

    return (
      <>
        <p>count: {count}</p>
        <button onClick={() => setCount((c) => c + 1)}>dispatch</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Provider scope={scope}>
        <Display />
      </Provider>
    </StrictMode>
  )
  await findByText('count: 0')
  fireEvent.click(getByText('dispatch'))
  await findByText('count: 1')
})

it('default provider and atom with scoped provider and scoped atom', async () => {
  const scope = Symbol()

  const scopedCountAtom = atom(0)
  const countAtom = atom(0)

  const Display = () => {
    const [scopedCount, setScopedCount] = useAtom(scopedCountAtom, scope)
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
    <StrictMode>
      <Provider>
        <Provider scope={scope}>
          <Display />
        </Provider>
      </Provider>
    </StrictMode>
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

  const Display = () => {
    const [scopedCount, setScopedCount] = useAtom(scopedCountAtom, scope)

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

  const { getByText, findByText } = render(
    <StrictMode>
      <App />
    </StrictMode>
  )
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

  const Display = () => {
    const [scopedCount, setScopedCount] = useAtom(scopedCountAtom, scope)
    const [secondScopedCount, setSecondScopedCount] = useAtom(
      secondScopedCountAtom,
      secondScope
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
    <StrictMode>
      <Provider scope={scope}>
        <Provider scope={secondScope}>
          <Display />
        </Provider>
      </Provider>
    </StrictMode>
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
