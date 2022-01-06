import { Suspense } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { useAtom } from 'jotai'
import { RESET, atomWithHash, atomWithStorage } from 'jotai/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

describe('atomWithStorage (sync)', () => {
  const storageData: Record<string, number> = {
    count: 10,
  }
  const dummyStorage = {
    getItem: (key: string) => {
      if (!(key in storageData)) {
        throw new Error('no value stored')
      }
      return storageData[key] as number
    },
    setItem: (key: string, newValue: number) => {
      storageData[key] = newValue
    },
    removeItem: (key: string) => {
      delete storageData[key]
    },
  }

  it('simple count', async () => {
    const countAtom = atomWithStorage('count', 1, dummyStorage)

    const Counter = () => {
      const [count, setCount] = useAtom(countAtom)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
          <button onClick={() => setCount(RESET)}>reset</button>
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

    fireEvent.click(getByText('reset'))
    await findByText('count: 1')
    expect(storageData.count).toBeUndefined()
  })
})

describe('atomWithStorage (async)', () => {
  const asyncStorageData: Record<string, number> = {
    count: 10,
  }
  const asyncDummyStorage = {
    getItem: async (key: string) => {
      await new Promise((r) => setTimeout(r, 100))
      if (!(key in asyncStorageData)) {
        throw new Error('no value stored')
      }
      return asyncStorageData[key] as number
    },
    setItem: async (key: string, newValue: number) => {
      await new Promise((r) => setTimeout(r, 100))
      asyncStorageData[key] = newValue
    },
    removeItem: async (key: string) => {
      await new Promise((r) => setTimeout(r, 100))
      delete asyncStorageData[key]
    },
  }

  it('async count', async () => {
    const countAtom = atomWithStorage('count', 1, asyncDummyStorage)

    const Counter = () => {
      const [count, setCount] = useAtom(countAtom)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
          <button onClick={() => setCount(RESET)}>reset</button>
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

    await findByText('loading')
    await findByText('count: 10')

    fireEvent.click(getByText('button'))
    await findByText('count: 11')
    await waitFor(() => {
      expect(asyncStorageData.count).toBe(11)
    })

    fireEvent.click(getByText('reset'))
    await findByText('count: 1')
    await waitFor(() => {
      expect(asyncStorageData.count).toBeUndefined()
    })
  })

  it('async new count', async () => {
    const countAtom = atomWithStorage('count2', 20, asyncDummyStorage)

    const Counter = () => {
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

    await findByText('loading')
    await findByText('count: 20')

    fireEvent.click(getByText('button'))
    await findByText('count: 21')
    await waitFor(() => {
      expect(asyncStorageData.count2).toBe(21)
    })
  })

  it('async new count with delayInit', async () => {
    const countAtom = atomWithStorage('count3', 30, {
      ...asyncDummyStorage,
      delayInit: true,
    })

    const Counter = () => {
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

    await findByText('count: 30')

    fireEvent.click(getByText('button'))
    await findByText('count: 31')
    await waitFor(() => {
      expect(asyncStorageData.count3).toBe(31)
    })
  })
})

describe('atomWithHash', () => {
  it('simple count', async () => {
    const countAtom = atomWithHash('count', 1)

    const Counter = () => {
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
