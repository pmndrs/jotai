import { Atom, atom } from 'jotai'
import {
  QueryKey,
  QueryFunction,
  QueryClient,
  QueryObserver,
  QueryObserverOptions,
} from 'react-query'

const queryClientAtom = atom<QueryClient | null>(null)

const isQueryKey = (value: any): value is QueryKey => {
  return typeof value === 'string' || Array.isArray(value)
}

const parseQueryArgs = <
  TOptions extends QueryObserverOptions<any, any, any, any>
>(
  arg1: QueryKey | TOptions,
  arg2?: QueryFunction<any> | TOptions,
  arg3?: TOptions
): TOptions => {
  if (!isQueryKey(arg1)) {
    return arg1 as TOptions
  }
  if (typeof arg2 === 'function') {
    return { ...arg3, queryKey: arg1, queryFn: arg2 } as TOptions
  }
  return { ...arg2, queryKey: arg1 } as TOptions
}

export function atomWithQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData>
): Atom<TData>

export function atomWithQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  queryKey: QueryKey,
  options?: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData>
): Atom<TData>

export function atomWithQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  queryKey: QueryKey,
  queryFn: QueryFunction<TQueryFnData>,
  options?: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData>
): Atom<TData>

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  arg1:
    | QueryKey
    | QueryObserverOptions<TQueryFnData, TError, TData, TQueryData>,
  arg2?:
    | QueryFunction<TQueryFnData>
    | QueryObserverOptions<TQueryFnData, TError, TData, TQueryData>,
  arg3?: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData>
) {
  const parsedOptions = parseQueryArgs(arg1, arg2, arg3)
  const pendingAtom = atom(() => {
    let resolve: (data: TData) => void = () => {
      throw new Error('resolve not initialized')
    }
    const promise = new Promise<TData>((r) => {
      resolve = r
    })
    return { promise, resolve }
  })
  const dataAtom = atom<TData | undefined>(undefined)
  const queryAtom = atom((get) => {
    const data = get(dataAtom)
    if (data === undefined) {
      return get(pendingAtom).promise
    }
    return data
  })
  const observerAtom = atom(
    null,
    (
      get,
      set,
      action:
        | { type: 'init'; intializer: (queryClient: QueryClient) => void }
        | { type: 'data'; data: TData }
    ) => {
      if (action.type === 'init') {
        let queryClient = get(queryClientAtom)
        if (queryClient === null) {
          queryClient = new QueryClient()
          set(queryClientAtom, queryClient)
        }
        action.intializer(queryClient)
      } else if (action.type === 'data') {
        set(dataAtom, action.data)
        get(pendingAtom).resolve(action.data)
      }
    }
  )
  observerAtom.onMount = (dispatch) => {
    let unsub: (() => void) | undefined | false
    const intializer = (queryClient: QueryClient) => {
      const observer = new QueryObserver(queryClient, parsedOptions)
      observer.subscribe((result) => {
        // TODO error handling
        if (result.data !== undefined) {
          dispatch({ type: 'data', data: result.data })
        }
      })
      if (unsub === false) {
        observer.destroy()
      } else {
        unsub = () => {
          observer.destroy()
        }
      }
    }
    dispatch({ type: 'init', intializer })
    return () => {
      if (unsub) {
        unsub()
      }
      unsub = false
    }
  }
  return queryAtom
}
