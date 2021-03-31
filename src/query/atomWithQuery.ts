import {
  QueryClient,
  QueryKey,
  QueryObserver,
  QueryObserverOptions,
} from 'react-query'
import { WritableAtom, atom } from 'jotai'
import type { Getter } from '../core/types'
import { getQueryClient } from './queryClientAtom'
import { createPending } from './shared'

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
  const pendingAtom = atom(createPending<TData>())
  const dataAtom = atom<TData | null>(null)
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
            const pending = get(pendingAtom)
            if (pending.fulfilled) {
              set(pendingAtom, createPending<TData>()) // new fetch
            }
            action.initializer(getQueryClient(get, set))
          } else if (action.type === 'data') {
            const data = get(dataAtom)
            if (data === null || !equalityFn(data, action.data)) {
              set(dataAtom, action.data)
              const pending = get(pendingAtom)
              if (!pending.fulfilled) {
                pending.resolve(action.data)
              }
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
        set(pendingAtom, createPending<TData>()) // reset pending
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
      const data = get(dataAtom)
      const pending = get(pendingAtom)
      if (!pending.fulfilled) {
        return pending.promise
      }
      // we are sure that data is not null
      return data as TData
    },
    (_get, set, action) => set(queryAtom, action) // delegate action
  )
  return queryDataAtom
}
