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
import type { Getter, WritableAtom } from 'jotai'
import { clientAtom } from './clientAtom'

type Timeout = ReturnType<typeof setTimeout>

type AtomWithSubscriptionAction = {
  type: 'refetch'
}

type OperationResultWithData<Data, Variables extends AnyVariables> = Omit<
  OperationResult<Data, Variables>,
  'data'
> & { data: Data }

const isOperationResultWithData = <Data, Variables extends AnyVariables>(
  result: OperationResult<Data, Variables>
): result is OperationResultWithData<Data, Variables> =>
  'data' in result && !result.error

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
  type Result = OperationResult<Data, Variables>
  const queryResultAtom = atom((get) => {
    const args = createSubscriptionArgs(get)
    if ((args as { pause?: boolean }).pause) {
      return null
    }
    const client = getClient(get)
    let resolve: ((result: Result) => void) | null = null
    const makePending = () =>
      new Promise<Result>((r) => {
        resolve = r
      })
    const resultAtom = atom<Result | Promise<Result>>(makePending())
    let setResult: ((result: Result) => void) | null = null
    const listener = (result: Result) => {
      if (!resolve && !setResult) {
        throw new Error('setting result without mount')
      }
      if (resolve) {
        resolve(result)
        resolve = null
      }
      if (setResult) {
        setResult(result)
      }
    }
    let subscription: Subscription | null = null
    let timer: Timeout | undefined
    const startSub = () => {
      if (subscription) {
        clearTimeout(timer)
        subscription.unsubscribe()
      }
      subscription = pipe(
        client.subscription(args.query, args.variables, args.context),
        subscribe(listener)
      )
      if (!setResult) {
        // not mounted yet
        timer = setTimeout(() => {
          if (subscription) {
            subscription.unsubscribe()
            subscription = null
          }
        }, 1000)
      }
    }
    startSub()
    resultAtom.onMount = (update) => {
      setResult = update
      if (subscription) {
        clearTimeout(timer as Timeout)
      } else {
        startSub()
      }
      return () => {
        setResult = null
        if (subscription) {
          subscription.unsubscribe()
          subscription = null
        }
      }
    }
    return { resultAtom, makePending, startSub }
  })
  const queryAtom = atom(
    (get) => {
      const queryResult = get(queryResultAtom)
      if (!queryResult) {
        return null
      }
      const { resultAtom } = queryResult
      const result = get(resultAtom)
      if (!isOperationResultWithData(result)) {
        throw result.error
      }
      return result
    },
    (get, set, action: AtomWithSubscriptionAction) => {
      switch (action.type) {
        case 'refetch': {
          const queryResult = get(queryResultAtom)
          if (!queryResult) {
            throw new Error('query is paused')
          }
          const { resultAtom, makePending, startSub } = queryResult
          set(resultAtom, makePending())
          startSub()
          return
        }
      }
    }
  )
  return queryAtom
}
