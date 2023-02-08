import React, { createContext, useContext, useRef } from 'react'
import type { ReactNode } from 'react'
import { createStore, getDefaultStore } from 'jotai/vanilla'

type Store = ReturnType<typeof createStore>

const StoreContext = createContext<Store | undefined>(undefined)

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
  children?: ReactNode
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
