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
  FunctionComponent<{ value: Store | undefined }>
> {
  const storeRef = useRef<Store>(undefined)
  if (!store && !storeRef.current) {
    storeRef.current = createStore()
  }
  return createElement(
    StoreContext.Provider,
    {
      value: store || storeRef.current,
    },
    children,
  )
}
