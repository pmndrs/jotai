import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import { withSetSelf } from 'jotai/vanilla/utils'

describe('withSetSelf', () => {
  it('should provide setSelf function to read function', async () => {
    const store = createStore()
    const countAtom = atom(0)
    let resolve = () => {}
    const asyncAtom = atom(async () => {
      await new Promise<void>((r) => (resolve = r))
      return 'hello'
    })
    const refreshAtom = atom(0)
    const promiseCache = new WeakMap<object, string>()

    const atomWithSetSelf = withSetSelf(atom)
    const derivedAtom = atomWithSetSelf(
      (get, { setSelf }) => {
        get(refreshAtom)
        const count = get(countAtom)
        const promise = get(asyncAtom)
        if (promiseCache.has(promise)) {
          return (promiseCache.get(promise) as string) + count
        }
        promise.then((v) => {
          promiseCache.set(promise, v)
          setSelf()
        })
        return 'pending' + count
      },
      (_get, set) => {
        set(refreshAtom, (c) => c + 1)
      },
    )

    const listener = vi.fn()
    store.sub(derivedAtom, listener)

    expect(store.get(derivedAtom)).toBe('pending0')

    resolve()
    await new Promise((r) => setTimeout(r, 10))

    expect(store.get(derivedAtom)).toBe('hello0')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('should work with write function', async () => {
    const store = createStore()
    const baseAtom = atom(0)

    const atomWithSetSelf = withSetSelf(atom)
    const derivedAtom = atomWithSetSelf(
      (get, { setSelf }) => {
        const value = get(baseAtom)
        if (value > 5) {
          setTimeout(() => setSelf(0), 0) // Reset when value gets too high (async)
        }
        return value
      },
      (get, set, newValue: number) => {
        set(baseAtom, newValue)
      },
    )

    expect(store.get(derivedAtom)).toBe(0)

    store.set(derivedAtom, 3)
    expect(store.get(derivedAtom)).toBe(3)

    store.set(derivedAtom, 10)
    expect(store.get(derivedAtom)).toBe(10) // Initially 10

    await new Promise((r) => setTimeout(r, 10))
    expect(store.get(derivedAtom)).toBe(0) // Should be reset by setSelf after timeout
  })

  it('should create working atom constructor functions', () => {
    const atomWithSetSelf1 = withSetSelf(atom)
    const atomWithSetSelf2 = withSetSelf(atom)

    // Each call creates a new constructor function, but they should work the same way
    expect(typeof atomWithSetSelf1).toBe('function')
    expect(typeof atomWithSetSelf2).toBe('function')
  })

  it('should work with simple atom', () => {
    const store = createStore()

    const atomWithSetSelf = withSetSelf(atom)
    const derivedAtom = atomWithSetSelf(
      (get, { setSelf }) => {
        const value = get(atom(5))
        if (value === 5) {
          setTimeout(() => setSelf(10), 0)
        }
        return value
      },
      (_get, _set, ..._args: unknown[]) => {
        // This is a derived atom, so we need a write function
      },
    )

    expect(store.get(derivedAtom)).toBe(5)
  })
})
