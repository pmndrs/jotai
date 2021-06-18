import { atom } from 'jotai'
import { createClient } from '@urql/core'

export const clientAtom = atom(() => createClient({ url: '/graphql' }))
