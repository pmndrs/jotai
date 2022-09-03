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
import type { Getter, PrimitiveAtom, WritableAtom } from 'jotai'
import { clientAtom } from './clientAtom'

type AtomWithQueryAction = {
  type: 'reexecute'
  opts?: Partial<OperationContext>
}

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
  type ResultAtom = PrimitiveAtom<Result | Promise<Result>>
  const queryResultAtom = atom((get) => {
    const args = createQueryArgs(get)
    if ((args as { pause?: boolean }).pause) {
      return null
    }
    const client = getClient(get)
    let resolve: ((result: Result) => void) | null = null
    const baseResultAtom: ResultAtom = atom<Result | Promise<Result>>(
      new Promise<Result>((r) => {
        resolve = r
      })
    )
    let setResult: (result: Result | Promise<Result>) => void = () => {
      throw new Error('setting result without mount')
    }
    const listener = (result: Result | Promise<Result>) => {
      if (result instanceof Promise) {
        setResult(result)
        return
      }
      if (resolve) {
        resolve(result)
        resolve = null
      } else {
        setResult(result)
      }
    }
    client
      .query(args.query, args.variables, {
        ...(args.requestPolicy && { requestPolicy: args.requestPolicy }),
        ...args.context,
      })
      .toPromise()
      .then(listener)
    baseResultAtom.onMount = (update) => {
      setResult = update
    }
    const subscriptionAtom = atom<Subscription | null>(null)
    const resultAtom = atom(
      (get) => get(baseResultAtom),
      (get, set, callback: (cleanup: () => void) => void) => {
        const subscription = pipe(
          client.query(args.query, args.variables, {
            ...(args.requestPolicy && { requestPolicy: args.requestPolicy }),
            ...args.context,
          }),
          subscribe(listener)
        )
        set(subscriptionAtom, subscription)
        callback(() => get(subscriptionAtom)?.unsubscribe())
      }
    )
    resultAtom.onMount = (init) => {
      let cleanup: (() => void) | undefined
      init((c) => {
        cleanup = c
      })
      return cleanup
    }
    return { args, client, resultAtom, subscriptionAtom, baseResultAtom }
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
      switch (action.type) {
        case 'reexecute': {
          const queryResult = get(queryResultAtom)
          if (!queryResult) {
            throw new Error('query is paused')
          }
          const { args, client, subscriptionAtom, baseResultAtom } = queryResult
          set(baseResultAtom, new Promise<never>(() => {})) // infinite pending
          const newSubscription = pipe(
            client.query(args.query, args.variables, {
              ...(args.requestPolicy && { requestPolicy: args.requestPolicy }),
              ...args.context,
              ...action.opts,
            }),
            subscribe((result) => {
              set(baseResultAtom, result)
            })
          )
          const oldSubscription = get(subscriptionAtom)
          oldSubscription?.unsubscribe()
          set(subscriptionAtom, newSubscription)
        }
      }
    }
  )
  return queryAtom
}
