import { QueryObserver } from 'react-query'
import type {
  InitialDataFunction,
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
} from 'react-query'
import { atom } from 'jotai'
import type { PrimitiveAtom, WritableAtom } from 'jotai'
import { queryClientAtom } from './queryClientAtom'
import type { CreateQueryOptions, GetQueryClient } from './types'

export interface AtomWithQueryAction {
  type: 'refetch'
}

export interface AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>
  extends QueryObserverOptions<TQueryFnData, TError, TData, TQueryData> {
  queryKey: QueryKey
}

export interface AtomWithQueryOptionsWithEnabled<
  TQueryFnData,
  TError,
  TData,
  TQueryData
> extends Omit<
    AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>,
    'enabled'
  > {
  enabled: boolean
}

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  createQuery: CreateQueryOptions<
    AtomWithQueryOptionsWithEnabled<TQueryFnData, TError, TData, TQueryData>
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<
  TData | TQueryData | undefined,
  AtomWithQueryAction,
  Promise<void>
>

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  createQuery: CreateQueryOptions<
    AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<TData | TQueryData, AtomWithQueryAction, Promise<void>>

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  createQuery: CreateQueryOptions<
    AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>
  >,
  getQueryClient: GetQueryClient = (get) => get(queryClientAtom)
): WritableAtom<
  TData | TQueryData | undefined,
  AtomWithQueryAction,
  Promise<void>
> {
  type Data = TData | TQueryData
  const queryDataAtom: WritableAtom<
    {
      options: AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>
      initAtom: WritableAtom<null, (cleanup: () => void) => void, void>
      errorAtom: PrimitiveAtom<TError | undefined>
      dataAtom: PrimitiveAtom<Data | Promise<Data> | undefined>
      observer: QueryObserver<TQueryFnData, TError, TData, TQueryData>
    },
    AtomWithQueryAction,
    Promise<void>
  > = atom(
    (get) => {
      const queryClient = getQueryClient(get)
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery

      const getInitialData = () => {
        let data: Data | undefined = queryClient.getQueryData<TData>(
          options.queryKey
        )
        if (data === undefined && options.initialData) {
          data =
            typeof options.initialData === 'function'
              ? (options.initialData as InitialDataFunction<TQueryData>)()
              : options.initialData
        }
        return data
      }

      const initialData = getInitialData()
      const defaultedOptions = queryClient.defaultQueryOptions(options)
      if (initialData === undefined && options.enabled !== false) {
        if (typeof defaultedOptions.staleTime !== 'number') {
          defaultedOptions.staleTime = 1000
        }
      }
      const observer = new QueryObserver(queryClient, defaultedOptions)

      const errorAtom = atom<TError | undefined>(undefined)
      const dataAtom = atom<Data | Promise<Data> | undefined>(
        initialData === undefined && options.enabled !== false
          ? observer.fetchOptimistic(options).then((result) => {
              if (result.data !== undefined) {
                return result.data
              }
              throw result.error
            })
          : initialData
      )
      const initAtom = atom(
        null,
        (_get, set, cb: (cleanup: () => void) => void) => {
          const listener = (result: QueryObserverResult<TData, TError>) => {
            if (result.isFetching) {
              return
            }
            if (result.isError) {
              set(errorAtom, result.error)
              set(dataAtom, undefined)
            } else if (result.data !== undefined) {
              set(errorAtom, undefined)
              set(dataAtom, result.data)
            }
          }
          if (options.enabled !== false) {
            const unsubscribe = observer.subscribe(listener)
            listener(observer.getCurrentResult())
            cb(unsubscribe)
          }
        }
      )
      initAtom.onMount = (init) => {
        let unsub: (() => void) | undefined | false
        init((cleanup) => {
          if (unsub === false) {
            cleanup()
          } else {
            unsub = cleanup
          }
        })
        return () => {
          if (unsub) {
            unsub()
          }
          unsub = false
        }
      }
      return { options, initAtom, errorAtom, dataAtom, observer }
    },
    (get, set, action) => {
      const { options, errorAtom, dataAtom, observer } = get(queryDataAtom)
      const listener = (result: QueryObserverResult<TData, TError>) => {
        if (result.isFetching) {
          return
        }
        if (result.isError) {
          set(errorAtom, result.error)
          set(dataAtom, undefined)
        } else if (result.data !== undefined) {
          set(errorAtom, undefined)
          set(dataAtom, result.data)
        }
      }
      switch (action.type) {
        case 'refetch': {
          set(errorAtom, undefined)
          set(dataAtom, new Promise<never>(() => {})) // infinite pending
          const p = Promise.resolve()
            .then(() => observer.refetch({ cancelRefetch: true }))
            .then((result) => {
              if (options.enabled !== false && !observer.hasListeners()) {
                listener(result)
              }
            })
          return p
        }
        default:
          throw new Error('no action')
      }
    }
  )
  const queryAtom = atom<Data | undefined, AtomWithQueryAction, Promise<void>>(
    (get) => {
      const { initAtom, errorAtom, dataAtom } = get(queryDataAtom)
      get(initAtom) // to run onMount
      const error = get(errorAtom)
      const data = get(dataAtom)
      if (error !== undefined) {
        throw error
      }
      return data
    },
    (_get, set, action) => set(queryDataAtom, action) // delegate action
  )
  return queryAtom
}
