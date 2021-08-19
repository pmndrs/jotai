import type {
  Client,
  OperationContext,
  OperationResult,
  RequestPolicy,
  TypedDocumentNode,
} from '@urql/core'
import { pipe, subscribe } from 'wonka'
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
): Atom<OperationResultWithData<Data, Variables>>

export function atomWithQuery<Data, Variables extends object>(
  createQueryArgs: (get: Getter) => QueryArgsWithPause<Data, Variables>,
  getClient?: (get: Getter) => Client
): Atom<OperationResultWithData<Data, Variables> | null>

export function atomWithQuery<Data, Variables extends object>(
  createQueryArgs: (get: Getter) => QueryArgs<Data, Variables>,
  getClient: (get: Getter) => Client = (get) => get(clientAtom)
) {
  const queryResultAtom = atom((get) => {
    const args = createQueryArgs(get)
    if ((args as { pause?: boolean }).pause) {
      return { args }
    }
    const client = getClient(get)
    let resolve:
      | ((result: OperationResultWithData<Data, Variables>) => void)
      | null = null
    const resultAtom = atom<
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
        requestPolicy: args.requestPolicy,
        ...args.context,
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
          requestPolicy: args.requestPolicy,
          ...args.context,
        }),
        subscribe(listener)
      )
      return () => subscription.unsubscribe()
    }
    return { resultAtom, args }
  })
  const queryAtom = atom((get) => {
    const { resultAtom } = get(queryResultAtom)
    return resultAtom ? get(resultAtom) : null
  })
  return queryAtom
}
