import type {
  AnyVariables,
  Client,
  OperationContext,
  OperationResult,
  TypedDocumentNode,
} from '@urql/core'
import { atomsWithSubscription } from 'jotai-urql'
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

/**
 * @deprecated use `jotai-urql` instead
 */
export function atomWithSubscription<Data, Variables extends AnyVariables>(
  createSubscriptionArgs: (get: Getter) => SubscriptionArgs<Data, Variables>,
  getClient?: (get: Getter) => Client
): WritableAtom<
  OperationResultWithData<Data, Variables>,
  AtomWithSubscriptionAction
>

/**
 * @deprecated use `jotai-urql` instead
 */
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
  console.warn('[DEPRECATED] use `jotai-urql` instead.')
  const getArgs = (get: Getter) => {
    const subscriptionArgs = createSubscriptionArgs(get)
    return [
      subscriptionArgs.query,
      subscriptionArgs.variables,
      subscriptionArgs.context || {},
    ] as const
  }
  const [dataAtom, statusAtom] = atomsWithSubscription(getArgs, getClient)
  return atom(
    (get) => {
      const subscriptionArgs = createSubscriptionArgs(get)
      if ((subscriptionArgs as { pause?: boolean }).pause) {
        return null
      }
      const status = get(statusAtom)
      if (status.error) {
        throw status.error
      }
      if ('data' in status) {
        return status
      }
      get(dataAtom) // To wait for initial result
      return status
    },
    (_get, set, action: AtomWithSubscriptionAction) => {
      switch (action.type) {
        case 'refetch': {
          return set(statusAtom, action)
        }
      }
    }
  )
}
