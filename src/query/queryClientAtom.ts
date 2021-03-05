import { atom } from 'jotai'
import { QueryClient } from 'react-query'
import type { Getter, Setter } from '../core/types'

export const queryClientAtom = atom<QueryClient | null>(null)

export const getQueryClient = (get: Getter, set: Setter): QueryClient => {
  let queryClient = get(queryClientAtom)
  if (queryClient === null) {
    queryClient = new QueryClient()
    set(queryClientAtom, queryClient)
  }
  return queryClient
}
