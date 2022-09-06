import type {
  AnyVariables,
  Client,
  OperationContext,
  OperationResult,
  TypedDocumentNode,
} from '@urql/core'
import { atom } from 'jotai'
import type { Getter } from 'jotai'
import { clientAtom } from './clientAtom'

type MutationAction<Data, Variables extends AnyVariables> = {
  variables: Variables
  context?: Partial<OperationContext>
  callback?: (result: OperationResult<Data, Variables>) => void
}

export function atomWithMutation<Data, Variables extends AnyVariables>(
  createQuery: (get: Getter) => TypedDocumentNode<Data, Variables> | string,
  getClient: (get: Getter) => Client = (get) => get(clientAtom)
) {
  const operationResultAtom = atom<
    OperationResult<Data, Variables> | Promise<OperationResult<Data, Variables>>
  >(
    new Promise<OperationResult<Data, Variables>>(() => {}) // infinite pending
  )
  const queryResultAtom = atom(
    (get) => get(operationResultAtom),
    async (get, set, action: MutationAction<Data, Variables>) => {
      set(
        operationResultAtom,
        new Promise<OperationResult<Data, Variables>>(() => {}) // new fetch
      )
      const client = getClient(get)
      const query = createQuery(get)
      return client
        .mutation(query, action.variables, action.context)
        .toPromise()
        .then((result) => {
          action.callback?.(result)
          if (result.error) {
            throw result.error
          }
          set(operationResultAtom, result)
        })
    }
  )
  return queryResultAtom
}
