import { expect, it } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import { atomSyncEffect } from './atomSyncEffect'

it('fires after recomputeDependents and before atom listeners', async function test() {
  const store = createSelfLabelStore()
  const a = atom({} as { v?: number })
  a.debugLabel = 'a'
  let r
  const e = atomSyncEffect(function effect(get) {
    r = get(a).v
    console.log('effect', `{v: ${r}}`)
  })
  e.debugLabel = 'e'
  const b = atom(function bAtomRead(get) {
    const aValue = get(a)
    get(e)
    // sets property `v` inside recomputeDependents
    console.log('b read {v: 1}')
    aValue.v = 1
    return aValue
  })
  b.debugLabel = 'b'
  store.sub(b, function bAtomListener() {
    console.log('b listener {v: 2}')
    // sets property `v` inside atom listener
    store.get(a).v = 2
  })
  console.log('set a {v: 0}')
  store.set(a, { v: 0 })
  expect(r).toBe(1)
})

function createSelfLabelStore() {
  return createStore().unstable_derive(function deriveSelfLabel(...storeArgs) {
    const [, origSetAtomState] = storeArgs
    storeArgs[1] = function setAtomState(atom, atomState) {
      return Object.assign(origSetAtomState(atom, atomState), {
        label: atom.debugLabel,
      })
    }
    return storeArgs
  })
}
