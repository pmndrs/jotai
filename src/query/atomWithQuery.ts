import { QueryClient, QueryObserver } from '@tanstack/query-core'
import type {
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
} from '@tanstack/query-core'
import { atom } from 'jotai'
import type { WritableAtom } from 'jotai'
import { queryClientAtom } from './queryClientAtom'
import type { CreateQueryOptions, GetQueryClient } from './types'

type Timeout = ReturnType<typeof setTimeout>

type AtomWithQueryAction = {
  type: 'refetch'
}

export interface AtomWithQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey
> extends QueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  > {
  queryKey: TQueryKey
}

export interface AtomWithQueryOptionsWithEnabled<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey
> extends Omit<
    AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
    'enabled'
  > {
  enabled: boolean
}

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithQueryOptionsWithEnabled<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<TData | undefined, AtomWithQueryAction>

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<TData, AtomWithQueryAction>

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
  >,
  getQueryClient: GetQueryClient = (get) => get(queryClientAtom)
): WritableAtom<TData | undefined, AtomWithQueryAction, void | Promise<void>> {
  type Result = QueryObserverResult<TData, TError>

  // HACK: having state in atom creator function is not ideal
  // because, unlike hooks, it's shared by multiple providers.
  const previousDataCache = new WeakMap<QueryClient, TData>()

  const queryDataAtom = atom((get) => {
    const queryClient = getQueryClient(get)
    const options =
      typeof createQuery === 'function' ? createQuery(get) : createQuery
    const observer = new QueryObserver(queryClient, options)
    const initialResult = observer.getCurrentResult()
    if (
      initialResult.data === undefined &&
      options.keepPreviousData &&
      previousDataCache.has(queryClient)
    ) {
      initialResult.data = previousDataCache.get(queryClient)
    }

    let resolve: ((result: Result) => void) | null = null
    const makePending = () =>
      new Promise<Result>((r) => {
        resolve = r
      })
    const resultAtom = atom<Result | Promise<Result>>(
      initialResult.data === undefined && options.enabled !== false
        ? makePending()
        : initialResult
    )
    let setResult: ((result: Result) => void) | null = null
    const listener = (result: Result) => {
      if (result.isFetching || (!result.isError && result.data === undefined)) {
        return
      }
      if (!resolve && !setResult) {
        throw new Error('setting result without mount')
      }
      if (resolve) {
        resolve(result)
        resolve = null
      }
      if (setResult) {
        setResult(result)
      }
      if (result.data !== undefined) {
        previousDataCache.set(queryClient, result.data)
      }
    }
    let unsubscribe: (() => void) | null = null
    let timer: Timeout | undefined
    const startQuery = () => {
      if (!setResult && unsubscribe) {
        clearTimeout(timer)
        unsubscribe()
        unsubscribe = null
      }
      if (options.enabled !== false) {
        if (setResult) {
          observer.refetch({ cancelRefetch: true }).then(setResult)
        } else {
          unsubscribe = observer.subscribe(listener)
        }
      }
      if (!setResult) {
        // not mounted yet
        timer = setTimeout(() => {
          if (unsubscribe) {
            unsubscribe()
            unsubscribe = null
          }
        }, 1000)
      }
    }
    startQuery()
    resultAtom.onMount = (update) => {
      setResult = update
      if (unsubscribe) {
        clearTimeout(timer)
      } else {
        startQuery()
      }
      return () => {
        setResult = null
        if (unsubscribe) {
          unsubscribe()
          // FIXME why does this fail?
          // unsubscribe = null
        }
      }
    }
    return { resultAtom, makePending, startQuery }
  })

  const queryAtom = atom(
    (get) => {
      const { resultAtom } = get(queryDataAtom)
      const result = get(resultAtom)
      if (result.isError) {
        throw result.error
      }
      return result.data
    },
    (get, set, action: AtomWithQueryAction) => {
      const { resultAtom, makePending, startQuery } = get(queryDataAtom)
      switch (action.type) {
        case 'refetch': {
          set(resultAtom, makePending())
          startQuery()
        }
      }
    }
  )

  return queryAtom
}
