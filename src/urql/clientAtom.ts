import { atom } from 'jotai'
import { Client, createClient } from '@urql/core'
import type { Getter, Setter } from '../core/types'

export const clientAtom = atom<Client | null>(null)

export const getClient = (get: Getter, set: Setter): Client => {
  let client = get(clientAtom)
  if (client === null) {
    client = createClient({ url: '/graphql' })
    set(clientAtom, client)
  }
  return client
}
