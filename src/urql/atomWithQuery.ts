import { DocumentNode } from 'graphql'
import { pipe, subscribe } from 'wonka'
import {
  Client,
  TypedDocumentNode,
  OperationContext,
  OperationResult,
  RequestPolicy,
} from '@urql/core'
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
            if (!args.pause) {
              action.initializer(getClient(get, set))
            }
          } else if (action.type === 'result') {
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
            client.query(args.query, args.variables, {
              requestPolicy: args.requestPolicy,
              ...args.context,
            }),
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
      return [args, observerAtom]
    },
    (get, set, action) => {
      if (action.type === 'execute') {
        const [args, observerAtom] = get(queryAtom)
        const client = getClient(get, set)
        client
          .query(args.query, args.variables, {
            requestPolicy: args.requestPolicy,
            ...args.context,
            ...action.opts,
          })
          .toPromise()
          .then((result) => {
            set(observerAtom, { type: 'result', result })
          })
      }
    }
  )
  const queryDataAtom = atom<Data, ResultActions>(
    (get) => {
      const [, observerAtom] = get(queryAtom)
      get(observerAtom) // use it here
      return get(dataAtom)
    },
    (_get, set, action) => set(queryAtom, action) // delegate action
  )
  return queryDataAtom
}
