import { QueryObserver } from 'react-query'
import type {
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
  type Result = QueryObserverResult<TData, TError>
  const queryDataAtom: WritableAtom<
    {
      options: AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>
      resultAtom: PrimitiveAtom<Result | Promise<Result>>
      observer: QueryObserver<TQueryFnData, TError, TData, TQueryData>
    },
    AtomWithQueryAction,
    Promise<void>
  > = atom(
    (get) => {
      const queryClient = getQueryClient(get)
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery

      const defaultedOptions = queryClient.defaultQueryOptions(options)
      if (
        options.enabled !== false &&
        typeof defaultedOptions.staleTime !== 'number'
      ) {
        // FIXME We don't want to depend on this config
        defaultedOptions.staleTime = 500
      }
      const observer = new QueryObserver(queryClient, defaultedOptions)
      const initialResult = observer.getCurrentResult()

      const resultAtom = atom<Result | Promise<Result>>(
        initialResult.data === undefined && options.enabled !== false
          ? observer.fetchOptimistic(options)
          : initialResult
      )
      resultAtom.onMount = (setResult) => {
        if (options.enabled !== false) {
          const listener = (result: Result) => {
            if (result.isFetching) {
              return
            }
            if (result.isError || result.data !== undefined) {
              setResult(result)
            }
          }
          const unsubscribe = observer.subscribe(listener)
          listener(observer.getCurrentResult())
          return unsubscribe
        }
      }
      return { options, resultAtom, observer }
    },
    (get, set, action) => {
      const { options, resultAtom, observer } = get(queryDataAtom)
      switch (action.type) {
        case 'refetch': {
          set(resultAtom, new Promise<never>(() => {})) // infinite pending
          const p = Promise.resolve()
            .then(() => observer.refetch({ cancelRefetch: true }))
            .then((result) => {
              if (options.enabled !== false && !observer.hasListeners()) {
                set(resultAtom, result)
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
      const { resultAtom } = get(queryDataAtom)
      const result = get(resultAtom)
      if (result.isError) {
        throw result.error
      }
      return result.data
    },
    (_get, set, action) => set(queryDataAtom, action) // delegate action
  )
  return queryAtom
}
