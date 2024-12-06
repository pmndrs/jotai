import LeakDetector from 'jest-leak-detector'
import { describe, expect, it } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { Atom, PrimitiveAtom } from 'jotai/vanilla'

describe('test memory leaks (get & set only)', () => {
  it('one atom', async () => {
    const store = createStore()
    let objAtom: Atom<object> | undefined = atom({})
    const detector = new LeakDetector(store.get(objAtom))
    objAtom = undefined
    expect(await detector.isLeaking()).toBe(false)
  })

  it('two atoms', async () => {
    const store = createStore()
    let objAtom: Atom<object> | undefined = atom({})
    const detector1 = new LeakDetector(store.get(objAtom))
    let derivedAtom: Atom<object> | undefined = atom((get) => ({
      obj: objAtom && get(objAtom),
    }))
    const detector2 = new LeakDetector(store.get(derivedAtom))
    objAtom = undefined
    derivedAtom = undefined
    expect(await detector1.isLeaking()).toBe(false)
    expect(await detector2.isLeaking()).toBe(false)
  })

  it('should not hold onto dependent atoms that are not mounted', async () => {
    const store = createStore()
    const objAtom = atom({})
    let depAtom: Atom<unknown> | undefined = atom((get) => get(objAtom))
    const detector = new LeakDetector(depAtom)
    store.get(depAtom)
    depAtom = undefined
    await expect(detector.isLeaking()).resolves.toBe(false)
  })

  it('with a long-lived base atom', async () => {
    const store = createStore()
    const objAtom = atom({})
    let derivedAtom: Atom<object> | undefined = atom((get) => ({
      obj: get(objAtom),
    }))
    const detector = new LeakDetector(store.get(derivedAtom))
    derivedAtom = undefined
    expect(await detector.isLeaking()).toBe(false)
  })
})

describe('test memory leaks (with subscribe)', () => {
  it('one atom', async () => {
    const store = createStore()
    let objAtom: Atom<object> | undefined = atom({})
    const detector = new LeakDetector(store.get(objAtom))
    let unsub: (() => void) | undefined = store.sub(objAtom, () => {})
    unsub()
    unsub = undefined
    objAtom = undefined
    expect(await detector.isLeaking()).toBe(false)
  })

  it('two atoms', async () => {
    const store = createStore()
    let objAtom: Atom<object> | undefined = atom({})
    const detector1 = new LeakDetector(store.get(objAtom))
    let derivedAtom: Atom<object> | undefined = atom((get) => ({
      obj: objAtom && get(objAtom),
    }))
    const detector2 = new LeakDetector(store.get(derivedAtom))
    let unsub: (() => void) | undefined = store.sub(objAtom, () => {})
    unsub()
    unsub = undefined
    objAtom = undefined
    derivedAtom = undefined
    expect(await detector1.isLeaking()).toBe(false)
    expect(await detector2.isLeaking()).toBe(false)
  })

  it('with a long-lived base atom', async () => {
    const store = createStore()
    const objAtom = atom({})
    let derivedAtom: Atom<object> | undefined = atom((get) => ({
      obj: get(objAtom),
    }))
    const detector = new LeakDetector(store.get(derivedAtom))
    let unsub: (() => void) | undefined = store.sub(objAtom, () => {})
    unsub()
    unsub = undefined
    derivedAtom = undefined
    expect(await detector.isLeaking()).toBe(false)
  })
})

describe('test memory leaks (dependencies)', () => {
  it('atom only read in write function (without mounting)', async () => {
    // https://github.com/pmndrs/jotai/discussions/2789
    let a: PrimitiveAtom<{ count: number; obj: object }> | undefined = atom({
      count: 0,
      obj: {},
    })
    const b = atom((get) => get(a!).count)
    const w = atom(null, (get, set) => {
      const bValue = get(b)
      set(a!, (prev) => ({ ...prev, count: bValue + 1 }))
    })
    const store = createStore()
    const detector = new LeakDetector(store.get(a).obj)
    store.set(w)
    a = undefined
    expect(await detector.isLeaking()).toBe(false)
  })

  it('atom only read in write function (with mounting)', async () => {
    // https://github.com/pmndrs/jotai/discussions/2789
    let a: PrimitiveAtom<{ count: number; obj: object }> | undefined = atom({
      count: 0,
      obj: {},
    })
    const b = atom((get) => get(a!).count)
    const c = atom((get) => get(a!).count)
    const w = atom(null, (get, set) => {
      const bValue = get(b)
      set(a!, (prev) => ({ ...prev, count: bValue + 1 }))
    })
    const store = createStore()
    const detector = new LeakDetector(store.get(a).obj)
    let unsub: (() => void) | undefined = store.sub(c, () => {}) // mounts c,a
    store.set(w)
    unsub()
    unsub = undefined
    a = undefined
    expect(await detector.isLeaking()).toBe(false)
  })
})
