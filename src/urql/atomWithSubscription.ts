import { pipe, subscribe } from 'wonka'
import {
  TypedDocumentNode,
  OperationContext,
  OperationResult,
} from '@urql/core'
import { atom } from 'jotai'
import type { Getter } from 'jotai'
import { clientAtom } from './clientAtom'

type SubscriptionArgs<Data, Variables extends object> = {
  query: TypedDocumentNode<Data, Variables>
  variables?: Variables
  context?: Partial<OperationContext>
}

export function atomWithSubscription<Data, Variables extends object>(
  createSubscriptionArgs: (get: Getter) => SubscriptionArgs<Data, Variables>
) {
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
    const subscriptionInRender = pipe(
      client.subscription(args.query, args.variables, args.context),
      subscribe(listener)
    )
    let timer: NodeJS.Timeout | null = setTimeout(() => {
      timer = null
      subscriptionInRender.unsubscribe()
    }, 1000)
    resultAtom.onMount = (update) => {
      setResult = update
      let subscription: typeof subscriptionInRender
      if (timer) {
        clearTimeout(timer)
        subscription = subscriptionInRender
      } else {
        subscription = pipe(
          client.subscription(args.query, args.variables, args.context),
          subscribe(listener)
        )
      }
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
