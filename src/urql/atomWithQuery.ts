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

type GraphQLExtensions = OperationResult['extensions']

type ResultActions = {
  type: 'execute'
  opts?: Partial<OperationContext>
}

type QueryArgs<Data, Variables extends object> = {
  query: TypedDocumentNode<Data, Variables>
  variables?: Variables
  requestPolicy?: RequestPolicy
  context?: Partial<OperationContext>
  pause?: boolean
}

export function atomWithQuery<Data, Variables extends object>(
  createQueryArgs: (get: Getter) => QueryArgs<Data, Variables>
): WritableAtom<{ data: Data; extensions: GraphQLExtensions }, ResultActions> {
  const operationResultAtom = atom<
    OperationResult<Data, Variables> | Promise<OperationResult<Data, Variables>>
  >(
    new Promise<OperationResult<Data, Variables>>(() => {}) // infinite pending
  )
  const queryAtom = atom<
    [QueryArgs<Data, Variables>, WritableAtom<null, any>],
    ResultActions
  >(
    (get) => {
      const args = createQueryArgs(get)
      const initAtom = atom(
        null,
        (
          get,
          set,
          action:
            | { type: 'init'; initializer: (client: Client) => void }
            | { type: 'result'; result: OperationResult<Data, Variables> }
        ) => {
          if (action.type === 'init') {
            set(
              operationResultAtom,
              new Promise<OperationResult<Data, Variables>>(() => {}) // new fetch
            )
            if (!args.pause) {
              action.initializer(getClient(get, set))
            }
          } else if (action.type === 'result') {
            if (!action.result.stale) {
              set(operationResultAtom, action.result)
            }
          }
        }
      )
      initAtom.onMount = (dispatch) => {
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
            if (!result.stale /* XXX can this happen? */) {
              set(operationResultAtom, result)
            }
          })
      }
    }
  )
  const queryDataAtom = atom<
    { data: Data; extensions: GraphQLExtensions },
    ResultActions
  >(
    (get) => {
      const [, initAtom] = get(queryAtom)
      get(initAtom) // use it here
      const operationResult = get(operationResultAtom)
      if (operationResult.error) {
        throw operationResult.error
      }
      if (operationResult.data === undefined) {
        // XXX can this happen?
        throw new Error('no data in operation result')
      }
      return {
        data: operationResult.data,
        extensions: operationResult.extensions,
      }
    },
    (_get, set, action) => set(queryAtom, action) // delegate action
  )
  return queryDataAtom
}
