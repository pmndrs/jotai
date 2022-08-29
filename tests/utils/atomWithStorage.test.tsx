import { Suspense } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { useAtom } from 'jotai'
import {
  unstable_NO_STORAGE_VALUE as NO_STORAGE_VALUE,
  RESET,
  atomWithHash,
  atomWithStorage,
  createJSONStorage,
} from 'jotai/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

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
      <Provider>
        <Counter />
      </Provider>
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
      <Provider>
        <Counter />
      </Provider>
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
      <Provider>
        <Counter />
      </Provider>
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
      await new Promise((r) => setTimeout(r, 100))
      if (!(key in asyncStorageData)) {
        return NO_STORAGE_VALUE
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
      <Provider>
        <Counter />
      </Provider>
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
      await new Promise((r) => setTimeout(r, 100))
      return asyncStorageData[key] as string
    },
    setItem: async (key: string, newValue: string) => {
      await new Promise((r) => setTimeout(r, 100))
      asyncStorageData[key] = newValue
    },
    removeItem: async (key: string) => {
      await new Promise((r) => setTimeout(r, 100))
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

describe('atomWithHash', () => {
  it('simple count', async () => {
    const countAtom = atomWithHash('count', 1)

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

    await findByText('count: 1')

    fireEvent.click(getByText('button'))
    await findByText('count: 2')
    expect(window.location.hash).toEqual('#count=2')

    window.location.hash = 'count=3'
    await findByText('count: 3')

    fireEvent.click(getByText('reset'))
    await findByText('count: 1')
    expect(window.location.hash).toEqual('')
  })

  it('returning reset from state dispatcher', async () => {
    const isVisibleAtom = atomWithHash('isVisible', true)

    const Counter = () => {
      const [isVisible, setIsVisible] = useAtom(isVisibleAtom)
      return (
        <>
          {isVisible && <div id="visible">visible</div>}
          <button onClick={() => setIsVisible((prev) => !prev)}>button</button>
          <button onClick={() => setIsVisible(RESET)}>reset</button>
        </>
      )
    }

    const { findByText, getByText, queryByText } = render(
      <Provider>
        <Counter />
      </Provider>
    )

    await findByText('visible')

    fireEvent.click(getByText('button'))

    await waitFor(() => {
      expect(queryByText('visible')).toBeNull()
    })

    expect(window.location.hash).toEqual('#isVisible=false')

    fireEvent.click(getByText('button'))
    await findByText('visible')
    expect(window.location.hash).toEqual('#isVisible=true')

    fireEvent.click(getByText('button'))

    fireEvent.click(getByText('reset'))
    await findByText('visible')
    expect(window.location.hash).toEqual('')
  })
})
