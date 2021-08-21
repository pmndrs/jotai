import { InfiniteQueryObserver, isCancelledError } from 'react-query'
import type {
  InfiniteData,
  InfiniteQueryObserverOptions,
  InitialDataFunction,
  QueryKey,
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from 'react-query'
import { atom } from 'jotai'
import type { WritableAtom } from 'jotai'
import { queryClientAtom } from './queryClientAtom'
import { CreateQueryOptions, GetQueryClient } from './types'

export type AtomWithInfiniteQueryAction<TData> =
  | ({ type: 'refetch' } & Partial<RefetchOptions & RefetchQueryFilters<TData>>)
  | { type: 'fetchNextPage' }
  | { type: 'fetchPreviousPage' }

export type AtomWithInfiniteQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryData
> = InfiniteQueryObserverOptions<TQueryFnData, TError, TData, TQueryData> & {
  queryKey: QueryKey
}

export type AtomWithInfiniteQueryOptionsWithEnabled<
  TQueryFnData,
  TError,
  TData,
  TQueryData
> = Omit<
  AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryData>,
  'enabled'
> & {
  enabled: boolean
}

export function atomWithInfiniteQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  createQuery: CreateQueryOptions<
    AtomWithInfiniteQueryOptionsWithEnabled<
      TQueryFnData,
      TError,
      TData,
      TQueryData
    >
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<
  InfiniteData<TData | TQueryData> | undefined,
  AtomWithInfiniteQueryAction<InfiniteData<TData>>
>

export function atomWithInfiniteQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  createQuery: CreateQueryOptions<
    AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryData>
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<
  InfiniteData<TData | TQueryData>,
  AtomWithInfiniteQueryAction<InfiniteData<TData>>
>

export function atomWithInfiniteQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  createQuery: CreateQueryOptions<
    AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryData>
  >,
  getQueryClient: GetQueryClient = (get) => get(queryClientAtom)
): WritableAtom<
  InfiniteData<TData | TQueryData> | undefined,
  AtomWithInfiniteQueryAction<InfiniteData<TData>>
> {
  const queryDataAtom = atom(
    (get) => {
      const queryClient = getQueryClient(get)
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery
      let settlePromise:
        | ((data: InfiniteData<TData> | undefined, err?: TError) => void)
        | null = null

      const getInitialData = () => {
        let data: InfiniteData<TQueryData | TData> | undefined =
          queryClient.getQueryData<InfiniteData<TData>>(options.queryKey)

        if (data === undefined && options.initialData) {
          data =
            typeof options.initialData === 'function'
              ? (
                  options.initialData as InitialDataFunction<
                    InfiniteData<TQueryData>
                  >
                )()
              : options.initialData
        }

        return data
      }

      const initialData = getInitialData()

      const dataAtom = atom<
        | InfiniteData<TData | TQueryData>
        | Promise<InfiniteData<TData | TQueryData>>
        | undefined
      >(
        initialData ||
          new Promise<InfiniteData<TData>>((resolve, reject) => {
            settlePromise = (data, err) => {
              if (err) {
                reject(err)
              } else {
                resolve(data as InfiniteData<TData>)
              }
            }
          })
      )
      let setData: (
        data: InfiniteData<TData> | Promise<InfiniteData<TData>> | undefined
      ) => void = () => {
        throw new Error('atomWithInfiniteQuery: setting data without mount')
      }
      const listener = (
        result:
          | QueryObserverResult<InfiniteData<TData>, TError>
          | { data?: undefined; error: TError }
      ) => {
        if (result.error && !isCancelledError(result.error)) {
          if (settlePromise) {
            settlePromise(undefined, result.error)
            settlePromise = null
          } else {
            setData(Promise.reject<InfiniteData<TData>>(result.error))
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

      const observer = new InfiniteQueryObserver(queryClient, defaultedOptions)

      if (initialData === undefined && options.enabled !== false) {
        observer
          .fetchOptimistic(defaultedOptions)
          .then(listener)
          .catch((error) => listener({ error }))
      }

      dataAtom.onMount = (update) => {
        setData = update
        const unsubscribe = observer?.subscribe(listener)
        if (options.enabled === false) {
          if (settlePromise) {
            settlePromise(undefined)
          } else {
            setData(undefined)
          }
        }
        return unsubscribe
      }
      return { dataAtom, observer, options }
    },
    (get, _set, action: AtomWithInfiniteQueryAction<InfiniteData<TData>>) => {
      const { observer } = get(queryDataAtom)
      switch (action.type) {
        case 'refetch': {
          const { type: _type, ...options } = action
          void observer.refetch(options)
          break
        }
        case 'fetchPreviousPage': {
          void observer.fetchPreviousPage()
          break
        }
        case 'fetchNextPage': {
          void observer.fetchNextPage()
          break
        }
      }
    }
  )

  const queryAtom = atom<
    InfiniteData<TData | TQueryData> | undefined,
    AtomWithInfiniteQueryAction<InfiniteData<TData>>
  >(
    (get) => {
      const { dataAtom } = get(queryDataAtom)
      return get(dataAtom)
    },
    (_get, set, action) => {
      set(queryDataAtom, action) // delegate action
    }
  )
  return queryAtom
}
