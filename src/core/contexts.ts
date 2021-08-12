import { createContext } from 'react'
import type { Context } from 'react'
import type { Atom, Scope } from './atom'
import { GET_VERSION, createStore } from './store'
import { createMutableSource } from './useMutableSource'

const createScopeContainerForProduction = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
) => {
  const store = createStore(initialValues)
  const mutableSource = createMutableSource(store, store[GET_VERSION])
  return [store, mutableSource] as const
}

const createScopeContainerForDevelopment = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
) => {
  let devVersion = 0
  const devListeners = new Set<() => void>()
  const devContainer = {
    atoms: Array.from(initialValues ?? []).map(([a]) => a),
  }
  const stateListener = (updatedAtom: Atom<unknown>, isNewAtom: boolean) => {
    ++devVersion
    if (isNewAtom) {
      // FIXME memory leak
      // we should probably remove unmounted atoms eventually
      devContainer.atoms = [...devContainer.atoms, updatedAtom]
    }
    Promise.resolve().then(() => {
      devListeners.forEach((listener) => listener())
    })
  }
  const store = createStore(initialValues, stateListener)
  const mutableSource = createMutableSource(store, store[GET_VERSION])
  const devMutableSource = createMutableSource(devContainer, () => devVersion)
  const devSubscribe = (_: unknown, callback: () => void) => {
    devListeners.add(callback)
    return () => devListeners.delete(callback)
  }
  return [store, mutableSource, devMutableSource, devSubscribe] as const
}

export const isDevScopeContainer = (
  scopeContainer: ScopeContainer
): scopeContainer is ScopeContainerForDevelopment => {
  return scopeContainer.length > 2
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
