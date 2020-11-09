import React, { useCallback, useEffect, useState } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, useAtom, atom } from '../../src/index'
import { useAtomCallback } from '../../src/utils'

it('useAtomCallback with get', async () => {
  const countAtom = atom(0)

  const Parent: React.FC = () => {
    const [count, setCount] = useAtom(countAtom)
    const [secondCount, setSecondCount] = useState(0)
    const readCount = useAtomCallback(
      useCallback((get) => {
        const currentCount = get(countAtom)

        setSecondCount(currentCount)
        return currentCount
      }, [])
    )
    useEffect(() => {
      const read = async () => await readCount()
      read()
    }, [count, readCount])
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(count + 1)}>dispatch</button>
        <div>secondCount: {secondCount}</div>
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
  await findByText('secondCount: 1')
})

it('useAtomCallback with set', async () => {
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
      const read = async () => await readCount()
      read()
    }, [count, readCount])
    useEffect(() => {
      const change = async () => await changeCount()
      change()
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
