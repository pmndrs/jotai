import type {
  Client,
  OperationContext,
  OperationResult,
  RequestPolicy,
  TypedDocumentNode,
} from '@urql/core'
import { delay, pipe, skip, subscribe } from 'wonka'
import { atom } from 'jotai'
import type { Getter, PrimitiveAtom, WritableAtom } from 'jotai'
import { clientAtom } from './clientAtom'

type AtomWithQueryAction = {
  type: 'reexecute'
  opts?: Partial<OperationContext>
}

type OperationResultWithData<Data, Variables> = OperationResult<
  Data,
  Variables
> & {
  data: Data
}

const isOperationResultWithData = <Data, Variables>(
  result: OperationResult<Data, Variables>
): result is OperationResultWithData<Data, Variables> => 'data' in result

type QueryArgs<Data, Variables extends object> = {
  query: TypedDocumentNode<Data, Variables> | string
  variables?: Variables
  requestPolicy?: RequestPolicy
  context?: Partial<OperationContext>
}

type QueryArgsWithPause<Data, Variables extends object> = QueryArgs<
  Data,
  Variables
> & {
  pause: boolean
}

export function atomWithQuery<Data, Variables extends object>(
  createQueryArgs: (get: Getter) => QueryArgs<Data, Variables>,
  getClient?: (get: Getter) => Client
): WritableAtom<OperationResultWithData<Data, Variables>, AtomWithQueryAction>

export function atomWithQuery<Data, Variables extends object>(
  createQueryArgs: (get: Getter) => QueryArgsWithPause<Data, Variables>,
  getClient?: (get: Getter) => Client
): WritableAtom<
  OperationResultWithData<Data, Variables> | null,
  AtomWithQueryAction
>

export function atomWithQuery<Data, Variables extends object>(
  createQueryArgs: (get: Getter) => QueryArgs<Data, Variables>,
  getClient: (get: Getter) => Client = (get) => get(clientAtom)
) {
  type ResultAtom = PrimitiveAtom<
    | OperationResultWithData<Data, Variables>
    | Promise<OperationResultWithData<Data, Variables>>
  >
  const createResultAtom = (
    client: Client,
    args: QueryArgs<Data, Variables>,
    opts?: Partial<OperationContext>
  ) => {
    let resolve:
      | ((result: OperationResultWithData<Data, Variables>) => void)
      | null = null
    const resultAtom: ResultAtom = atom<
      | OperationResultWithData<Data, Variables>
      | Promise<OperationResultWithData<Data, Variables>>
    >(
      new Promise<OperationResultWithData<Data, Variables>>((r) => {
        resolve = r
      })
    )
    let setResult: (result: OperationResultWithData<Data, Variables>) => void =
      () => {
        throw new Error('setting result without mount')
      }
    const listener = (result: OperationResult<Data, Variables>) => {
      if (!isOperationResultWithData(result)) {
        throw new Error('result does not have data')
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
        ...opts,
      })
      .toPromise()
      .then(listener)
      .catch(() => {
        // TODO error handling
      })
    resultAtom.onMount = (update) => {
      setResult = update
      const subscription = pipe(
        client.query(args.query, args.variables, {
          ...(args.requestPolicy && { requestPolicy: args.requestPolicy }),
          ...args.context,
        }),
        skip(1), // handled by toPromise
        delay(10), // FIXME test sometimes fails without this
        subscribe(listener)
      )
      return () => subscription.unsubscribe()
    }
    return resultAtom
  }
  const queryResultAtom = atom((get) => {
    const args = createQueryArgs(get)
    if ((args as { pause?: boolean }).pause) {
      return null
    }
    const client = getClient(get)
    const resultAtom = createResultAtom(client, args)
    return { resultAtom, client, args }
  })
  const overwrittenResultAtom = atom<{
    oldResultAtom: ResultAtom
    newResultAtom: ResultAtom
  } | null>(null)
  const queryAtom = atom(
    (get) => {
      const queryResult = get(queryResultAtom)
      if (!queryResult) {
        return null
      }
      let { resultAtom } = queryResult
      const overwrittenResult = get(overwrittenResultAtom)
      if (overwrittenResult && overwrittenResult.oldResultAtom === resultAtom) {
        resultAtom = overwrittenResult.newResultAtom
      }
      return get(resultAtom)
    },
    (get, set, action: AtomWithQueryAction) => {
      switch (action.type) {
        case 'reexecute': {
          const queryResult = get(queryResultAtom)
          if (!queryResult) {
            throw new Error('query is paused')
          }
          const { resultAtom, client, args } = queryResult
          set(overwrittenResultAtom, {
            oldResultAtom: resultAtom,
            newResultAtom: createResultAtom(client, args, action.opts),
          })
        }
      }
    }
  )
  return queryAtom
}
