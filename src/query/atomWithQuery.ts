import { QueryObserver } from '@tanstack/query-core'
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
  type State = {
    isMounted: boolean
    unsubscribe: (() => void) | null
  }

  const observerAtom = atom((get) => {
    const queryClient = getQueryClient(get)
    const defaultedOptions = queryClient.defaultQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >()
    const observer = new QueryObserver<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >(queryClient, defaultedOptions)
    return observer
  })

  const queryDataAtom: WritableAtom<
    {
      options: Options
      resultAtom: PrimitiveAtom<Result | Promise<Result>>
      state: State
    },
    AtomWithQueryAction,
    void | Promise<void>
  > = atom(
    (get) => {
      const queryClient = getQueryClient(get)
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery
      const defaultedOptions = queryClient.defaultQueryOptions(options)
      const observer = get(observerAtom)
      observer.setOptions(defaultedOptions, {
        listeners: false,
      })
      const initialResult = observer.getOptimisticResult(defaultedOptions)

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
          (!result.isError && result.data === undefined)
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
          listener(observer.getOptimisticResult(defaultedOptions))
        }
        return () => state.unsubscribe?.()
      }
      return { options, resultAtom, state }
    },
    (get, set, action) => {
      const observer = get(observerAtom)
      const { options, resultAtom, state } = get(queryDataAtom)
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
