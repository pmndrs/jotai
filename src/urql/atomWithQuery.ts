import type {
  AnyVariables,
  Client,
  OperationContext,
  OperationResult,
  RequestPolicy,
  TypedDocumentNode,
} from '@urql/core'
import { pipe, subscribe } from 'wonka'
import type { Subscription } from 'wonka'
import { atom } from 'jotai'
import type { Getter, WritableAtom } from 'jotai'
import { clientAtom } from './clientAtom'

type Timeout = ReturnType<typeof setTimeout>

/*
 * @deprecated use 'refetch' action
 */
type DeprecatedAtomWithQueryAction = {
  type: 'reexecute'
  opts?: Partial<OperationContext>
}

type AtomWithQueryAction =
  | {
      type: 'refetch'
      opts?: Partial<OperationContext>
    }
  | DeprecatedAtomWithQueryAction

type OperationResultWithData<Data, Variables extends AnyVariables> = Omit<
  OperationResult<Data, Variables>,
  'data'
> & { data: Data }

const isOperationResultWithData = <Data, Variables extends AnyVariables>(
  result: OperationResult<Data, Variables>
): result is OperationResultWithData<Data, Variables> =>
  'data' in result && !result.error

type QueryArgs<Data, Variables extends AnyVariables> = {
  query: TypedDocumentNode<Data, Variables> | string
  variables: Variables
  requestPolicy?: RequestPolicy
  context?: Partial<OperationContext>
}

type QueryArgsWithPause<Data, Variables extends AnyVariables> = QueryArgs<
  Data,
  Variables
> & { pause: boolean }

export function atomWithQuery<Data, Variables extends AnyVariables>(
  createQueryArgs: (get: Getter) => QueryArgs<Data, Variables>,
  getClient?: (get: Getter) => Client
): WritableAtom<OperationResultWithData<Data, Variables>, AtomWithQueryAction>

export function atomWithQuery<Data, Variables extends AnyVariables>(
  createQueryArgs: (get: Getter) => QueryArgsWithPause<Data, Variables>,
  getClient?: (get: Getter) => Client
): WritableAtom<
  OperationResultWithData<Data, Variables> | null,
  AtomWithQueryAction
>

export function atomWithQuery<Data, Variables extends AnyVariables>(
  createQueryArgs: (get: Getter) => QueryArgs<Data, Variables>,
  getClient: (get: Getter) => Client = (get) => get(clientAtom)
) {
  type Result = OperationResult<Data, Variables>
  const queryResultAtom = atom((get) => {
    const args = createQueryArgs(get)
    if ((args as { pause?: boolean }).pause) {
      return null
    }
    const client = getClient(get)
    let resolve: ((result: Result) => void) | null = null
    const setResolve = (r: (result: Result) => void) => {
      resolve = r
    }
    const resultAtom = atom<Result | Promise<Result>>(
      new Promise<Result>(setResolve)
    )
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
    const startQuery = (opts?: Partial<OperationContext>) => {
      if (subscription) {
        clearTimeout(timer)
        subscription.unsubscribe()
      }
      subscription = pipe(
        client.query(args.query, args.variables, {
          ...(args.requestPolicy && { requestPolicy: args.requestPolicy }),
          ...args.context,
          ...opts,
        }),
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
    startQuery()
    resultAtom.onMount = (update) => {
      setResult = update
      if (subscription) {
        clearTimeout(timer as Timeout)
      } else {
        startQuery()
      }
      return () => {
        setResult = null
        if (subscription) {
          subscription.unsubscribe()
          subscription = null
        }
      }
    }
    return { resultAtom, setResolve, startQuery }
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
    (get, set, action: AtomWithQueryAction) => {
      if (action.type === 'reexecute') {
        console.warn(
          'DEPRECATED [atomWithQuery] use refetch instead of reexecute'
        )
        ;(action as AtomWithQueryAction).type = 'refetch'
      }
      switch (action.type) {
        case 'refetch': {
          const queryResult = get(queryResultAtom)
          if (!queryResult) {
            throw new Error('query is paused')
          }
          const { resultAtom, setResolve, startQuery } = queryResult
          set(resultAtom, new Promise<Result>(setResolve))
          startQuery(action.opts)
          return
        }
      }
    }
  )
  return queryAtom
}
