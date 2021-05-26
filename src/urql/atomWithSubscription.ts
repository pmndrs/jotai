import { pipe, subscribe } from 'wonka'
import {
  TypedDocumentNode,
  OperationContext,
  OperationResult,
} from '@urql/core'
import { atom } from 'jotai'
import type { Atom, Getter } from 'jotai'
import { getClient } from './clientAtom'

type SubscriptionArgs<Data, Variables extends object> = {
  query: TypedDocumentNode<Data, Variables>
  variables?: Variables
  context?: Partial<OperationContext>
}

export function atomWithSubscription<Data, Variables extends object>(
  createSubscriptionArgs: (get: Getter) => SubscriptionArgs<Data, Variables>
): Atom<OperationResult<Data, Variables>> {
  const operationResultAtom = atom<
    OperationResult<Data, Variables> | Promise<OperationResult<Data, Variables>>
  >(
    new Promise<OperationResult<Data, Variables>>(() => {}) // infinite pending
  )
  const queryAtom = atom((get) => {
    const args = createSubscriptionArgs(get)
    const initAtom = atom(
      null,
      (get, set, cleanup: (callback: () => void) => void) => {
        set(
          operationResultAtom,
          new Promise<OperationResult<Data, Variables>>(() => {}) // new fetch
        )
        const client = getClient(get, set)
        const subscription = pipe(
          client.subscription(args.query, args.variables, args.context),
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
