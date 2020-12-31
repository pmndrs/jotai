import { atom } from 'jotai'
import {
  QueryKey,
  QueryFunction,
  FetchQueryOptions,
  QueryClient,
  QueryObserver,
} from 'react-query'

const queryClientAtom = atom(() => new QueryClient())

type Action = { type: 'initialize' } | { type: 'cleanup' }

export function atomWithQuery<
  TQueryFnData,
  TError = unknown,
  TData = TQueryFnData
>(
  queryKey: QueryKey,
  queryFn: QueryFunction<TQueryFnData>,
  options?: FetchQueryOptions<TQueryFnData, TError, TData>
) {
  const versionAtom = atom(0)
  const dataAtom = atom((get) => {
    get(versionAtom)
    const queryClient = get(queryClientAtom)
    return queryClient.fetchQuery(queryKey, queryFn, options)
  })
  let observer: QueryObserver | undefined
  const queryAtom = atom(
    (get) => get(dataAtom),
    (get, set, action: Action) => {
      const queryClient = get(queryClientAtom)
      if (action.type === 'initialize') {
        if (observer) {
          throw new Error('already initialized')
        }
        observer = new QueryObserver(queryClient, { queryKey })
        observer.subscribe(() => {
          set(versionAtom, (c) => c + 1)
        })
      }
      if (action.type === 'cleanup') {
        if (!observer) {
          throw new Error('already cleaned up')
        }
        observer.destroy()
        observer = undefined
      }
    }
  )
  return queryAtom
}
