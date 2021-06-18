import {
  TypedDocumentNode,
  OperationContext,
  OperationResult,
} from '@urql/core'
import { atom } from 'jotai'
import type { Atom, Getter } from 'jotai'
import { clientAtom } from './clientAtom'

type MutationAction<Data, Variables extends object> = {
  variables?: Variables
  context?: Partial<OperationContext>
  callback?: (result: OperationResult<Data, Variables>) => void
}

export function atomWithMutation<Data, Variables extends object>(
  createQuery: (get: Getter) => TypedDocumentNode<Data, Variables>
): Atom<OperationResult<Data, Variables>> {
  const operationResultAtom = atom<
    OperationResult<Data, Variables> | Promise<OperationResult<Data, Variables>>
  >(
    new Promise<OperationResult<Data, Variables>>(() => {}) // infinite pending
  )
  const queryResultAtom = atom(
    (get) => get(operationResultAtom),
    (get, set, action: MutationAction<Data, Variables>) => {
      set(
        operationResultAtom,
        new Promise<OperationResult<Data, Variables>>(() => {}) // new fetch
      )
      const client = get(clientAtom)
      const query = createQuery(get)
      client
        .mutation(query, action.variables, action.context)
        .toPromise()
        .then((result) => {
          set(operationResultAtom, result)
          action.callback?.(result)
        })
        .catch(() => {
          // TODO error handling
        })
    }
  )
  return queryResultAtom
}
