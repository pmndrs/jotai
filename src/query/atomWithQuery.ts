import {
  QueryClient,
  QueryKey,
  QueryObserver,
  QueryObserverOptions,
} from 'react-query'
import { WritableAtom, atom } from 'jotai'
import type { Getter, Setter } from '../core/types'

type ResultActions = { type: 'refetch' }
type AtomQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryData
> = QueryObserverOptions<TQueryFnData, TError, TData, TQueryData> & {
  queryKey: QueryKey
}

const queryClientAtom = atom<QueryClient | null>(null)
const getQueryClient = (get: Getter, set: Setter): QueryClient => {
  let queryClient = get(queryClientAtom)
  if (queryClient === null) {
    queryClient = new QueryClient()
    set(queryClientAtom, queryClient)
  }
  return queryClient
}

const createPending = <T>() => {
  const pending: {
    fulfilled: boolean
    promise?: Promise<T>
    resolve?: (data: T) => void
  } = {
    fulfilled: false,
  }
  pending.promise = new Promise<T>((resolve) => {
    pending.resolve = (data: T) => {
      resolve(data)
      pending.fulfilled = true
    }
  })
  return pending as {
    fulfilled: boolean
    promise: Promise<T>
    resolve: (data: T) => void
  }
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
      ) => AtomQueryOptions<TQueryFnData, TError, TData, TQueryData>)
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
            | { type: 'init'; intializer: (queryClient: QueryClient) => void }
            | { type: 'data'; data: TData }
        ) => {
          if (action.type === 'init') {
            const pending = get(pendingAtom)
            if (pending.fulfilled) {
              set(pendingAtom, createPending<TData>()) // new fetch
            }
            action.intializer(getQueryClient(get, set))
          } else if (action.type === 'data') {
            set(dataAtom, action.data)
            const pending = get(pendingAtom)
            if (!pending.fulfilled) {
              pending.resolve(action.data)
            }
          }
        }
      )
      observerAtom.onMount = (dispatch) => {
        let unsub: (() => void) | undefined | false
        const intializer = (queryClient: QueryClient) => {
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
        dispatch({ type: 'init', intializer })
        return () => {
          if (unsub) {
            unsub()
          }
          unsub = false
        }
      }
      return [options, observerAtom]
    },
    async (get, set, action) => {
      if (action.type === 'refetch') {
        const [options] = get(queryAtom)
        set(pendingAtom, createPending<TData>()) // reset pending
        getQueryClient(get, set).getQueryCache().find(options.queryKey)?.reset()
        await getQueryClient(get, set).refetchQueries(options.queryKey)
      }
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
