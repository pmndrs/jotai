import React, { Fragment, StrictMode, Suspense } from 'react'
import { render } from '@testing-library/react'
import { Provider as ProviderOrig, atom, useAtom } from '../../src/index'
import { waitForAll } from '../../src/utils'

const Provider = process.env.PROVIDER_LESS_MODE ? Fragment : ProviderOrig

it('waits for two async atoms', async () => {
  let isAsyncAtomRunning = false
  let isAnotherAsyncAtomRunning = false
  const asyncAtom = atom(async () => {
    isAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAsyncAtomRunning = false
        resolve(true)
      }, 10)
    })
    return 1
  })
  const anotherAsyncAtom = atom(async () => {
    isAnotherAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAnotherAsyncAtomRunning = false
        resolve(true)
      }, 10)
    })
    return '2'
  })

  const Counter: React.FC = () => {
    const [[num1, num2]] = useAtom(waitForAll([asyncAtom, anotherAsyncAtom]))
    return (
      <>
        <div>num1: {num1}</div>
        <div>num2: {num2}</div>
      </>
    )
  }

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  expect(isAsyncAtomRunning).toBe(true)
  expect(isAnotherAsyncAtomRunning).toBe(true)
  await findByText('num1: 1')
  await findByText('num2: 2')
  expect(isAsyncAtomRunning).toBe(false)
  expect(isAnotherAsyncAtomRunning).toBe(false)
})

it('can use named atoms', async () => {
  let isAsyncAtomRunning = false
  let isAnotherAsyncAtomRunning = false
  const asyncAtom = atom(async () => {
    isAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAsyncAtomRunning = false
        resolve(true)
      }, 10)
    })
    return 1
  })
  const anotherAsyncAtom = atom(async () => {
    isAnotherAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAnotherAsyncAtomRunning = false
        resolve(true)
      }, 10)
    })
    return 'a'
  })

  const Counter: React.FC = () => {
    const [{ num, str }] = useAtom(
      waitForAll({
        num: asyncAtom,
        str: anotherAsyncAtom,
      })
    )
    return (
      <>
        <div>num: {num}</div>
        <div>str: {str}</div>
      </>
    )
  }

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  expect(isAsyncAtomRunning).toBe(true)
  expect(isAnotherAsyncAtomRunning).toBe(true)
  await findByText('num: 1')
  await findByText('str: a')
  expect(isAsyncAtomRunning).toBe(false)
  expect(isAnotherAsyncAtomRunning).toBe(false)
})

it('can use named atoms in derived atom', async () => {
  let isAsyncAtomRunning = false
  let isAnotherAsyncAtomRunning = false
  const asyncAtom = atom(async () => {
    isAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAsyncAtomRunning = false
        resolve(true)
      }, 10)
    })
    return 1
  })
  const anotherAsyncAtom = atom(async () => {
    isAnotherAsyncAtomRunning = true
    await new Promise((resolve) => {
      setTimeout(() => {
        isAnotherAsyncAtomRunning = false
        resolve(true)
      }, 10)
    })
    return 'a'
  })

  const combinedWaitingAtom = atom((get) => {
    const { num, str } = get(
      waitForAll({
        num: asyncAtom,
        str: anotherAsyncAtom,
      })
    )
    return { num: num * 2, str: str.toUpperCase() }
  })

  const Counter: React.FC = () => {
    const [{ num, str }] = useAtom(combinedWaitingAtom)
    return (
      <>
        <div>num: {num}</div>
        <div>str: {str}</div>
      </>
    )
  }

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('loading')
  expect(isAsyncAtomRunning).toBe(true)
  expect(isAnotherAsyncAtomRunning).toBe(true)
  await findByText('num: 2')
  await findByText('str: A')
  expect(isAsyncAtomRunning).toBe(false)
  expect(isAnotherAsyncAtomRunning).toBe(false)
})
