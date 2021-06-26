import {
  QueryKey,
  QueryObserver,
  QueryObserverOptions,
  QueryObserverResult,
  InitialDataFunction,
} from 'react-query'
import { atom } from 'jotai'
import type { WritableAtom, Getter } from 'jotai'
import { getQueryClientAtom } from './queryClientAtom'

type Action = { type: 'refetch' }

type AtomQueryOptions<TQueryFnData, TError, TData, TQueryData> =
  QueryObserverOptions<TQueryFnData, TError, TData, TQueryData> & {
    queryKey: QueryKey
  }

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  createQuery:
    | AtomQueryOptions<TQueryFnData, TError, TData, TQueryData>
    | ((
        get: Getter
      ) => AtomQueryOptions<TQueryFnData, TError, TData, TQueryData>),
  equalityFn: (a: TData, b: TData) => boolean = Object.is
): WritableAtom<TData | TQueryData, Action> {
  const queryDataAtom = atom(
    (get) => {
      const queryClient = get(getQueryClientAtom)
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery
      let resolve: ((data: TData) => void) | null = null
      const getInitialData = () =>
        typeof options.initialData === 'function'
          ? (options.initialData as InitialDataFunction<TQueryData>)()
          : options.initialData
      const dataAtom = atom<TData | TQueryData | Promise<TData | TQueryData>>(
        getInitialData() ||
          new Promise<TData>((r) => {
            resolve = r
          })
      )
      let setData: (data: TData) => void = () => {
        throw new Error('atomWithQuery: setting data without mount')
      }
      let prevData: TData | null = null
      const listener = (result: QueryObserverResult<TData, TError>) => {
        // TODO error handling
        if (
          result.data === undefined ||
          (prevData !== null && equalityFn(prevData, result.data))
        ) {
          return
        }
        prevData = result.data
        if (resolve) {
          resolve(result.data)
          resolve = null
        } else {
          setData(result.data)
        }
      }
      const defaultedOptions = queryClient.defaultQueryObserverOptions(options)
      if (typeof defaultedOptions.staleTime !== 'number') {
        defaultedOptions.staleTime = 1000
      }
      const observer = new QueryObserver(queryClient, defaultedOptions)
      observer
        .fetchOptimistic(defaultedOptions)
        .then(listener)
        .catch(() => {
          // TODO error handling
        })
      dataAtom.onMount = (update) => {
        setData = update
        const unsubscribe = observer.subscribe(listener)
        return unsubscribe
      }
      return { dataAtom, options }
    },
    (get, set, action: Action) => {
      switch (action.type) {
        case 'refetch': {
          const { dataAtom, options } = get(queryDataAtom)
          set(dataAtom, new Promise<TData>(() => {})) // infinite pending
          const queryClient = get(getQueryClientAtom)
          queryClient.getQueryCache().find(options.queryKey)?.reset()
          const p: Promise<void> = queryClient.refetchQueries(options.queryKey)
          return p
        }
      }
    }
  )
  const queryAtom = atom<TData | TQueryData, Action>(
    (get) => {
      const { dataAtom } = get(queryDataAtom)
      return get(dataAtom)
    },
    (_get, set, action) => set(queryDataAtom, action) // delegate action
  )
  return queryAtom
}
