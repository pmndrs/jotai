import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { AtomFactory } from 'jotai/vanilla/typeUtils'
import { withSetSelf, withSignal } from 'jotai/vanilla/utils'

describe('WithSignal', () => {
  // Match the helper pattern from withSetSelf.test.ts:
  // a base factory that ignores the options param (so mixins must add it).
  const atomWithoutOptions = ((read, write) => {
    const args = []
    args[0] = ((get) => (read as any)(get)) as typeof read
    if (write) {
      args[1] = ((get, set, ...a) => write(get, set, ...a)) as typeof write
    }
    return atom(...(args as Parameters<typeof atom>))
  }) as AtomFactory<never>

  const atomWithSignal = withSignal(atomWithoutOptions)

  it('should provide AbortSignal to read function', async () => {
    const store = createStore()
    let aSignal: any
    const derived = atomWithSignal(async (_, { signal }) => {
      aSignal = signal
      return 'ok'
    })

    expect(store.get(derived)).resolves.toBe('ok')
    await Promise.resolve()
    expect(aSignal).toBeDefined()
    expect(typeof aSignal.aborted).toBe('boolean')
    expect(typeof aSignal.addEventListener).toBe('function')
  })

  it('should abort the signal when dependencies change', async () => {
    const store = createStore()
    const a = atom(0)
    const resolve: (() => void)[] = []
    let aSignal: any
    const derivedAtom = atomWithSignal(async (get, { signal }) => {
      aSignal = signal
      get(a)
      await new Promise<void>((r) => resolve.push(r))
    })
    store.sub(derivedAtom, () => {})
    const onAbort = vi.fn()
    aSignal.addEventListener('abort', onAbort)
    store.set(a, 1)
    expect(onAbort).toHaveBeenCalledTimes(1)
  })

  it('should compose with withSetSelf (signal + setSelf)', async () => {
    const store = createStore()
    const cb = vi.fn()

    const factory = withSetSelf(atomWithSignal)
    const derived = factory(
      (_get, { signal, setSelf }) => {
        // signal is available alongside setSelf
        expect(signal).toBeDefined()
        Promise.resolve().then(() => setSelf('value')) // tuple arg inference -> [string]
        return 'initial'
      },
      (_get, _set, value: string) => {
        cb(value)
      },
    )

    expect(cb).not.toHaveBeenCalled()
    expect(store.get(derived)).toBe('initial')
    await Promise.resolve()
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith('value')
  })

  it('should work on read-only atoms (no setSelf in options)', () => {
    const store = createStore()
    let hasSetSelf = false
    let seenSignal: any

    const derived = atomWithSignal((_get, options) => {
      seenSignal = options.signal
      hasSetSelf = typeof (options as any).setSelf === 'function'
      return 123
    })

    expect(store.get(derived)).toBe(123)
    expect(seenSignal).toBeDefined()
    expect(hasSetSelf).toBe(false)
  })
})
