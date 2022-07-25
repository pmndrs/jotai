import { InfiniteQueryObserver, isCancelledError } from '@tanstack/query-core'
import type {
  InfiniteData,
  InfiniteQueryObserverOptions,
  QueryKey,
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from '@tanstack/query-core'
import { atom } from 'jotai'
import type { WritableAtom } from 'jotai'
import { queryClientAtom } from './queryClientAtom'
import { CreateQueryOptions, GetQueryClient } from './types'

type AtomWithInfiniteQueryAction<TQueryFnData> =
  | {
      type: 'refetch'
      payload: Partial<RefetchOptions & RefetchQueryFilters<TQueryFnData>>
    }
  | { type: 'fetchNextPage' }
  | { type: 'fetchPreviousPage' }

export interface AtomWithInfiniteQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey
> extends InfiniteQueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  > {
  queryKey: TQueryKey
}

export interface AtomWithInfiniteQueryOptionsWithEnabled<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey
> extends Omit<
    AtomWithInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >,
    'enabled'
  > {
  enabled: boolean
}

export function atomWithInfiniteQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithInfiniteQueryOptionsWithEnabled<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<
  InfiniteData<TData> | undefined,
  AtomWithInfiniteQueryAction<TQueryFnData>
>

export function atomWithInfiniteQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<InfiniteData<TData>, AtomWithInfiniteQueryAction<TQueryFnData>>

export function atomWithInfiniteQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >
  >,
  getQueryClient: GetQueryClient = (get) => get(queryClientAtom)
): WritableAtom<
  InfiniteData<TData | TQueryData> | undefined,
  AtomWithInfiniteQueryAction<TQueryFnData>
> {
  type Result = QueryObserverResult<InfiniteData<TData>, TError>
  type State = {
    isMounted: boolean
    unsubscribe: (() => void) | null
  }
  const queryDataAtom = atom(
    (get) => {
      const queryClient = getQueryClient(get)
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery

      const defaultedOptions = queryClient.defaultQueryOptions(options)
      const observer = new InfiniteQueryObserver(queryClient, defaultedOptions)
      const initialResult = observer.getCurrentResult()

      let resolve: ((result: Result) => void) | null = null
      const resultAtom = atom<Result | Promise<Result>>(
        initialResult.data === undefined && options.enabled !== false
          ? new Promise<Result>((r) => {
              resolve = r
            })
          : initialResult
      )
      let setResult: (result: Result) => void = () => {
        throw new Error('setting result without mount')
      }
      const state: State = {
        isMounted: false,
        unsubscribe: null,
      }
      const listener = (result: Result) => {
        if (
          result.isFetching ||
          (!result.isError && result.data === undefined) ||
          (result.isError && isCancelledError(result.error))
        ) {
          return
        }
        if (resolve) {
          setTimeout(() => {
            if (!state.isMounted) {
              state.unsubscribe?.()
              state.unsubscribe = null
            }
          }, 1000)
          resolve(result)
          resolve = null
        } else {
          setResult(result)
        }
      }
      if (options.enabled !== false) {
        state.unsubscribe = observer.subscribe(listener)
      }
      resultAtom.onMount = (update) => {
        setResult = update
        state.isMounted = true
        if (options.enabled !== false && !state.unsubscribe) {
          state.unsubscribe = observer.subscribe(listener)
          listener(observer.getCurrentResult())
        }
        return () => state.unsubscribe?.()
      }
      return { options, resultAtom, observer, state }
    },
    (get, set, action: AtomWithInfiniteQueryAction<TQueryFnData>) => {
      const { options, resultAtom, observer, state } = get(queryDataAtom)
      if (options.enabled === false) {
        return
      }
      switch (action.type) {
        case 'refetch': {
          set(resultAtom, new Promise<never>(() => {})) // infinite pending
          if (!state.isMounted) {
            state.unsubscribe?.()
            state.unsubscribe = null
          }
          observer.refetch(action.payload).then((result) => {
            set(resultAtom, result)
          })
          return
        }
        case 'fetchPreviousPage': {
          observer.fetchPreviousPage()
          return
        }
        case 'fetchNextPage': {
          observer.fetchNextPage()
          return
        }
      }
    }
  )

  const queryAtom = atom<
    InfiniteData<TData> | undefined,
    AtomWithInfiniteQueryAction<TQueryFnData>
  >(
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
