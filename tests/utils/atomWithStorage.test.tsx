import React, { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { useAtom } from '../../src/index'
import { atomWithStorage, atomWithHash } from '../../src/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

describe('atomWithStorage', () => {
  const storageData: Record<string, number> = {
    count: 10,
  }
  const dummyStorage = {
    getItem: (key: string) => {
      if (!(key in storageData)) {
        throw new Error('no value stored')
      }
      return storageData[key]
    },
    setItem: (key: string, newValue: number) => {
      storageData[key] = newValue
    },
  }

  it('simple count', async () => {
    const countAtom = atomWithStorage('count', 1, dummyStorage)

    const Counter: React.FC = () => {
      const [count, setCount] = useAtom(countAtom)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
        </>
      )
    }

    const { findByText, getByText } = render(
      <Provider>
        <Counter />
      </Provider>
    )

    await findByText('count: 10')

    fireEvent.click(getByText('button'))
    await findByText('count: 11')
    expect(storageData.count).toBe(11)
  })

  const asyncStorageData: Record<string, number> = {
    count: 10,
  }
  const asyncDummyStorage = {
    getItem: async (key: string) => {
      await new Promise((r) => setTimeout(r, 10))
      if (!(key in asyncStorageData)) {
        throw new Error('no value stored')
      }
      return asyncStorageData[key]
    },
    setItem: async (key: string, newValue: number) => {
      await new Promise((r) => setTimeout(r, 10))
      asyncStorageData[key] = newValue
    },
  }

  it('async count', async () => {
    const countAtom = atomWithStorage('count', 1, asyncDummyStorage)

    const Counter: React.FC = () => {
      const [count, setCount] = useAtom(countAtom)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
        </>
      )
    }

    const { findByText, getByText } = render(
      <Provider>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </Provider>
    )

    await findByText('count: 10')

    fireEvent.click(getByText('button'))
    await findByText('count: 11')
    expect(storageData.count).toBe(11)
  })
})

describe('atomWithHash', () => {
  it('simple count', async () => {
    const countAtom = atomWithHash('count', 1)

    const Counter: React.FC = () => {
      const [count, setCount] = useAtom(countAtom)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
        </>
      )
    }

    const { findByText, getByText } = render(
      <Provider>
        <Counter />
      </Provider>
    )

    await findByText('count: 1')

    fireEvent.click(getByText('button'))
    await findByText('count: 2')
    expect(window.location.hash).toEqual('#count=2')

    window.location.hash = 'count=3'
    await findByText('count: 3')
  })
})
