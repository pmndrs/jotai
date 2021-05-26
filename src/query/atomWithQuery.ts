import { QueryKey, QueryObserver, QueryObserverOptions } from 'react-query'
import { atom } from 'jotai'
import type { WritableAtom, Getter } from 'jotai'
import { getQueryClient } from './queryClientAtom'

type ResultActions = { type: 'refetch' }

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
): WritableAtom<TData, ResultActions> {
  const dataAtom = atom<TData | Promise<TData>>(
    new Promise<TData>(() => {}) // infinite pending
  )
  const queryAtom = atom<
    [
      AtomQueryOptions<TQueryFnData, TError, TData, TQueryData>,
      WritableAtom<null, any>
    ],
    ResultActions
  >(
    (get) => {
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery
      const initAtom = atom(
        null,
        (get, set, cleanup: (callback: () => void) => void) => {
          set(
            dataAtom,
            new Promise<TData>(() => {}) // new fetch
          )
          const queryClient = getQueryClient(get, set)
          const observer = new QueryObserver(queryClient, options)
          let hasData = false
          observer.subscribe((result) => {
            // TODO error handling
            if (result.data !== undefined) {
              if (!hasData || !equalityFn(get(dataAtom), result.data)) {
                hasData = true
                set(dataAtom, result.data)
              }
            }
          })
          cleanup(() => observer.destroy())
        }
      )
      initAtom.onMount = (init) => {
        let destroy: (() => void) | undefined | false
        const cleanup = (callback: () => void) => {
          if (destroy === false) {
            callback()
          } else {
            destroy = callback
          }
        }
        init(cleanup)
        return () => {
          if (destroy) {
            destroy()
          }
          destroy = false
        }
      }
      return [options, initAtom]
    },
    (get, set, action) => {
      if (action.type === 'refetch') {
        const [options] = get(queryAtom)
        set(
          dataAtom,
          new Promise<TData>(() => {}) // reset fetch
        )
        const queryClient = getQueryClient(get, set)
        queryClient.getQueryCache().find(options.queryKey)?.reset()
        const p: Promise<void> = queryClient.refetchQueries(options.queryKey)
        return p
      }
      return
    }
  )
  const queryDataAtom = atom<TData, ResultActions>(
    (get) => {
      const [, initAtom] = get(queryAtom)
      get(initAtom) // use it here
      return get(dataAtom)
    },
    (_get, set, action) => set(queryAtom, action) // delegate action
  )
  return queryDataAtom
}
