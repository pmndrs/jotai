import { createClient } from '@urql/core'
import { atom } from 'jotai'

const DEFAULT_URL =
  (() => {
    try {
      return process.env.JOTAI_URQL_DEFAULT_URL
    } catch {
      return undefined
    }
  })() || '/graphql'

export const clientAtom = atom(createClient({ url: DEFAULT_URL }))
