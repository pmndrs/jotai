import { expect, it, vi } from 'vitest'
import type { Getter, Setter, WritableAtom } from 'jotai/vanilla'
import { atom, createStore } from 'jotai/vanilla'

type GetterWithPeek = Getter & { peek: Getter }
type SetterWithRecurse = Setter & { recurse: Setter }
type Cleanup = () => void
type Effect = (get: GetterWithPeek, set: SetterWithRecurse) => void | Cleanup
type Ref = {
  get?: GetterWithPeek
  set?: SetterWithRecurse
  cleanup?: Cleanup | null
  fromCleanup?: boolean
  inProgress: number
  init?: () => void
}

function atomSyncEffect(effect: Effect) {
  const refAtom = atom(
    () => ({ inProgress: 0 }) as Ref,
    (get) => {
      const ref = get(refAtom)
      return () => {
        ref.cleanup?.()
        ref.cleanup = null
      }
    },
  )
  refAtom.onMount = (mount) => mount()
  const runAtom = atom({ fn: () => {} })
  const internalAtom = atom((get) => {
    const ref = get(refAtom)
    ref.get = ((a) => {
      return get(a)
    }) as Getter & { peek: Getter }
    ref.init!()
    if (ref.inProgress > 0) {
      return
    }
    const fn = () => {
      ref.cleanup?.()
      const cleanup = effectAtom.effect(ref.get!, ref.set!)
      ref.cleanup = () => {
        try {
          ref.fromCleanup = true
          cleanup?.()
        } finally {
          ref.fromCleanup = false
        }
      }
    }
    const tmp = atom(undefined)
    tmp.unstable_onInit = (store) => {
      store.set(runAtom, { fn })
    }
    get(tmp)
  })
  internalAtom.unstable_onInit = (store) => {
    store.sub(runAtom, () => {
      const { fn } = store.get(runAtom)
      fn()
    }) // FIXME unsubscribe
    const ref = store.get(refAtom)
    const get = store.get
    const set = store.set
    ref.init = () => {
      if (!ref.get!.peek) {
        ref.get!.peek = get
      }
      if (!ref.set) {
        const setter: Setter = (a, ...args) => {
          try {
            ++ref.inProgress
            return set(a, ...args)
          } finally {
            --ref.inProgress
            ref.get!(a) // FIXME why do we need this?
          }
        }
        const recurse: Setter = (a, ...args) => {
          if (ref.fromCleanup) {
            if (import.meta.env?.MODE !== 'production') {
              throw new Error('set.recurse is not allowed in cleanup')
            }
            return undefined as never
          }
          return set(a, ...args)
        }
        ref.set = Object.assign(setter, { recurse })
      }
    }
  }
  const effectAtom = Object.assign(
    atom((get) => get(internalAtom)),
    { effect },
  )
  return effectAtom
}

const withAtomEffect = <T extends WritableAtom<unknown, never[], unknown>>(
  a: T,
  effect: Effect,
): T => {
  const effectAtom = atomSyncEffect(effect)
  return atom(
    (get) => {
      get(effectAtom)
      return get(a)
    },
    (_get, set, ...args) => set(a, ...args),
  ) as T
}

it('responds to changes to atoms when subscribed', () => {
  const store = createStore()
  const a = atom(1)
  const b = atom(1)
  const w = atom(null, (_get, set, value: number) => {
    set(a, value)
    set(b, value)
  })
  const results: number[] = []
  const cleanup = vi.fn()
  const effect = vi.fn((get: Getter) => {
    results.push(get(a) * 10 + get(b))
    return cleanup
  })
  const e = atomSyncEffect(effect)
  const unsub = store.sub(e, () => {}) // mount syncEffect
  expect(effect).toBeCalledTimes(1)
  expect(results).toStrictEqual([11]) // initial values at time of effect mount
  store.set(a, 2)
  expect(results).toStrictEqual([11, 21])
  store.set(b, 2)
  expect(results).toStrictEqual([11, 21, 22])
  store.set(w, 3)
  // intermediate state of '32' should not be recorded since the effect runs _after_ graph has been computed
  expect(results).toStrictEqual([11, 21, 22, 33])
  expect(cleanup).toBeCalledTimes(3)
  expect(effect).toBeCalledTimes(4)
  unsub()
  expect(cleanup).toBeCalledTimes(4)
  expect(effect).toBeCalledTimes(4)
  store.set(a, 4)
  // the effect is unmounted so no more updates
  expect(results).toStrictEqual([11, 21, 22, 33])
  expect(effect).toBeCalledTimes(4)
})

it('responds to changes to atoms when mounted with get', () => {
  const store = createStore()
  const a = atom(1)
  const b = atom(1)
  const w = atom(null, (_get, set, value: number) => {
    set(a, value)
    set(b, value)
  })
  const results: number[] = []
  const cleanup = vi.fn()
  const effect = vi.fn((get: Getter) => {
    results.push(get(a) * 10 + get(b))
    return cleanup
  })
  const e = atomSyncEffect(effect)
  const d = atom((get) => get(e))
  const unsub = store.sub(d, () => {}) // mount syncEffect
  expect(effect).toBeCalledTimes(1)
  expect(results).toStrictEqual([11]) // initial values at time of effect mount
  store.set(a, 2)
  expect(results).toStrictEqual([11, 21])
  store.set(b, 2)
  expect(results).toStrictEqual([11, 21, 22])
  store.set(w, 3)
  // intermediate state of '32' should not be recorded since the effect runs _after_ graph has been computed
  expect(results).toStrictEqual([11, 21, 22, 33])
  expect(cleanup).toBeCalledTimes(3)
  expect(effect).toBeCalledTimes(4)
  unsub()
  expect(cleanup).toBeCalledTimes(4)
  expect(effect).toBeCalledTimes(4)
})

it('sets values to atoms without causing infinite loop', () => {
  const store = createStore()
  const a = atom(1)
  const effect = vi.fn((get: Getter, set: Setter) => {
    set(a, get(a) + 1)
  })
  const e = atomSyncEffect(effect)
  const unsub = store.sub(e, () => {}) // mount syncEffect
  expect(effect).toBeCalledTimes(1)
  expect(store.get(a)).toBe(2) // initial values at time of effect mount
  store.set(a, (v) => ++v)
  expect(store.get(a)).toBe(4)
  expect(effect).toBeCalledTimes(2)
  unsub()
  expect(effect).toBeCalledTimes(2)
})

it('reads the value with peek without subscribing to updates', () => {
  const store = createStore()
  const a = atom(1)
  let result = 0
  const effect = vi.fn((get: GetterWithPeek) => {
    result = get.peek(a)
  })
  const e = atomSyncEffect(effect)
  store.sub(e, () => {}) // mount syncEffect
  expect(effect).toBeCalledTimes(1)
  expect(result).toBe(1) // initial values at time of effect mount
  store.set(a, 2)
  expect(effect).toBeCalledTimes(1)
})

it('supports recursion', () => {
  const store = createStore()
  const a = atom(1)
  const effect = vi.fn((get: Getter, set: SetterWithRecurse) => {
    if (get(a) < 3) {
      set.recurse(a, (v) => ++v)
    }
  })
  const e = atomSyncEffect(effect)
  store.sub(e, () => {}) // mount syncEffect
  // FIXME which is correct?
  expect(effect).toBeCalledTimes(2) // expect(effect).toBeCalledTimes(3)
  expect(store.get(a)).toBe(3)
})

it('read two atoms', () => {
  const store = createStore()
  const a = atom(0)
  const b = atom(0)
  const r = atom([] as number[])
  const e = atomSyncEffect((get, set) => {
    set(r, (v) => [...v, get(a) * 10 + get(b)])
  })
  store.sub(e, () => {})
  const w = atom(null, (_get, set) => {
    set(a, (v) => v + 1)
    set(b, (v) => v + 1)
  })
  store.set(w)
  expect(store.get(r)).toEqual([0, 11])
  expect(store.get(r)).not.toEqual([0, 10, 11])
})

it('does not cause infinite loops when it references itself', async () => {
  const countWithEffectAtom = withAtomEffect(atom(0), (get, set) => {
    get(countWithEffectAtom)
    set(countWithEffectAtom, (v) => v + 1)
  })
  const store = createStore()
  store.sub(countWithEffectAtom, () => {})
  expect(store.get(countWithEffectAtom)).toBe(1)
  store.set(countWithEffectAtom, (v) => {
    return v + 1
  })
  expect(store.get(countWithEffectAtom)).toBe(3)
})

it('fires after recomputeDependents and before atom listeners', async () => {
  const store = createStore()
  const a = atom({} as { v?: number })
  let r
  const e = atomSyncEffect((get) => {
    r = get(a).v
  })
  const b = atom((get) => {
    const aValue = get(a)
    get(e)
    // sets property `v` inside recomputeDependents
    aValue.v = 1
    return aValue
  })
  store.sub(b, () => {
    // sets property `v` inside atom listener
    store.get(a).v = 2
  })
  store.set(a, { v: 0 })
  expect(r).toStrictEqual(1)
})
