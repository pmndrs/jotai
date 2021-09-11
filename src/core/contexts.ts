import { createContext } from 'react'
import type { Context } from 'react'
import type { Atom, Scope } from './atom'
import { createStore } from './store'

const createScopeContainerForProduction = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
) => {
  const store = createStore(initialValues)
  return [store] as const
}

const createScopeContainerForDevelopment = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
) => {
  const devStore = {
    listeners: new Set<() => void>(),
    subscribe: (callback: () => void) => {
      devStore.listeners.add(callback)
      return () => {
        devStore.listeners.delete(callback)
      }
    },
    atoms: Array.from(initialValues ?? []).map(([a]) => a),
  }
  const stateListener = (updatedAtom: Atom<unknown>, isNewAtom: boolean) => {
    if (isNewAtom) {
      // FIXME memory leak
      // we should probably remove unmounted atoms eventually
      devStore.atoms = [...devStore.atoms, updatedAtom]
    }
    Promise.resolve().then(() => {
      devStore.listeners.forEach((listener) => listener())
    })
  }
  const store = createStore(initialValues, stateListener)
  return [store, devStore] as const
}

export const isDevScopeContainer = (
  scopeContainer: ScopeContainer
): scopeContainer is ScopeContainerForDevelopment => {
  return scopeContainer.length > 1
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
