import { atom } from 'jotai'
import { createClient } from '@urql/core'

const DEFAULT_URL =
  (typeof process === 'object' && process.env.JOTAI_URQL_DEFAULT_URL) ||
  '/graphql'

export const clientAtom = atom(createClient({ url: DEFAULT_URL }))
