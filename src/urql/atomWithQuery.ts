import { pipe, subscribe } from 'wonka'
import {
  TypedDocumentNode,
  OperationContext,
  OperationResult,
  RequestPolicy,
} from '@urql/core'
import { atom } from 'jotai'
import type { Atom, Getter } from 'jotai'
import { clientAtom } from './clientAtom'

type QueryArgs<Data, Variables extends object> = {
  query: TypedDocumentNode<Data, Variables>
  variables?: Variables
  requestPolicy?: RequestPolicy
  context?: Partial<OperationContext>
}

export function atomWithQuery<Data, Variables extends object>(
  createQueryArgs: (get: Getter) => QueryArgs<Data, Variables>
): Atom<OperationResult<Data, Variables>> {
  const stateAtom = atom(() => {
    const state = {
      resolve: null as
        | ((result: OperationResult<Data, Variables>) => void)
        | null,
      setResult: null as
        | ((result: OperationResult<Data, Variables>) => void)
        | null,
      prevResult: null as OperationResult<Data, Variables> | null,
      unsubscribe: null as (() => void) | null,
      handle(result: OperationResult<Data, Variables>) {
        this.prevResult = result
        if (this.resolve) {
          this.resolve(result)
          this.resolve = null
        } else if (this.setResult) {
          this.setResult(result)
        } else {
          throw new Error('setting result without mount')
        }
      },
    }
    return state
  })
  const initAtom = atom(
    (get) => {
      const args = createQueryArgs(get)
      const state = get(stateAtom)
      const resultAtom = atom<
        | OperationResult<Data, Variables>
        | Promise<OperationResult<Data, Variables>>
      >(
        new Promise<OperationResult<Data, Variables>>((resolve) => {
          state.resolve = resolve
        })
      )
      state.prevResult = null
      const client = get(clientAtom)
      state.unsubscribe?.()
      const subscription = pipe(
        client.query(args.query, args.variables, {
          requestPolicy: args.requestPolicy,
          ...args.context,
        }),
        subscribe((result) => {
          state.handle(result)
        })
      )
      state.unsubscribe = () => subscription.unsubscribe()
      return { resultAtom, args }
    },
    (get, set, action: { type: 'mount' } | { type: 'cleanup' }) => {
      switch (action.type) {
        case 'mount': {
          const state = get(stateAtom)
          state.setResult = (result) => {
            const { resultAtom } = get(initAtom)
            set(resultAtom, result)
          }
          return
        }
        case 'cleanup': {
          const { unsubscribe } = get(stateAtom)
          unsubscribe?.()
          return
        }
      }
    }
  )
  initAtom.onMount = (dispatch) => {
    dispatch({ type: 'mount' })
    return () => dispatch({ type: 'cleanup' })
  }
  const queryAtom = atom((get) => {
    const { resultAtom } = get(initAtom)
    return get(resultAtom)
  })
  return queryAtom
}
