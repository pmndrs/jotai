import { describe, expect, it } from 'vitest'
import { atom, createStore } from 'jotai'
import { withAtomEffect } from 'jotai/vanilla/utils'

// https://github.com/pmndrs/jotai/discussions/3292
describe('discussion #3292', () => {
  it('withAtomEffect: sibling atoms stay aligned after a skipped read', () => {
    const store = createStore()
    const countAtom = atom(0)

    const tickerAtom = withAtomEffect(atom(0), (get, set) => {
      set(tickerAtom, get(countAtom))
    })

    const derivedAtom = atom((get) => get(tickerAtom) * 1000)
    const t1Atom = atom((get) => get(derivedAtom))
    const t2Atom = atom((get) => get(derivedAtom))

    let t1: number | undefined
    let t2: number | undefined
    const t0Atom = atom((get) => {
      const count = get(countAtom)
      if (count === 1) {
        return
      }
      t1 = get(t1Atom)
      t2 = get(t2Atom)
    })

    const unsub = store.sub(t0Atom, () => {})

    expect(t1).toBe(0)
    expect(t2).toBe(0)

    store.set(countAtom, 1)
    expect(t1).toBe(0)
    expect(t2).toBe(0)

    store.set(countAtom, 2)
    expect(t1).toBe(t2)

    store.set(countAtom, 3)
    expect(t1).toBe(t2)

    store.set(countAtom, 4)
    expect(t1).toBe(t2)
    expect(t1).toBe(4000)

    unsub()
  })
})
