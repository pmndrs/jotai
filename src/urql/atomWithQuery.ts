import { pipe, subscribe } from 'wonka'
import {
  TypedDocumentNode,
  OperationContext,
  OperationResult,
  RequestPolicy,
} from '@urql/core'
import { atom } from 'jotai'
import type { Atom, Getter } from 'jotai'
import { getClient } from './clientAtom'

type QueryArgs<Data, Variables extends object> = {
  query: TypedDocumentNode<Data, Variables>
  variables?: Variables
  requestPolicy?: RequestPolicy
  context?: Partial<OperationContext>
}

export function atomWithQuery<Data, Variables extends object>(
  createQueryArgs: (get: Getter) => QueryArgs<Data, Variables>
): Atom<OperationResult<Data, Variables>> {
  const operationResultAtom = atom<
    OperationResult<Data, Variables> | Promise<OperationResult<Data, Variables>>
  >(
    new Promise<OperationResult<Data, Variables>>(() => {}) // infinite pending
  )
  const queryAtom = atom((get) => {
    const args = createQueryArgs(get)
    const initAtom = atom(
      null,
      (get, set, cleanup: (callback: () => void) => void) => {
        set(
          operationResultAtom,
          new Promise<OperationResult<Data, Variables>>(() => {}) // new fetch
        )
        const client = getClient(get, set)
        const subscription = pipe(
          client.query(args.query, args.variables, {
            requestPolicy: args.requestPolicy,
            ...args.context,
          }),
          subscribe((result) => {
            set(operationResultAtom, result)
          })
        )
        cleanup(subscription.unsubscribe)
      }
    )
    initAtom.onMount = (init) => {
      let destroy: (() => void) | undefined | false
      const cleanup = (callback: () => void) => {
        if (destroy === false) {
          callback()
        } else {
          destroy = callback
        }
      }
      init(cleanup)
      return () => {
        if (destroy) {
          destroy()
        }
        destroy = false
      }
    }
    return initAtom
  })
  const queryResultAtom = atom((get) => {
    const initAtom = get(queryAtom)
    get(initAtom) // use it here
    return get(operationResultAtom)
  })
  return queryResultAtom
}
