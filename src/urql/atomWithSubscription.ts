import type {
  AnyVariables,
  Client,
  OperationContext,
  OperationResult,
  TypedDocumentNode,
} from '@urql/core'
import { atomsWithUrqlSubscription } from 'jotai-urql'
import { atom } from 'jotai'
import type { Getter, WritableAtom } from 'jotai'
import { clientAtom } from './clientAtom'

type AtomWithSubscriptionAction = {
  type: 'refetch'
}

type OperationResultWithData<Data, Variables extends AnyVariables> = Omit<
  OperationResult<Data, Variables>,
  'data'
> & { data: Data }

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
): WritableAtom<
  OperationResultWithData<Data, Variables>,
  AtomWithSubscriptionAction
>

export function atomWithSubscription<Data, Variables extends AnyVariables>(
  createSubscriptionArgs: (
    get: Getter
  ) => SubscriptionArgsWithPause<Data, Variables>,
  getClient?: (get: Getter) => Client
): WritableAtom<
  OperationResultWithData<Data, Variables> | null,
  AtomWithSubscriptionAction
>

export function atomWithSubscription<Data, Variables extends AnyVariables>(
  createSubscriptionArgs: (get: Getter) => SubscriptionArgs<Data, Variables>,
  getClient: (get: Getter) => Client = (get) => get(clientAtom)
) {
  const getArgs = (get: Getter) => {
    const subscriptionArgs = createSubscriptionArgs(get)
    return [
      subscriptionArgs.query,
      subscriptionArgs.variables,
      subscriptionArgs.context || {},
    ] as const
  }
  const [dataAtom, statusAtom] = atomsWithUrqlSubscription(getArgs, getClient)
  return atom(
    (get) => {
      const subscriptionArgs = createSubscriptionArgs(get)
      if ((subscriptionArgs as { pause?: boolean }).pause) {
        return null
      }
      try {
        get(statusAtom) // HACK to mark it as used
      } catch {
        // ignore
      }
      get(dataAtom)
      return get(statusAtom)
    },
    (_get, set, action: AtomWithSubscriptionAction) => {
      switch (action.type) {
        case 'refetch': {
          return set(dataAtom, action)
        }
      }
    }
  )
}
