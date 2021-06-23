import { atom } from 'jotai'
import { Client, createClient } from '@urql/core'

const DEFAULT_URL =
  (typeof process === 'object' && process.env.JOTAI_URQL_DEFAULT_URL) ||
  '/graphql'

export const clientAtom = atom<Client | null>(null)

export const getClientAtom = atom(
  (get) => get(clientAtom) || createClient({ url: DEFAULT_URL })
)
