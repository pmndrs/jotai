import React, { Fragment, StrictMode, useEffect, useRef } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import {
  Provider as ProviderOrig,
  atom,
  useAtom,
  useUpdateAtom,
} from '../src/index'

const Provider = process.env.PROVIDER_LESS_MODE ? Fragment : ProviderOrig

const useRerenderCount = () => {
  const rerenderCountRef = useRef(0)
  useEffect(() => {
    rerenderCountRef.current += 1
  })
  return rerenderCountRef.current
}

it('useUpdateAtom does not trigger rerender in component', async () => {
  const countAtom = atom(0)

  const Displayer: React.FC = () => {
    const [count] = useAtom(countAtom)
    const rerenders = useRerenderCount()
    return (
      <div>
        count: {count}, rerenders: {rerenders}
      </div>
    )
  }

  const Updater: React.FC = () => {
    const setCount = useUpdateAtom(countAtom)
    const rerenders = useRerenderCount()
    return (
      <>
        <button onClick={() => setCount((value) => value + 1)}>
          increment
        </button>
        <div>updater rerenders: {rerenders}</div>
      </>
    )
  }

  const Parent: React.FC = () => {
    return (
      <>
        <Displayer />
        <Updater />
      </>
    )
  }

  const { getByText } = render(
    <StrictMode>
      <Provider>
        <Parent />
      </Provider>
    </StrictMode>
  )

  await waitFor(() => {
    getByText('count: 0, rerenders: 0')
    getByText('updater rerenders: 0')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 1, rerenders: 1')
    getByText('updater rerenders: 0')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 2, rerenders: 2')
    getByText('updater rerenders: 0')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 3, rerenders: 3')
    getByText('updater rerenders: 0')
  })
})

it('useUpdateAtom with scope', async () => {
  const scope = Symbol()
  const countAtom = atom(0)
  countAtom.scope = scope

  const Displayer: React.FC = () => {
    const [count] = useAtom(countAtom)
    return <div>count: {count}</div>
  }

  const Updater: React.FC = () => {
    const setCount = useUpdateAtom(countAtom)
    return (
      <button onClick={() => setCount((value) => value + 1)}>increment</button>
    )
  }

  const Parent: React.FC = () => {
    return (
      <>
        <Displayer />
        <Updater />
      </>
    )
  }

  const { getByText } = render(
    <StrictMode>
      <Provider scope={scope}>
        <Parent />
      </Provider>
    </StrictMode>
  )

  await waitFor(() => {
    getByText('count: 0')
  })
  fireEvent.click(getByText('increment'))
  await waitFor(() => {
    getByText('count: 1')
  })
})
