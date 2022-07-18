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
  interface State {
    isMounted: boolean
    unsubscribe: (() => void) | null
  }
  const queryDataAtom: WritableAtom<
    {
      options: AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>
      resultAtom: PrimitiveAtom<Result | Promise<Result>>
      observer: QueryObserver<TQueryFnData, TError, TData, TQueryData>
      state: State
    },
    AtomWithQueryAction,
    Promise<void>
  > = atom(
    (get) => {
      const queryClient = getQueryClient(get)
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery

      const defaultedOptions = queryClient.defaultQueryOptions(options)
      const observer = new QueryObserver(queryClient, defaultedOptions)
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
      state.unsubscribe = observer.subscribe(listener)
      resultAtom.onMount = (update) => {
        setResult = update
        state.isMounted = true
        if (!state.unsubscribe) {
          state.unsubscribe = observer.subscribe(listener)
          listener(observer.getCurrentResult())
        }
        return () => state.unsubscribe?.()
      }
      return { options, resultAtom, observer, state }
    },
    (get, set, action) => {
      const { options, resultAtom, observer, state } = get(queryDataAtom)
      switch (action.type) {
        case 'refetch': {
          set(resultAtom, new Promise<never>(() => {})) // infinite pending
          if (!state.isMounted) {
            state.unsubscribe?.()
            state.unsubscribe = null
          }
          const p = observer.refetch({ cancelRefetch: true }).then((result) => {
            if (options.enabled !== false) {
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
