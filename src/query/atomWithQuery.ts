import {
  QueryKey,
  QueryObserver,
  QueryObserverOptions,
  QueryObserverResult,
  InitialDataFunction,
} from 'react-query'
import { atom } from 'jotai'
import type { WritableAtom, PrimitiveAtom, Getter } from 'jotai'
import { getQueryClientAtom } from './queryClientAtom'

export type AtomWithQueryAction = { type: 'refetch' }

export type AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData> =
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
    | AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>
    | ((
        get: Getter
      ) => AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>)
): WritableAtom<TData | TQueryData, AtomWithQueryAction> {
  const queryDataAtom: WritableAtom<
    {
      dataAtom: PrimitiveAtom<TData | TQueryData | Promise<TData | TQueryData>>
      observer: QueryObserver<TQueryFnData, TError, TData, TQueryData>
    },
    AtomWithQueryAction
  > = atom(
    (get) => {
      const queryClient = get(getQueryClientAtom)
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery
      let settlePromise: ((data: TData | null, err?: TError) => void) | null =
        null
      const getInitialData = () =>
        typeof options.initialData === 'function'
          ? (options.initialData as InitialDataFunction<TQueryData>)()
          : options.initialData

      const initialData = getInitialData()

      const dataAtom = atom<TData | TQueryData | Promise<TData | TQueryData>>(
        initialData ||
          new Promise<TData>((resolve, reject) => {
            settlePromise = (data, err) => {
              if (err) {
                reject(err)
              } else {
                resolve(data as TData)
              }
            }
          })
      )
      let setData: (data: TData | Promise<TData>) => void = () => {
        throw new Error('atomWithQuery: setting data without mount')
      }
      const listener = (
        result:
          | QueryObserverResult<TData, TError>
          | { data?: undefined; error: TError }
      ) => {
        if (result.error) {
          if (settlePromise) {
            settlePromise(null, result.error)
            settlePromise = null
          } else {
            setData(Promise.reject<TData>(result.error))
          }
          return
        }
        if (result.data === undefined) {
          return
        }
        if (settlePromise) {
          settlePromise(result.data)
          settlePromise = null
        } else {
          setData(result.data)
        }
      }
      const defaultedOptions = queryClient.defaultQueryObserverOptions(options)
      if (typeof defaultedOptions.staleTime !== 'number') {
        defaultedOptions.staleTime = 1000
      }
      const observer = new QueryObserver(queryClient, defaultedOptions)
      if (!initialData) {
        observer
          .fetchOptimistic(defaultedOptions)
          .then(listener)
          .catch((error) => listener({ error }))
      }
      dataAtom.onMount = (update) => {
        setData = update
        const unsubscribe = observer.subscribe(listener)
        return unsubscribe
      }
      return { dataAtom, observer }
    },
    (get, set, action: AtomWithQueryAction) => {
      switch (action.type) {
        case 'refetch': {
          const { dataAtom, observer } = get(queryDataAtom)
          set(dataAtom, new Promise<TData>(() => {})) // infinite pending
          const p = observer.refetch({ cancelRefetch: true }).then(() => {})
          return p
        }
      }
    }
  )
  const queryAtom = atom<TData | TQueryData, AtomWithQueryAction>(
    (get) => {
      const { dataAtom } = get(queryDataAtom)
      return get(dataAtom)
    },
    (_get, set, action) => set(queryDataAtom, action) // delegate action
  )
  return queryAtom
}
