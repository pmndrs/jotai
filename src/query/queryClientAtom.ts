import { QueryClient } from 'react-query'
import { atom } from 'jotai'

export const queryClientAtom = atom(new QueryClient())
