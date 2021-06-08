import { atom } from 'jotai'
import { QueryClient } from 'react-query'

export const queryClientAtom = atom(() => new QueryClient())
