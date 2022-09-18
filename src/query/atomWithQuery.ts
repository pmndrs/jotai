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
): WritableAtom<
  TData | TQueryData | undefined,
  AtomWithQueryAction,
  void | Promise<void>
>

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
): WritableAtom<TData, AtomWithQueryAction, Promise<void>>

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

  const observerCache = new WeakMap<
    QueryClient,
    QueryObserver<TQueryFnData, TError, TData, TQueryData, TQueryKey>
  >()
  const createObserver = (
    queryClient: QueryClient,
    options: QueryObserverOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >
  ) => {
    let observer = observerCache.get(queryClient)
    if (!observer) {
      observer = new QueryObserver<
        TQueryFnData,
        TError,
        TData,
        TQueryData,
        TQueryKey
      >(queryClient, options)
      observerCache.set(queryClient, observer)
    }
    return observer
  }

  const queryDataAtom = atom((get) => {
    const options =
      typeof createQuery === 'function' ? createQuery(get) : createQuery
    const queryClient = getQueryClient(get)
    const observer = createObserver(queryClient, options)
    observer.destroy()
    observer.setOptions(options)
    const initialResult = observer.getCurrentResult()

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
    }
    let unsubscribe: (() => void) | null = null
    let timer: Timeout | undefined
    const startQuery = (refetch?: boolean) => {
      if (refetch) {
        if (options.enabled !== false) {
          if (!setResult && unsubscribe) {
            unsubscribe()
            unsubscribe = null
          }
          observer.refetch({ cancelRefetch: true }).then(listener)
        }
        return
      }
      if (unsubscribe) {
        clearTimeout(timer)
        unsubscribe()
        unsubscribe = null
      }
      if (options.enabled !== false) {
        unsubscribe = observer.subscribe(listener)
        listener(observer.getCurrentResult())
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
    return { options, resultAtom, makePending, startQuery }
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
          startQuery(true)
        }
      }
    }
  )

  return queryAtom
}
