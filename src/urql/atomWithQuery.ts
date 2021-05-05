import { DocumentNode } from 'graphql'
import { pipe, subscribe } from 'wonka'
import {
  Client,
  TypedDocumentNode,
  OperationContext,
  OperationResult,
  Operation,
} from '@urql/core'
import { WritableAtom, atom } from 'jotai'
import type { Getter } from '../core/types'
import { getClient } from './clientAtom'

type ResultActions = { type: 'reexecute' }

type AtomQueryArgs<Data, Variables extends object> = {
  query: string | DocumentNode | TypedDocumentNode<Data, Variables>
  variables?: Variables
  context?: Partial<OperationContext>
}

export function atomWithQuery<Data, Variables extends object>(
  createQuery:
    | AtomQueryArgs<Data, Variables>
    | ((get: Getter) => AtomQueryArgs<Data, Variables>)
): WritableAtom<Data, ResultActions> {
  const dataAtom = atom<Data | Promise<Data>>(
    new Promise<Data>(() => {}) // infinite pending
  )
  const operationAtom = atom<Operation | null>(null)
  const queryAtom = atom<WritableAtom<null, any>, ResultActions>(
    (get) => {
      const args =
        typeof createQuery === 'function' ? createQuery(get) : createQuery
      const observerAtom = atom(
        null,
        (
          get,
          set,
          action:
            | { type: 'init'; initializer: (client: Client) => void }
            | { type: 'result'; result: OperationResult }
        ) => {
          if (action.type === 'init') {
            set(
              dataAtom,
              new Promise<Data>(() => {}) // new fetch
            )
            action.initializer(getClient(get, set))
          } else if (action.type === 'result') {
            set(operationAtom, action.result.operation)
            const data = get(dataAtom)
            if (data === null && action.result.data !== undefined) {
              set(dataAtom, action.result.data)
            }
          }
        }
      )
      observerAtom.onMount = (dispatch) => {
        let unsub: (() => void) | undefined | false
        const initializer = (client: Client) => {
          const subscription = pipe(
            client.query(args.query, args.variables, args.context),
            subscribe((result) => {
              dispatch({ type: 'result', result })
            })
          )
          if (unsub === false) {
            subscription.unsubscribe()
          } else {
            unsub = () => {
              subscription.unsubscribe()
            }
          }
        }
        dispatch({ type: 'init', initializer })
        return () => {
          if (unsub) {
            unsub()
          }
          unsub = false
        }
      }
      return observerAtom
    },
    (get, set, action) => {
      if (action.type === 'reexecute') {
        const operation = get(operationAtom)
        if (operation === null) {
          throw new Error('no operation')
        }
        set(
          dataAtom,
          new Promise<Data>(() => {}) // reset fetch
        )
        const client = getClient(get, set)
        client.reexecuteOperation(operation)
      }
      return
    }
  )
  const queryDataAtom = atom<Data, ResultActions>(
    (get) => {
      const observerAtom = get(queryAtom)
      get(observerAtom) // use it here
      return get(dataAtom)
    },
    (_get, set, action) => set(queryAtom, action) // delegate action
  )
  return queryDataAtom
}
