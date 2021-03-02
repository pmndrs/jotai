import { atom } from 'jotai'
import { QueryClient } from 'react-query'
import type { Getter, Setter } from '../core/types'

const queryClientAtom = atom<QueryClient | null>(null)
export const getQueryClient = (get: Getter, set: Setter): QueryClient => {
  let queryClient = get(queryClientAtom)
  if (queryClient === null) {
    queryClient = new QueryClient()
    set(queryClientAtom, queryClient)
  }
  return queryClient
}
export const createPending = <T>() => {
  const pending: {
    fulfilled: boolean
    promise?: Promise<T>
    resolve?: (data: T) => void
  } = {
    fulfilled: false,
  }
  pending.promise = new Promise<T>((resolve) => {
    pending.resolve = (data: T) => {
      resolve(data)
      pending.fulfilled = true
    }
  })
  return pending as {
    fulfilled: boolean
    promise: Promise<T>
    resolve: (data: T) => void
  }
}
