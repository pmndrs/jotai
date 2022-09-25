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
  type Result = OperationResult<Data, Variables>
  const operationResultAtom = atom((get) => {
    let resolve: ((result: Result) => void) | null = null
    const makePending = () => 
      new Promise<Result>((r) => {
        resolve = r
      })

    const resultAtom = atom<Result | Promise<Result>>(makePending())
    return { resultAtom, makePending }
  })
  const queryResultAtom = atom(
    (get) => {
      const queryResult = get(operationResultAtom)
      if(!queryResult) {
        return null
      }
      const { resultAtom } = queryResult
      const result = get(resultAtom)
      return result
    },
    async (get, set, action: MutationAction<Data, Variables>) => {
      const queryResult = get(queryResultAtom)
      const { resultAtom, makePending } = queryResult
      set(
        resultAtom,
        makePending()
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
          set(resultAtom, result)
        })
    }
  )
  return queryResultAtom
}
