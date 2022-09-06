import type { QueryKey, QueryObserverResult } from '@tanstack/query-core'
import type { Atom } from 'jotai'
import { atom } from 'jotai'
import { defaultGetQueryClient } from './queryClientAtom'
import { queryObserverFamily } from './queryObserver'
import { GetQueryClient } from './types'

type TData = unknown
type TError = unknown

type Result = QueryObserverResult<TData, TError>
type Status = Omit<Result, 'data' | 'error' | 'refetch'>

export function atomWithQueryStatus<TQueryKey extends QueryKey = QueryKey>(
  queryKey: TQueryKey,
  getQueryClient: GetQueryClient = defaultGetQueryClient
) {

  const queryDataAtom: Atom<Atom<Result>> = atom((get) => {
    const observer = get(
      queryObserverFamily([queryDataAtom, queryKey, getQueryClient])
    )
    const initialResult = observer.getCurrentResult()

    const resultAtom = atom<Result>(initialResult)
    let setResult: (result: Result) => void
    let unsubscribe: (() => void) | null = null
    const listener = (result: Result) => {
      setResult(result)
    }

    resultAtom.onMount = (update) => {
      setResult = update
      if (!unsubscribe || !observer.listeners.includes(listener)) {
        unsubscribe = observer.subscribe(listener)
        listener(observer.getCurrentResult())
      }
      return () => {
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
