import { DocumentNode } from 'graphql'
import { TypedDocumentNode, OperationContext, RequestPolicy } from '@urql/core'
import { WritableAtom, atom } from 'jotai'
import type { Getter } from '../core/types'
import { getClient } from './clientAtom'

type ResultActions = {
  type: 'execute'
  opts?: Partial<OperationContext>
}

type QueryArgs<Data, Variables extends object> = {
  query: string | DocumentNode | TypedDocumentNode<Data, Variables>
  variables?: Variables
  requestPolicy?: RequestPolicy
  context?: Partial<OperationContext>
  pause?: boolean
}

export function atomWithQuery<Data, Variables extends object>(
  createQueryArgs: (get: Getter) => QueryArgs<Data, Variables>
): WritableAtom<Data, ResultActions> {
  const dataAtom = atom<Data | Promise<Data>>(
    new Promise<Data>(() => {}) // infinite pending
  )
  const queryAtom = atom<
    [QueryArgs<Data, Variables>, WritableAtom<null, any>],
    ResultActions
  >(
    (get) => {
      const args = createQueryArgs(get)
      const initAtom = atom(null, (get, set) => {
        set(
          dataAtom,
          new Promise<Data>(() => {}) // new fetch
        )
        if (!args.pause) {
          const client = getClient(get, set)
          client
            .query(args.query, args.variables, {
              requestPolicy: args.requestPolicy,
              ...args.context,
            })
            .toPromise()
            .then((result) => {
              if (result.data !== undefined) {
                set(dataAtom, result.data)
              }
            })
        }
      })
      initAtom.onMount = (init) => {
        init()
      }
      return [args, initAtom]
    },
    (get, set, action) => {
      if (action.type === 'execute') {
        const [args] = get(queryAtom)
        const client = getClient(get, set)
        client
          .query(args.query, args.variables, {
            requestPolicy: args.requestPolicy,
            ...args.context,
            ...action.opts,
          })
          .toPromise()
          .then((result) => {
            if (result.data !== undefined) {
              set(dataAtom, result.data)
            }
          })
      }
    }
  )
  const queryDataAtom = atom<Data, ResultActions>(
    (get) => {
      const [, initAtom] = get(queryAtom)
      get(initAtom) // use it here
      return get(dataAtom)
    },
    (_get, set, action) => set(queryAtom, action) // delegate action
  )
  return queryDataAtom
}
