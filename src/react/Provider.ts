import { createContext, createElement, useContext, useRef } from 'react'
import type { FunctionComponent, ReactElement, ReactNode } from 'react'
import { createStore, getDefaultStore } from '../vanilla.ts'

type Store = ReturnType<typeof createStore>

type StoreContextType = ReturnType<typeof createContext<Store | undefined>>
const StoreContext: StoreContextType = createContext<Store | undefined>(
  undefined,
)

type Options = {
  store?: Store
}

export function useStore(options?: Options): Store {
  const store = useContext(StoreContext)
  return options?.store || store || getDefaultStore()
}

export function Provider({
  children,
  store,
}: {
  children?: ReactNode
  store?: Store
}): ReactElement<
  { value: Store | undefined },
  FunctionComponent<{ value: Store }>
> {
  const storeRef = useRef<Store>(null)
  if (store) {
    return createElement(StoreContext.Provider, { value: store }, children)
  }
  if (storeRef.current === null) {
    storeRef.current = createStore()
  }
  return createElement(
    StoreContext.Provider,
    {
      // NOTE: Using useRef instead of useState to avoid calling createStore()
      // when the store prop is provided. useState's initializer always runs on
      // the first render, but useRef with early return allows us to skip it.
      // eslint-disable-next-line react-hooks/refs
      value: storeRef.current,
    },
    children,
  )
}
