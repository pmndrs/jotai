import React, { useCallback, useEffect, useState } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Provider, useAtom, atom } from '../../src/index'
import { useAtomCallback } from '../../src/utils'

it('useAtomCallback with get', async () => {
  const countAtom = atom(0)

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>atom count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>dispatch</button>
      </>
    )
  }

  const Monitor: React.FC = () => {
    const [count, setCount] = useState(0)
    const readCount = useAtomCallback(
      useCallback((get) => {
        const currentCount = get(countAtom)
        setCount(currentCount)
        return currentCount
      }, [])
    )
    useEffect(() => {
      const timer = setInterval(async () => {
        await readCount()
      }, 10)
      return () => {
        clearInterval(timer)
      }
    }, [readCount])
    return (
      <>
        <div>state count: {count}</div>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Counter />
      <Monitor />
    </Provider>
  )

  await findByText('atom count: 0')
  fireEvent.click(getByText('dispatch'))
  await waitFor(() => {
    getByText('atom count: 1')
    getByText('state count: 1')
  })
})

it('useAtomCallback with set and update', async () => {
  const countAtom = atom(0)
  const changeableAtom = atom(0)
  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>dispatch</button>
      </>
    )
  }

  const Monitor: React.FC = () => {
    const [changeableCount] = useAtom(changeableAtom)
    const chagneCount = useAtomCallback(
      useCallback((get, set) => {
        const currentCount = get(countAtom)
        set(changeableAtom, currentCount)
        return currentCount
      }, [])
    )
    useEffect(() => {
      const timer = setInterval(async () => {
        await chagneCount()
      }, 10)
      return () => {
        clearInterval(timer)
      }
    }, [chagneCount])
    return (
      <>
        <div>changeable count: {changeableCount}</div>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Counter />
      <Monitor />
    </Provider>
  )

  await findByText('count: 0')
  fireEvent.click(getByText('dispatch'))
  await waitFor(() => {
    getByText('count: 1')
    getByText('changeable count: 1')
  })
})
