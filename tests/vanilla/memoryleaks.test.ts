import LeakDetector from 'jest-leak-detector'
import { describe, expect, it } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'

describe('test memory leaks (get & set only)', () => {
  it('one atom', async () => {
    const store = createStore()
    let detector: LeakDetector
    ;(() => {
      const objAtom = atom({})
      detector = new LeakDetector(store.get(objAtom))
    })()
    expect(await detector.isLeaking()).toBe(false)
  })

  it('two atoms', async () => {
    const store = createStore()
    let detector1: LeakDetector
    let detector2: LeakDetector
    ;(() => {
      const objAtom = atom({})
      detector1 = new LeakDetector(store.get(objAtom))
      const derivedAtom = atom((get) => ({ obj: get(objAtom) }))
      detector2 = new LeakDetector(store.get(derivedAtom))
    })()
    expect(await detector1.isLeaking()).toBe(false)
    expect(await detector2.isLeaking()).toBe(false)
  })
})

describe('test memory leaks (with subscribe)', () => {
  it('one atom', async () => {
    const store = createStore()
    let detector: LeakDetector
    ;(() => {
      const objAtom = atom({})
      detector = new LeakDetector(store.get(objAtom))
      const unsub = store.sub(objAtom, () => {})
      unsub()
    })()
    expect(await detector.isLeaking()).toBe(false)
  })

  it('two atoms', async () => {
    const store = createStore()
    let detector1: LeakDetector
    let detector2: LeakDetector
    ;(() => {
      const objAtom = atom({})
      detector1 = new LeakDetector(store.get(objAtom))
      const derivedAtom = atom((get) => ({ obj: get(objAtom) }))
      detector2 = new LeakDetector(store.get(derivedAtom))
      const unsub = store.sub(derivedAtom, () => {})
      unsub()
    })()
    expect(await detector1.isLeaking()).toBe(false)
    expect(await detector2.isLeaking()).toBe(false)
  })
})
