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
      // TODO: If this is not a false positive, consider using useState instead of useRef like https://github.com/pmndrs/jotai/pull/2771
      // eslint-disable-next-line react-hooks/refs
      value: storeRef.current,
    },
    children,
  )
}
