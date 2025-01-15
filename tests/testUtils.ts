import { createStore } from 'jotai'

type Store = ReturnType<typeof createStore>
type GetAtomState = Parameters<Parameters<Store['unstable_derive']>[0]>[0]
type DebugStore = Store & { getAtomState: GetAtomState }

export function createDebugStore() {
  let getAtomState: GetAtomState
  const store = createStore().unstable_derive((...storeArgs) => {
    ;[getAtomState] = storeArgs
    const [, setAtomState] = storeArgs
    storeArgs[1] = (atom, atomState) => {
      return setAtomState(
        atom,
        Object.assign(atomState, { label: atom.debugLabel }),
      )
    }
    return storeArgs
  })
  if (getAtomState! === undefined) {
    throw new Error('failed to create debug store')
  }
  return Object.assign(store, { getAtomState }) as DebugStore
}
