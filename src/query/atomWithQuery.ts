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

      let settlePromise:
        | ((data: TData | undefined, err?: TError) => void)
        | null = null

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

      const errorAtom = atom<TError | undefined>(undefined)
      const dataAtom = atom<Data | Promise<Data> | undefined>(
        initialData === undefined && options.enabled !== false
          ? new Promise<TData>((resolve, reject) => {
              settlePromise = (data, err) => {
                if (err !== undefined) {
                  reject(err)
                } else {
                  resolve(data as TData)
                }
              }
            })
          : initialData
      )
      let setError: (error: TError | undefined) => void = () => {
        throw new Error('atomWithQuery: setting error without mount')
      }
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
            setError(result.error)
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
          setError(undefined)
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
      errorAtom.onMount = (update) => {
        setError = update
      }
      dataAtom.onMount = (update) => {
        setData = update
        if (options.enabled !== false) {
          return observer.subscribe(listener)
        }
      }
      return { errorAtom, dataAtom, observer }
    },
    (get, set, action: AtomWithQueryAction) => {
      switch (action.type) {
        case 'refetch': {
          const { errorAtom, dataAtom, observer } = get(queryDataAtom)
          set(errorAtom, undefined)
          set(dataAtom, new Promise<TData>(() => {})) // infinite pending
          const p = Promise.resolve()
            .then(() =>
              observer.refetch({ throwOnError: true, cancelRefetch: true })
            )
            .then(() => {})
          return p
        }
        default:
          throw new Error('no action')
      }
    }
  )
  const queryAtom = atom<Data | undefined, AtomWithQueryAction, Promise<void>>(
    (get) => {
      const { errorAtom, dataAtom } = get(queryDataAtom)
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
