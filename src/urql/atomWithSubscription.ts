import { pipe, subscribe } from 'wonka'
import {
  TypedDocumentNode,
  OperationContext,
  OperationResult,
} from '@urql/core'
import { atom } from 'jotai'
import type { Atom, Getter } from 'jotai'
import { clientAtom } from './clientAtom'

type SubscriptionArgs<Data, Variables extends object> = {
  query: TypedDocumentNode<Data, Variables>
  variables?: Variables
  context?: Partial<OperationContext>
}

export function atomWithSubscription<Data, Variables extends object>(
  createSubscriptionArgs: (get: Getter) => SubscriptionArgs<Data, Variables>
): Atom<OperationResult<Data, Variables>> {
  const queryResultAtom = atom((get) => {
    const client = get(clientAtom)
    const args = createSubscriptionArgs(get)
    let resolve: ((result: OperationResult<Data, Variables>) => void) | null =
      null
    const resultAtom = atom<
      | OperationResult<Data, Variables>
      | Promise<OperationResult<Data, Variables>>
    >(
      new Promise<OperationResult<Data, Variables>>((r) => {
        resolve = r
      })
    )
    let setResult: (result: OperationResult<Data, Variables>) => void = () => {
      throw new Error('setting result without mount')
    }
    const listener = (result: OperationResult<Data, Variables>) => {
      if (resolve) {
        resolve(result)
        resolve = null
      } else {
        setResult(result)
      }
    }
    client
      .query(args.query, args.variables, args.context) // FIXME we shouldn't use query here?
      .toPromise()
      .then(listener)
      .catch(() => {
        // TODO error handling
      })
    resultAtom.onMount = (update) => {
      setResult = update
      const subscription = pipe(
        client.subscription(args.query, args.variables, args.context),
        subscribe(listener)
      )
      return () => subscription.unsubscribe()
    }
    return { resultAtom, args }
  })
  const queryAtom = atom((get) => {
    const { resultAtom } = get(queryResultAtom)
    return get(resultAtom)
  })
  return queryAtom
}
