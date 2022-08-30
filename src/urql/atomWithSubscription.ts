import type {
  AnyVariables,
  Client,
  OperationContext,
  OperationResult,
  TypedDocumentNode,
} from '@urql/core'
import { pipe, subscribe } from 'wonka'
import type { Subscription } from 'wonka'
import { atom } from 'jotai'
import type { Atom, Getter } from 'jotai'
import { clientAtom } from './clientAtom'

type OperationResultWithData<Data, Variables> = OperationResult<
  Data,
  Variables
> & {
  data: Data
}

const isOperationResultWithData = <Data, Variables>(
  result: OperationResult<Data, Variables>
): result is OperationResultWithData<Data, Variables> => 'data' in result

type SubscriptionArgs<Data, Variables extends AnyVariables> = {
  query: TypedDocumentNode<Data, Variables> | string
  variables: Variables
  context?: Partial<OperationContext>
}

type SubscriptionArgsWithPause<
  Data,
  Variables extends AnyVariables
> = SubscriptionArgs<Data, Variables> & {
  pause: boolean
}

export function atomWithSubscription<Data, Variables extends AnyVariables>(
  createSubscriptionArgs: (get: Getter) => SubscriptionArgs<Data, Variables>,
  getClient?: (get: Getter) => Client
): Atom<OperationResultWithData<Data, Variables>>

export function atomWithSubscription<Data, Variables extends AnyVariables>(
  createSubscriptionArgs: (
    get: Getter
  ) => SubscriptionArgsWithPause<Data, Variables>,
  getClient?: (get: Getter) => Client
): Atom<OperationResultWithData<Data, Variables> | null>

export function atomWithSubscription<Data, Variables extends AnyVariables>(
  createSubscriptionArgs: (get: Getter) => SubscriptionArgs<Data, Variables>,
  getClient: (get: Getter) => Client = (get) => get(clientAtom)
) {
  const queryResultAtom = atom((get) => {
    const args = createSubscriptionArgs(get)
    if ((args as { pause?: boolean }).pause) {
      return { args }
    }
    const client = getClient(get)
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
    let isMounted = false
    const listener = (result: OperationResult<Data, Variables>) => {
      // TODO error handling
      if (!isOperationResultWithData(result)) {
        throw new Error('result does not have data')
      }
      if (resolve) {
        if (!isMounted) {
          subscription?.unsubscribe()
          subscription = null
        }
        resolve(result)
        resolve = null
      } else {
        setResult(result)
      }
    }
    let subscription: Subscription | null = pipe(
      client.subscription(args.query, args.variables, args.context),
      subscribe(listener)
    )
    resultAtom.onMount = (update) => {
      setResult = update
      isMounted = true
      if (!subscription) {
        subscription = pipe(
          client.subscription(args.query, args.variables, args.context),
          subscribe(listener)
        )
      }
      return () => subscription?.unsubscribe()
    }
    return { resultAtom, args }
  })
  const queryAtom = atom((get) => {
    const { resultAtom } = get(queryResultAtom)
    return resultAtom ? get(resultAtom) : null
  })
  return queryAtom
}
