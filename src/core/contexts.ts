import { createContext } from 'react'
import type { Context } from 'react'
import type { Atom, Scope, WritableAtom } from './atom'
import { createMutableSource } from './useMutableSource'
import { createState, flushPending, restoreAtoms, writeAtom } from './vanilla'
import type { State } from './vanilla'

type MutableSource<_Target> = ReturnType<typeof createMutableSource>

type UpdateAtom = <Value, Update>(
  atom: WritableAtom<Value, Update>,
  update: Update
) => void

type CommitCallback = () => void

type StoreForProduction = [
  MutableSource<State>, // stateMutableSource
  UpdateAtom, // updateAtom
  CommitCallback, // commitCallback
  (values: Iterable<readonly [Atom<unknown>, unknown]>) => void // restore
]

export type StoreForDevelopment = [
  ...StoreForProduction,
  MutableSource<{
    version: number
    atoms: Atom<unknown>[]
    state: State
    listeners: Set<() => void>
  }> // debugMutableSource
]

export type Store = StoreForProduction | StoreForDevelopment

const createStoreForProduction = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
): StoreForProduction => {
  const state = createState(initialValues)
  const stateMutableSource = createMutableSource(state, () => state.v)
  const commitCallback = () => flushPending(state)
  const updateAtom = <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => writeAtom(state, atom, update)
  const restore = (values: Iterable<readonly [Atom<unknown>, unknown]>) =>
    restoreAtoms(state, values)
  return [stateMutableSource, updateAtom, commitCallback, restore]
}

const createStoreForDevelopment = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
): StoreForDevelopment => {
  const stateListener = (updatedAtom: Atom<unknown>, isNewAtom: boolean) => {
    ++debugStore.version
    if (isNewAtom) {
      // FIXME memory leak
      // we should probably remove unmounted atoms eventually
      debugStore.atoms = [...debugStore.atoms, updatedAtom]
    }
    Promise.resolve().then(() => {
      debugStore.listeners.forEach((listener) => listener())
    })
  }
  const state = createState(initialValues, stateListener)
  const stateMutableSource = createMutableSource(state, () => state.v)
  const commitCallback = () => flushPending(state)
  const updateAtom = <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => writeAtom(state, atom, update)
  const debugStore = {
    version: 0,
    atoms: Array.from(initialValues ?? []).map(([a]) => a),
    state,
    listeners: new Set<() => void>(),
  }
  const debugMutableSource = createMutableSource(
    debugStore,
    () => debugStore.version
  )
  const restore = (values: Iterable<readonly [Atom<unknown>, unknown]>) =>
    restoreAtoms(state, values)
  return [
    stateMutableSource,
    updateAtom,
    commitCallback,
    restore,
    debugMutableSource,
  ]
}

type CreateStore = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
) => Store

export const createStore: CreateStore =
  typeof process === 'object' && process.env.NODE_ENV !== 'production'
    ? createStoreForDevelopment
    : createStoreForProduction

type StoreContext = Context<Store>

const StoreContextMap = new Map<Scope | undefined, StoreContext>()

export const getStoreContext = (scope?: Scope) => {
  if (!StoreContextMap.has(scope)) {
    StoreContextMap.set(scope, createContext(createStore()))
  }
  return StoreContextMap.get(scope) as StoreContext
}

export const isDevStore = (store: Store): store is StoreForDevelopment => {
  return store.length > 3
}
