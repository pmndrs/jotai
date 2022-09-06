import { QueryClient } from '@tanstack/query-core'
import type { Getter } from 'jotai'
import { atom } from 'jotai'

export const queryClientAtom = atom(new QueryClient())

export const defaultGetQueryClient = (get: Getter) => get(queryClientAtom)
