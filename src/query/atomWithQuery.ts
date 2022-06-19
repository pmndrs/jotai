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

      let resolvePromise: (data: TData) => void = () => {}
      let rejectPromise: (err: TError) => void = () => {}

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
              resolvePromise = resolve
              rejectPromise = reject
            })
          : initialData
      )
      let setError: ((error: TError | undefined) => void) | null = null
      let setData: ((data: TData | Promise<TData> | undefined) => void) | null =
        null
      const results: QueryObserverResult<TData, TError>[] = []
      const flushResults = () => {
        if (setError && setData) {
          results.forEach((result) => {
            if (result.isError) {
              ;(setError as NonNullable<typeof setError>)(result.error)
            } else if (result.data !== undefined) {
              ;(setData as NonNullable<typeof setData>)(result.data)
            }
          })
          results.splice(0)
        }
      }
      const listener = (result: QueryObserverResult<TData, TError>) => {
        if (result.isFetching) {
          return
        }
        if (result.isError) {
          rejectPromise(result.error)
        } else if (result.data !== undefined) {
          resolvePromise(result.data)
        }
        results.push(result)
        flushResults()
      }
      const defaultedOptions = queryClient.defaultQueryObserverOptions(options)
      const observer = new QueryObserver(queryClient, defaultedOptions)
      let unsubscribe: (() => void) | null = null
      const timer = setTimeout(() => {
        unsubscribe?.()
        unsubscribe = null
      }, 1000)
      if (initialData === undefined && options.enabled !== false) {
        unsubscribe = observer.subscribe(listener)
      }
      errorAtom.onMount = (update) => {
        setError = update
        flushResults()
      }
      dataAtom.onMount = (update) => {
        clearTimeout(timer)
        if (options.enabled !== false && !unsubscribe) {
          unsubscribe = observer.subscribe(listener)
          const result = observer.getCurrentResult()
          if (result) {
            results.push(result)
          }
        }
        setData = update
        flushResults()
        return () => unsubscribe?.()
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
