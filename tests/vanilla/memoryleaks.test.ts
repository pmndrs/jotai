import LeakDetector from 'jest-leak-detector'
import { describe, expect, it } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'

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
    // WeapRef is different from WeakMap, we should call isLeaking twice to make garbage-collected success.
    await detector1.isLeaking()
    await detector2.isLeaking()
    expect(await detector1.isLeaking()).toBe(false)
    expect(await detector2.isLeaking()).toBe(false)
  })

  it.skipIf(!import.meta.env?.USE_STORE2)(
    'should not hold onto dependent atoms that are not mounted',
    async () => {
      const store = createStore()
      const objAtom = atom({})
      let depAtom: Atom<unknown> | undefined = atom((get) => get(objAtom))
      const detector = new LeakDetector(depAtom)
      store.get(depAtom)
      depAtom = undefined
      await detector.isLeaking()
      await expect(detector.isLeaking()).resolves.toBe(false)
    },
  )

  it.skipIf(!import.meta.env?.USE_STORE2)(
    'with a long-lived base atom',
    async () => {
      const store = createStore()
      const objAtom = atom({})
      let derivedAtom: Atom<object> | undefined = atom((get) => ({
        obj: get(objAtom),
      }))
      const detector = new LeakDetector(store.get(derivedAtom))
      derivedAtom = undefined
      await detector.isLeaking()
      expect(await detector.isLeaking()).toBe(false)
    },
  )
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
    await detector.isLeaking()
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
    await detector1.isLeaking()
    await detector2.isLeaking()
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
    await detector.isLeaking()
    expect(await detector.isLeaking()).toBe(false)
  })
})
