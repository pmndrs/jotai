import type {
  AnyVariables,
  Client,
  OperationContext,
  OperationResult,
  RequestPolicy,
  TypedDocumentNode,
} from '@urql/core'
import { atomsWithQuery } from 'jotai-urql'
import { atom } from 'jotai'
import type { Getter, WritableAtom } from 'jotai'
import { clientAtom } from './clientAtom'

/*
 * @deprecated use simple 'refetch' action
 */
type DeprecatedAtomWithQueryAction =
  | {
      type: 'reexecute'
      opts?: Partial<OperationContext>
    }
  | {
      type: 'refetch'
      opts?: Partial<OperationContext>
    }

type AtomWithQueryAction =
  | {
      type: 'refetch'
    }
  | DeprecatedAtomWithQueryAction

type OperationResultWithData<Data, Variables extends AnyVariables> = Omit<
  OperationResult<Data, Variables>,
  'data'
> & { data: Data }

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
  const getArgs = (get: Getter) => {
    const queryArgs = createQueryArgs(get)
    return [
      queryArgs.query,
      queryArgs.variables,
      {
        ...(queryArgs.requestPolicy && {
          requestPolicy: queryArgs.requestPolicy,
        }),
        ...queryArgs.context,
      },
    ] as const
  }
  const [dataAtom, statusAtom] = atomsWithQuery(getArgs, getClient)
  return atom(
    (get) => {
      const queryArgs = createQueryArgs(get)
      if ((queryArgs as { pause?: boolean }).pause) {
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
    (_get, set, action: AtomWithQueryAction) => {
      if (action.type === 'reexecute') {
        console.warn(
          'DEPRECATED [atomWithQuery] use refetch instead of reexecute'
        )
        ;(action as AtomWithQueryAction).type = 'refetch'
      }
      if ('opts' in action) {
        console.warn('DEPRECATED [atomWithQuery] action.opts is no longer used')
      }
      switch (action.type) {
        case 'refetch': {
          return set(statusAtom, action)
        }
      }
    }
  )
}
