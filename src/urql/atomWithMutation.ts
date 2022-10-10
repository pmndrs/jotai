import type {
  AnyVariables,
  Client,
  OperationContext,
  OperationResult,
  TypedDocumentNode,
} from '@urql/core'
import { atomsWithUrqlMutation } from 'jotai-urql'
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
  const [dataAtom, statusAtom] = atomsWithUrqlMutation<Data, Variables>(
    getClient
  )
  return atom(
    (get) => {
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
    async (get, set, action: MutationAction<Data, Variables>) => {
      const args = [
        createQuery(get),
        action.variables,
        action.context || {},
      ] as const
      await set(statusAtom, args)
      return Promise.resolve(get(statusAtom, { unstable_promise: true })).then(
        (status) => {
          action.callback?.(status)
          if (status.error) {
            throw status.error
          }
        }
      )
    }
  )
}
