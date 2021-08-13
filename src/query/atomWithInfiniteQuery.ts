import { InfiniteQueryObserver, isCancelledError } from 'react-query'
import type {
  InfiniteData,
  InfiniteQueryObserverOptions,
  InitialDataFunction,
  QueryClient,
  QueryKey,
  QueryObserverResult,
} from 'react-query'
import { atom } from 'jotai'
import type { Getter, WritableAtom } from 'jotai'
import { queryClientAtom } from './queryClientAtom'

export type AtomWithInfiniteQueryAction = {
  type: 'refetch' | 'fetchNextPage' | 'fetchPreviousPage'
}

export type AtomWithInfiniteQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryData
> = InfiniteQueryObserverOptions<TQueryFnData, TError, TData, TQueryData> & {
  queryKey: QueryKey
}

export function atomWithInfiniteQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  createQuery:
    | AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryData>
    | ((
        get: Getter
      ) => AtomWithInfiniteQueryOptions<
        TQueryFnData,
        TError,
        TData,
        TQueryData
      >),
  getQueryClient: (get: Getter) => QueryClient = (get) => get(queryClientAtom)
): WritableAtom<InfiniteData<TData | TQueryData>, AtomWithInfiniteQueryAction> {
  const queryDataAtom = atom(
    (get) => {
      const queryClient = getQueryClient(get)
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery
      let settlePromise:
        | ((data: InfiniteData<TData> | null, err?: TError) => void)
        | null = null

      const getInitialData = () => {
        let data: InfiniteData<TQueryData> | InfiniteData<TData> | undefined =
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
        data: InfiniteData<TData> | Promise<InfiniteData<TData>>
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
            settlePromise(null, result.error)
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

      if (initialData === undefined) {
        observer
          .fetchOptimistic(defaultedOptions)
          .then(listener)
          .catch((error) => listener({ error }))
      }

      dataAtom.onMount = (update) => {
        setData = update
        const unsubscribe = observer?.subscribe(listener)
        return unsubscribe
      }
      return { dataAtom, observer, options }
    },
    (get, _set, action: AtomWithInfiniteQueryAction) => {
      const { observer } = get(queryDataAtom)
      switch (action.type) {
        case 'refetch': {
          void observer.refetch()
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
    InfiniteData<TData | TQueryData>,
    AtomWithInfiniteQueryAction
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
