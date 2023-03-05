import { StrictMode, Suspense } from 'react'
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { useAtom } from 'jotai/react'
import {
  unstable_NO_STORAGE_VALUE as NO_STORAGE_VALUE,
  RESET,
  atomWithStorage,
  createJSONStorage,
} from 'jotai/vanilla/utils'

const resolve: (() => void)[] = []

describe('atomWithStorage (sync)', () => {
  const storageData: Record<string, number> = {
    count: 10,
  }
  const dummyStorage = {
    getItem: (key: string) => {
      if (!(key in storageData)) {
        return NO_STORAGE_VALUE
      }
      return storageData[key] as number
    },
    setItem: (key: string, newValue: number) => {
      storageData[key] = newValue
      dummyStorage.listeners.forEach((listener) => {
        listener(key, newValue)
      })
    },
    removeItem: (key: string) => {
      delete storageData[key]
    },
    listeners: new Set<(key: string, value: number) => void>(),
    subscribe: (key: string, callback: (value: number) => void) => {
      const listener = (k: string, value: number) => {
        if (k === key) {
          callback(value)
        }
      }
      dummyStorage.listeners.add(listener)
      return () => dummyStorage.listeners.delete(listener)
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
      <StrictMode>
        <Counter />
      </StrictMode>
    )

    await findByText('count: 10')

    fireEvent.click(getByText('button'))
    await findByText('count: 11')
    expect(storageData.count).toBe(11)

    fireEvent.click(getByText('reset'))
    await findByText('count: 1')
    expect(storageData.count).toBeUndefined()
  })

  it('storage updates before mount (#1079)', async () => {
    dummyStorage.setItem('count', 10)
    const countAtom = atomWithStorage('count', 1, dummyStorage)

    const Counter = () => {
      const [count] = useAtom(countAtom)
      // emulating updating before mount
      if (dummyStorage.getItem('count') !== 9) {
        dummyStorage.setItem('count', 9)
      }
      return <div>count: {count}</div>
    }

    const { findByText } = render(
      <StrictMode>
        <Counter />
      </StrictMode>
    )

    await findByText('count: 9')
  })
})

describe('with sync string storage', () => {
  const storageData: Record<string, string> = {
    count: '10',
  }
  const stringStorage = {
    getItem: (key: string) => {
      return storageData[key] || null
    },
    setItem: (key: string, newValue: string) => {
      storageData[key] = newValue
      stringStorage.listeners.forEach((listener) => {
        listener(key, newValue)
      })
    },
    removeItem: (key: string) => {
      delete storageData[key]
    },
    listeners: new Set<(key: string, value: string) => void>(),
  }
  const dummyStorage = createJSONStorage<number>(() => stringStorage)
  dummyStorage.subscribe = (key, callback) => {
    const listener = (k: string, value: string) => {
      if (k === key) {
        callback(JSON.parse(value))
      }
    }
    stringStorage.listeners.add(listener)
    return () => stringStorage.listeners.delete(listener)
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
          <button onClick={() => setCount((c) => (c === 2 ? RESET : c + 1))}>
            conditional reset
          </button>
        </>
      )
    }

    const { findByText, getByText } = render(
      <StrictMode>
        <Counter />
      </StrictMode>
    )

    await findByText('count: 10')

    fireEvent.click(getByText('button'))
    await findByText('count: 11')
    expect(storageData.count).toBe('11')

    fireEvent.click(getByText('reset'))
    await findByText('count: 1')
    expect(storageData.count).toBeUndefined()

    fireEvent.click(getByText('button'))
    await findByText('count: 2')
    expect(storageData.count).toBe('2')

    fireEvent.click(getByText('conditional reset'))
    await findByText('count: 1')
    expect(storageData.count).toBeUndefined()
  })

  it('no entry (#1086)', async () => {
    const noentryAtom = atomWithStorage('noentry', -1, dummyStorage)

    const Counter = () => {
      const [noentry] = useAtom(noentryAtom)
      return <div>noentry: {noentry}</div>
    }

    const { findByText } = render(
      <StrictMode>
        <Counter />
      </StrictMode>
    )

    await findByText('noentry: -1')
  })
})

describe('atomWithStorage (async)', () => {
  const asyncStorageData: Record<string, number> = {
    count: 10,
  }
  const asyncDummyStorage = {
    getItem: async (key: string) => {
      await new Promise<void>((r) => resolve.push(r))
      if (!(key in asyncStorageData)) {
        return NO_STORAGE_VALUE
      }
      return asyncStorageData[key] as number
    },
    setItem: async (key: string, newValue: number) => {
      await new Promise<void>((r) => resolve.push(r))
      asyncStorageData[key] = newValue
    },
    removeItem: async (key: string) => {
      await new Promise<void>((r) => resolve.push(r))
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
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>
    )

    resolve.splice(0).forEach((fn) => fn())
    await findByText('count: 10')

    fireEvent.click(getByText('button'))
    resolve.splice(0).forEach((fn) => fn())
    await findByText('count: 11')
    await waitFor(() => {
      expect(asyncStorageData.count).toBe(11)
    })

    fireEvent.click(getByText('reset'))
    resolve.splice(0).forEach((fn) => fn())
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
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>
    )

    await findByText('count: 20')

    fireEvent.click(getByText('button'))
    resolve.splice(0).forEach((fn) => fn())
    await findByText('count: 21')
    await waitFor(() => {
      expect(asyncStorageData.count2).toBe(21)
    })
  })
})

describe('atomWithStorage (without localStorage) (#949)', () => {
  it('createJSONStorage without localStorage', async () => {
    const countAtom = atomWithStorage(
      'count',
      1,
      createJSONStorage(() => undefined as any)
    )

    const Counter = () => {
      const [count, setCount] = useAtom(countAtom)
      return (
        <>
          <div>count: {count}</div>
          <button onClick={() => setCount((c) => c + 1)}>button</button>
        </>
      )
    }

    const { findByText } = render(
      <StrictMode>
        <Counter />
      </StrictMode>
    )

    await findByText('count: 1')
  })
})

describe('atomWithStorage (in non-browser environment)', () => {
  const asyncStorageData: Record<string, string> = {
    count: '10',
  }
  const asyncDummyStorage = {
    getItem: async (key: string) => {
      await new Promise<void>((r) => resolve.push(r))
      return asyncStorageData[key] as string
    },
    setItem: async (key: string, newValue: string) => {
      await new Promise<void>((r) => resolve.push(r))
      asyncStorageData[key] = newValue
    },
    removeItem: async (key: string) => {
      await new Promise<void>((r) => resolve.push(r))
      delete asyncStorageData[key]
    },
  }

  const addEventListener = window.addEventListener

  beforeAll(() => {
    ;(window as any).addEventListener = undefined
  })

  afterAll(() => {
    window.addEventListener = addEventListener
  })

  it('createJSONStorage with undefined window.addEventListener', async () => {
    const storage = createJSONStorage(() => asyncDummyStorage)

    expect(storage.subscribe).toBeUndefined()
  })
})
