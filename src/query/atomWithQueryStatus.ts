import type { QueryKey, QueryObserverResult } from '@tanstack/query-core'
import { QueryObserver } from '@tanstack/query-core'
import type { Atom, PrimitiveAtom } from 'jotai'
import { atom } from 'jotai'
import { defaultGetQueryClient, queryClientAtom } from './queryClientAtom'
import { queryObserverFamily } from './queryObserver'
import { GetQueryClient } from './types'

type TQueryFnData = unknown
type TData = unknown
type TError = unknown
type TQueryData = unknown

type Result = QueryObserverResult<TData, TError>
type Status = Omit<Result, 'data' | 'error' | 'refetch'>

export function atomWithQueryStatus<TQueryKey extends QueryKey = QueryKey>(
  queryKey: TQueryKey,
  getQueryClient: GetQueryClient = defaultGetQueryClient
) {
  /* const observerAtom = atom((get) => {
    const queryClient = getQueryClient(get)
    const defaultedOptions = queryClient.defaultQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >({ queryKey })
    const observer = new QueryObserver<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >(queryClient, defaultedOptions)
    return observer
  }) */

  const queryDataAtom: Atom<Atom<Result>> = atom((get) => {
    const queryClient = getQueryClient(get)
    const observer = get(
      queryObserverFamily([queryDataAtom, queryKey, getQueryClient])
    )
    const initialResult = observer.getCurrentResult()

    console.log('initialResult', initialResult)
    const resultAtom = atom<Result>(initialResult)
    let setResult: (result: Result) => void
    let unsubscribe: (() => void) | null = null
    /* const unsubIfNotMounted = () => {
      if (!setResult) {
        unsubscribe?.()
        unsubscribe = null
      }
    } */
    const listener = (result: Result) => {
      setResult(result)
    }

    // if (options.enabled !== false) {
    // unsubscribe = observer.subscribe(listener)
    // }
    resultAtom.onMount = (update) => {
      setResult = update
      console.log('here 2',  observer.getCurrentResult())
      if (!unsubscribe) {
        unsubscribe = observer.subscribe(listener)
        listener(observer.getCurrentResult())
      }
      return () => {
        // setResult = null
        unsubscribe?.()
      }
    }
    return resultAtom
  })

  const queryAtom = atom<Status>((get) => {
    const resultAtom = get(queryDataAtom)
    const result = get(resultAtom)
    console.log('result', result)
    return { ...result, data: undefined, error: undefined, refetch: undefined }
  })

  return queryAtom
}
