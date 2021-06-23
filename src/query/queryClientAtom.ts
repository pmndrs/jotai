import { atom } from 'jotai'
import { QueryClient } from 'react-query'

export const queryClientAtom = atom<QueryClient | null>(null)

export const getQueryClientAtom = atom(
  (get) => get(queryClientAtom) || new QueryClient()
)
