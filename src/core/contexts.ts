import { createContext } from 'react'
import type { Context } from 'react'

import type { AnyAtom, WritableAtom, Scope } from './types'
import { State, createState, writeAtom, restoreAtoms } from './vanilla'
import { createMutableSource } from './useMutableSource'

type MutableSource<_Target> = ReturnType<typeof createMutableSource>

type UpdateAtom = <Value, Update>(
  atom: WritableAtom<Value, Update>,
  update: Update
) => void | Promise<void>

type StoreForProduction = [
  stateMutableSource: MutableSource<State>,
  updateAtom: UpdateAtom
]

export type StoreForDevelopment = [
  stateMutableSource: MutableSource<State>,
  updateAtom: UpdateAtom,
  atomsMutableSource: MutableSource<{
    atoms: AnyAtom[]
    listeners: Set<() => void>
  }>,
  restoreAtoms: (values: Iterable<readonly [AnyAtom, unknown]>) => void
]

export type Store = StoreForProduction | StoreForDevelopment

const createStoreForProduction = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
): StoreForProduction => {
  const state = createState(initialValues)
  const stateMutableSource = createMutableSource(state, () => state.v)
  const updateAtom = <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => writeAtom(state, atom, update)
  return [stateMutableSource, updateAtom]
}

const createStoreForDevelopment = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
): StoreForDevelopment => {
  const atomsStore = {
    atoms: [] as AnyAtom[],
    listeners: new Set<() => void>(),
  }
  const state = createState(initialValues, (newAtom) => {
    atomsStore.atoms = [...atomsStore.atoms, newAtom]
    // FIXME memory leak
    // we should probably remove unmounted atoms
    atomsStore.listeners.forEach((listener) => listener())
  })
  const stateMutableSource = createMutableSource(state, () => state.v)
  const updateAtom = <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => writeAtom(state, atom, update)
  const atomsMutableSource = createMutableSource(
    atomsStore,
    () => atomsStore.atoms
  )
  const restore = (values: Iterable<readonly [AnyAtom, unknown]>) =>
    restoreAtoms(state, values)
  return [stateMutableSource, updateAtom, atomsMutableSource, restore]
}

type CreateStore = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
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
  return store.length > 2
}
