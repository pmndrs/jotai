import { QueryClient, QueryObserver } from '@tanstack/query-core'
import type {
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
} from '@tanstack/query-core'
import { atom } from 'jotai'
import type { PrimitiveAtom, WritableAtom } from 'jotai'
import { queryClientAtom } from './queryClientAtom'
import type { CreateQueryOptions, GetQueryClient } from './types'

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
  type Options = AtomWithQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >
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

  const queryDataAtom: WritableAtom<
    {
      options: Options
      resultAtom: PrimitiveAtom<Result | Promise<Result>>
      unsubIfNotMounted: () => void
    },
    AtomWithQueryAction,
    void | Promise<void>
  > = atom(
    (get) => {
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery
      const queryClient = getQueryClient(get)
      const observer = createObserver(queryClient, options)
      observer.destroy()
      observer.setOptions(options)
      const initialResult = observer.getCurrentResult()

      let resolve: ((result: Result) => void) | null = null
      const resultAtom = atom<Result | Promise<Result>>(
        initialResult.data === undefined && options.enabled !== false
          ? new Promise<Result>((r) => {
              resolve = r
            })
          : initialResult
      )
      let setResult: ((result: Result) => void) | null = null
      let unsubscribe: (() => void) | null = null
      const unsubIfNotMounted = () => {
        if (!setResult) {
          unsubscribe?.()
          unsubscribe = null
        }
      }
      const listener = (result: Result) => {
        if (
          result.isFetching ||
          (!result.isError && result.data === undefined)
        ) {
          return
        }
        if (resolve) {
          setTimeout(unsubIfNotMounted, 1000)
          resolve(result)
          resolve = null
        } else if (setResult) {
          setResult(result)
        } else {
          throw new Error('setting result without mount')
        }
      }
      if (options.enabled !== false) {
        unsubscribe = observer.subscribe(listener)
      }
      resultAtom.onMount = (update) => {
        setResult = update
        if (options.enabled !== false && !unsubscribe) {
          unsubscribe = observer.subscribe(listener)
          listener(observer.getCurrentResult())
        }
        return () => {
          setResult = null
          unsubscribe?.()
        }
      }
      return { options, resultAtom, unsubIfNotMounted }
    },
    (get, set, action) => {
      const { options, resultAtom, unsubIfNotMounted } = get(queryDataAtom)
      if (options.enabled === false) {
        return
      }
      const queryClient = getQueryClient(get)
      const observer = createObserver(queryClient, options)
      switch (action.type) {
        case 'refetch': {
          set(resultAtom, new Promise<never>(() => {})) // infinite pending
          unsubIfNotMounted()
          return observer.refetch({ cancelRefetch: true }).then((result) => {
            set(resultAtom, result)
          })
        }
      }
    }
  )

  const queryAtom = atom<
    TData | undefined,
    AtomWithQueryAction,
    void | Promise<void>
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
