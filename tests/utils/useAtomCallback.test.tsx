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
  await findByText('atom count: 1')
  await findByText('state count: 1')
})

it('useAtomCallback with set and update', async () => {
  const countAtom = atom(0)
  const changeableAtom = atom(0)

  const Parent: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const [secondCount, setSecondCount] = useState(0)
    const [changeableCount] = useAtom(changeableAtom)
    const readCount = useAtomCallback(
      useCallback((get) => {
        const currentCount = get(countAtom)
        setSecondCount(currentCount)
        return currentCount
      }, [])
    )
    const changeCount = useAtomCallback(
      useCallback(
        (_, set) => {
          set(changeableAtom, secondCount)
          return secondCount
        },
        [secondCount]
      )
    )
    useEffect(() => {
      readCount()
    }, [count, readCount])
    useEffect(() => {
      changeCount()
    }, [secondCount, changeCount])
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(count + 1)}>dispatch</button>
        <div>secondCount: {secondCount}</div>
        <div>changeableCount: {changeableCount}</div>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Parent />
    </Provider>
  )

  await findByText('count: 0')
  fireEvent.click(getByText('dispatch'))
  await findByText('changeableCount: 1')
})
