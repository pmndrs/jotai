import { QueryClient } from '@tanstack/query-core'
import { atom } from 'jotai'

export const queryClientAtom = atom(new QueryClient())
