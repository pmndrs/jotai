import {
  QueryClient,
  QueryKey,
  QueryObserver,
  QueryObserverOptions,
} from 'react-query'
import { WritableAtom, atom } from 'jotai'
import type { Getter } from '../core/types'
import { getQueryClient } from './queryClientAtom'

type ResultActions = { type: 'refetch' }

type AtomQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryData
> = QueryObserverOptions<TQueryFnData, TError, TData, TQueryData> & {
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
      const observerAtom = atom(
        null,
        (
          get,
          set,
          action:
            | { type: 'init'; initializer: (queryClient: QueryClient) => void }
            | { type: 'data'; data: TData }
        ) => {
          if (action.type === 'init') {
            set(
              dataAtom,
              new Promise<TData>(() => {}) // new fetch
            )
            action.initializer(getQueryClient(get, set))
          } else if (action.type === 'data') {
            const data = get(dataAtom)
            if (data === null || !equalityFn(data as TData, action.data)) {
              set(dataAtom, action.data)
            }
          }
        }
      )
      observerAtom.onMount = (dispatch) => {
        let unsub: (() => void) | undefined | false
        const initializer = (queryClient: QueryClient) => {
          const observer = new QueryObserver(queryClient, options)
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
        dispatch({ type: 'init', initializer })
        return () => {
          if (unsub) {
            unsub()
          }
          unsub = false
        }
      }
      return [options, observerAtom]
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
      const [, observerAtom] = get(queryAtom)
      get(observerAtom) // use it here
      return get(dataAtom)
    },
    (_get, set, action) => set(queryAtom, action) // delegate action
  )
  return queryDataAtom
}
