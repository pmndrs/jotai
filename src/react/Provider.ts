import ReactExports, {
  type Context,
  type FunctionComponentElement,
  type ReactNode,
  createContext,
  createElement,
  useContext,
  useRef,
} from 'react'
import { createStore, getDefaultStore } from '../vanilla.ts'

type Store = ReturnType<typeof createStore>

type StoreContextType = ReturnType<typeof createContext<Store | undefined>>
const StoreContext: StoreContextType = createContext<Store | undefined>(
  undefined,
)

type Options = {
  store?: Store
}

// In React 19, `use` will allow calling within conditionals and loops.
//  Refs: https://19.react.dev/reference/react/use#reading-context-with-use
const hook: <T>(context: Context<T>) => T =
  'use' in ReactExports ? ReactExports.use : useContext

export const useStore = (options?: Options): Store => {
  const store = hook(StoreContext)
  return options?.store || store || getDefaultStore()
}

export const Provider = ({
  children,
  store,
}: {
  children?: ReactNode
  store?: Store
}): FunctionComponentElement<{ value: Store | undefined }> => {
  const storeRef = useRef<Store>()
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
