import React, { useEffect, useRef, useCallback } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom } from '../../src/index'
import { useSelector, useUpdateAtom } from '../../src/utils'

it('useSelector works as expected', async () => {
  const bigAtom = atom({ a: 0, b: 'othervalue' })

  const Parent = () => {
    const setValue = useUpdateAtom(bigAtom)
    return (
      <>
        <button
          onClick={() =>
            setValue((oldValue) => ({ ...oldValue, a: oldValue.a + 1 }))
          }>
          increment
        </button>
      </>
    )
  }

  const Selector = () => {
    const a = useSelector(
      bigAtom,
      useCallback((value) => value.a, [])
    )
    return (
      <>
        <div>a: {a}</div>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Parent />
      <Selector />
    </Provider>
  )

  await findByText('a: 0')

  fireEvent.click(getByText('increment'))
  await findByText('a: 1')
  fireEvent.click(getByText('increment'))
  await findByText('a: 2')
  fireEvent.click(getByText('increment'))
  await findByText('a: 3')
})

it('do not update unless equality function says value has changed', async () => {
  const bigAtom = atom({ a: 0 })

  const useCommitCount = () => {
    const rerenderCountRef = useRef(0)
    useEffect(() => {
      rerenderCountRef.current += 1
    })
    return rerenderCountRef.current
  }

  const Parent = () => {
    const setValue = useUpdateAtom(bigAtom)
    return (
      <>
        <button
          onClick={() =>
            setValue((oldValue) => ({ ...oldValue, a: oldValue.a + 1 }))
          }>
          increment
        </button>
        <button onClick={() => setValue((oldValue) => ({ ...oldValue }))}>
          copy
        </button>
      </>
    )
  }

  const Selector = () => {
    const value = useSelector(
      bigAtom,
      useCallback((value) => value, []),
      useCallback(
        (left, right) => JSON.stringify(left) === JSON.stringify(right),
        []
      )
    )
    const commits = useCommitCount()
    return (
      <>
        <div>value: {JSON.stringify(value)}</div>
        <div>commits: {commits}</div>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Parent />
      <Selector />
    </Provider>
  )

  await findByText('value: {"a":0}')
  await findByText('commits: 0')
  fireEvent.click(getByText('copy'))
  await findByText('value: {"a":0}')
  await findByText('commits: 0')

  fireEvent.click(getByText('increment'))
  await findByText('value: {"a":1}')
  await findByText('commits: 1')
  fireEvent.click(getByText('copy'))
  await findByText('value: {"a":1}')
  await findByText('commits: 1')

  fireEvent.click(getByText('increment'))
  await findByText('value: {"a":2}')
  await findByText('commits: 2')
  fireEvent.click(getByText('copy'))
  await findByText('value: {"a":2}')
  await findByText('commits: 2')

  fireEvent.click(getByText('increment'))
  await findByText('value: {"a":3}')
  await findByText('commits: 3')
  fireEvent.click(getByText('copy'))
  await findByText('value: {"a":3}')
  await findByText('commits: 3')
})

it('useSelector with scope', async () => {
  const scope = Symbol()
  const bigAtom = atom({ a: 0, b: 'othervalue' })
  bigAtom.scope = scope

  const Parent = () => {
    const setValue = useUpdateAtom(bigAtom)
    return (
      <>
        <button
          onClick={() =>
            setValue((oldValue) => ({ ...oldValue, a: oldValue.a + 1 }))
          }>
          increment
        </button>
      </>
    )
  }

  const Selector = () => {
    const a = useSelector(
      bigAtom,
      useCallback((value) => value.a, [])
    )
    return (
      <>
        <div>a: {a}</div>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider scope={scope}>
      <Parent />
      <Selector />
    </Provider>
  )

  await findByText('a: 0')

  fireEvent.click(getByText('increment'))
  await findByText('a: 1')
})
