import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { AtomFactory } from 'jotai/vanilla/typeUtils'
import { withSetSelf } from 'jotai/vanilla/utils'

describe('withSetSelf', () => {
  const atomWithoutOptions = ((read, write) => {
    const args = []
    args[0] = ((get) => (read as any)(get)) as typeof read
    if (write) {
      args[1] = ((get, set, ...args) =>
        write(get, set, ...args)) as typeof write
    }
    return atom(...(args as Parameters<typeof atom>))
  }) as AtomFactory<never>

  const atomWithSetSelf = withSetSelf(atomWithoutOptions)

  it('should provide setSelf function to read function', async () => {
    const store = createStore()
    const cb = vi.fn()
    const derivedAtom = atomWithSetSelf(
      (_get, options) => {
        Promise.resolve().then(() => options.setSelf('value'))
        return 'initial'
      },
      (_get, _set, ...args: string[]) => {
        cb(...args)
      },
    )
    expect(cb).not.toHaveBeenCalled()
    expect(store.get(derivedAtom)).toBe('initial')
    await Promise.resolve()
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith('value')
  })

  it('should warn when setSelf is called synchronously', () => {
    const store = createStore()
    const derivedAtom = atomWithSetSelf<number, [number], number>(
      (_get, options) => {
        options.setSelf(0)
        return 0
      },
      () => 0,
    )
    // mock console.error
    console.warn = vi.fn()
    store.get(derivedAtom)
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(
      'setSelf function cannot be called in sync',
    )
  })

  it('should warn when setSelf is accessed on read-only atom', async () => {
    const store = createStore()
    let setSelfFn: any
    const derivedAtom = atomWithSetSelf((_get, ...args) => {
      setSelfFn = (args as any)[0].setSelf
      return 5
    })
    // mock console.error
    console.warn = vi.fn()
    store.get(derivedAtom)
    await Promise.resolve()
    expect(setSelfFn).toBeUndefined()
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(
      'setSelf function cannot be used with read-only atom',
    )
  })
})
