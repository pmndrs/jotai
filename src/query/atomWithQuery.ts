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

type AtomWithQueryAction = {
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
  const queryDataAtom: WritableAtom<
    {
      dataAtom: PrimitiveAtom<
        TData | TQueryData | Promise<TData | TQueryData> | undefined
      >
      observer: QueryObserver<TQueryFnData, TError, TData, TQueryData>
    },
    AtomWithQueryAction,
    Promise<void>
  > = atom(
    (get) => {
      const queryClient = getQueryClient(get)
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery

      let settlePromise:
        | ((data: TData | undefined, err?: TError) => void)
        | null = null

      const getInitialData = () => {
        let data: TQueryData | TData | undefined =
          queryClient.getQueryData<TData>(options.queryKey)

        if (data === undefined && options.initialData) {
          data =
            typeof options.initialData === 'function'
              ? (options.initialData as InitialDataFunction<TQueryData>)()
              : options.initialData
        }
        return data
      }

      const initialData = getInitialData()

      const dataAtom = atom<
        TData | TQueryData | Promise<TData | TQueryData> | undefined
      >(
        initialData === undefined && options.enabled !== false
          ? new Promise<TData>((resolve, reject) => {
              settlePromise = (data, err) => {
                if (err) {
                  reject(err)
                } else {
                  resolve(data as TData)
                }
              }
            })
          : initialData
      )
      let setData: (data: TData | Promise<TData> | undefined) => void = () => {
        throw new Error('atomWithQuery: setting data without mount')
      }
      const listener = (
        result:
          | QueryObserverResult<TData, TError>
          | { data?: undefined; error: TError }
      ) => {
        if (result.error) {
          if (settlePromise) {
            settlePromise(undefined, result.error)
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
      if (initialData === undefined && options.enabled !== false) {
        if (typeof defaultedOptions.staleTime !== 'number') {
          defaultedOptions.staleTime = 1000
        }
      }
      const observer = new QueryObserver(queryClient, defaultedOptions)
      if (initialData === undefined && options.enabled !== false) {
        observer
          .fetchOptimistic(defaultedOptions)
          .then(listener)
          .catch((error) => listener({ error }))
      }
      dataAtom.onMount = (update) => {
        setData = update
        if (options.enabled !== false) {
          return observer.subscribe(listener)
        }
      }
      return { dataAtom, observer }
    },
    (get, set, action: AtomWithQueryAction) => {
      switch (action.type) {
        case 'refetch': {
          const { dataAtom, observer } = get(queryDataAtom)
          set(dataAtom, new Promise<TData>(() => {})) // infinite pending
          const p = Promise.resolve()
            .then(() => observer.refetch({ cancelRefetch: true }))
            .then(() => {})
          return p
        }
        default:
          throw new Error('no action')
      }
    }
  )
  const queryAtom = atom<
    TData | TQueryData | undefined,
    AtomWithQueryAction,
    Promise<void>
  >(
    (get) => {
      const { dataAtom } = get(queryDataAtom)
      return get(dataAtom)
    },
    (_get, set, action) => set(queryDataAtom, action) // delegate action
  )
  return queryAtom
}
