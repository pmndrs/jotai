import { createContext, useContext, useRef } from 'react'
import type { ReactNode } from 'react'
import { createStore } from '../vanilla/store'
import type { Store } from '../vanilla/store'

const StoreContext = createContext<Store | undefined>(undefined)

let defaultStore: Store | undefined

const getDefaultStore = () => {
  if (!defaultStore) {
    defaultStore = createStore()
  }
  return defaultStore
}

type Options = {
  store?: Store
}

export const useStore = (options?: Options) => {
  const store = useContext(StoreContext)
  return options?.store || store || getDefaultStore()
}

export const Provider = ({
  children,
  store,
}: {
  children: ReactNode
  store?: Store
}) => {
  const storeRef = useRef<Store>()
  if (!store && !storeRef.current) {
    storeRef.current = createStore()
  }
  return (
    <StoreContext.Provider value={store || storeRef.current}>
      {children}
    </StoreContext.Provider>
  )
}
