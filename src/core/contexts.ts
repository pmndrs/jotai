import { createContext } from 'react'
import type { Context } from 'react'
import type { Atom, Scope, WritableAtom } from './atom'
import { createMutableSource } from './useMutableSource'
import { createState, flushPending, restoreAtoms, writeAtom } from './vanilla'

const createScopeContainerForProduction = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
) => {
  const state = createState(initialValues)
  const stateMutableSource = createMutableSource(state, () => state.v)
  const commitCallback = () => flushPending(state)
  const updateAtom = <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => writeAtom(state, atom, update)
  const restore = (values: Iterable<readonly [Atom<unknown>, unknown]>) =>
    restoreAtoms(state, values)
  return [stateMutableSource, updateAtom, commitCallback, restore] as const
}

const createScopeContainerForDevelopment = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
) => {
  const stateListener = (updatedAtom: Atom<unknown>, isNewAtom: boolean) => {
    ++debugContainer.version
    if (isNewAtom) {
      // FIXME memory leak
      // we should probably remove unmounted atoms eventually
      debugContainer.atoms = [...debugContainer.atoms, updatedAtom]
    }
    Promise.resolve().then(() => {
      debugContainer.listeners.forEach((listener) => listener())
    })
  }
  const state = createState(initialValues, stateListener)
  const stateMutableSource = createMutableSource(state, () => state.v)
  const commitCallback = () => flushPending(state)
  const updateAtom = <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => writeAtom(state, atom, update)
  const debugContainer = {
    version: 0,
    atoms: Array.from(initialValues ?? []).map(([a]) => a),
    state,
    listeners: new Set<() => void>(),
  }
  const debugMutableSource = createMutableSource(
    debugContainer,
    () => debugContainer.version
  )
  const restore = (values: Iterable<readonly [Atom<unknown>, unknown]>) =>
    restoreAtoms(state, values)
  return [
    stateMutableSource,
    updateAtom,
    commitCallback,
    restore,
    debugMutableSource,
  ] as const
}

type ScopeContainerForProduction = ReturnType<
  typeof createScopeContainerForProduction
>
export type ScopeContainerForDevelopment = ReturnType<
  typeof createScopeContainerForDevelopment
>
export type ScopeContainer =
  | ScopeContainerForProduction
  | ScopeContainerForDevelopment

type CreateScopeContainer = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
) => ScopeContainer

export const createScopeContainer: CreateScopeContainer =
  typeof process === 'object' && process.env.NODE_ENV !== 'production'
    ? createScopeContainerForDevelopment
    : createScopeContainerForProduction

type ScopeContext = Context<ScopeContainer>

const ScopeContextMap = new Map<Scope | undefined, ScopeContext>()

export const getScopeContext = (scope?: Scope) => {
  if (!ScopeContextMap.has(scope)) {
    ScopeContextMap.set(scope, createContext(createScopeContainer()))
  }
  return ScopeContextMap.get(scope) as ScopeContext
}

export const isDevScopeContainer = (
  store: ScopeContainer
): store is ScopeContainerForDevelopment => {
  return store.length > 4
}
