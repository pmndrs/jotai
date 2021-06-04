import {
  QueryKey,
  QueryObserver,
  QueryObserverOptions,
  QueryObserverResult,
} from 'react-query'
import { atom } from 'jotai'
import type { WritableAtom, Getter } from 'jotai'
import { queryClientAtom } from './queryClientAtom'

type Action = { type: 'refetch' } | { type: 'cleanup' }

type AtomQueryOptions<TQueryFnData, TError, TData, TQueryData> =
  QueryObserverOptions<TQueryFnData, TError, TData, TQueryData> & {
    queryKey: QueryKey
  }

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData
>(
  createQuery:
    | AtomQueryOptions<TQueryFnData, TError, TData, TQueryData>
    | ((
        get: Getter
      ) => AtomQueryOptions<TQueryFnData, TError, TData, TQueryData>),
  equalityFn: (a: TData, b: TData) => boolean = Object.is
): WritableAtom<TData, Action> {
  const stateAtom = atom(() => {
    const state = {
      resolve: null as ((data: TData) => void) | null,
      setData: null as ((data: TData) => void) | null,
      prevData: null as TData | null,
      unsubscribe: null as (() => void) | null,
      handle(result: QueryObserverResult<TData, TError>) {
        // TODO error handling
        if (
          result.data === undefined ||
          (this.prevData !== null && equalityFn(this.prevData, result.data))
        ) {
          return
        }
        this.prevData = result.data
        if (this.resolve) {
          this.resolve(result.data)
          this.resolve = null
        } else if (this.setData) {
          this.setData(result.data)
        } else {
          throw new Error('setting data without mount')
        }
      },
    }
    return state
  })
  const initAtom = atom(
    (get) => {
      const options =
        typeof createQuery === 'function' ? createQuery(get) : createQuery
      const state = get(stateAtom)
      const dataAtom = atom<TData | Promise<TData>>(
        new Promise<TData>((resolve) => {
          state.resolve = resolve
        })
      )
      state.prevData = null
      const queryClient = get(queryClientAtom)
      const observer = new QueryObserver(queryClient, options)
      state.unsubscribe?.()
      state.unsubscribe = observer.subscribe((result) => {
        state.handle(result)
      })
      return { dataAtom, options }
    },
    (get, set, action: Action | { type: 'mount' }) => {
      switch (action.type) {
        case 'mount': {
          const state = get(stateAtom)
          state.setData = (data) => {
            const { dataAtom } = get(initAtom)
            set(dataAtom, data)
          }
          return
        }
        case 'cleanup': {
          const { unsubscribe } = get(stateAtom)
          unsubscribe?.()
          return
        }
        case 'refetch': {
          const state = get(stateAtom)
          const { dataAtom, options } = get(initAtom)
          set(
            dataAtom,
            new Promise<TData>((resolve) => {
              state.resolve = resolve
            })
          )
          const queryClient = get(queryClientAtom)
          queryClient.getQueryCache().find(options.queryKey)?.reset()
          const p: Promise<void> = queryClient.refetchQueries(options.queryKey)
          return p
        }
      }
    }
  )
  initAtom.onMount = (dispatch) => {
    dispatch({ type: 'mount' })
    return () => dispatch({ type: 'cleanup' })
  }
  const queryAtom = atom<TData, Action>(
    (get) => {
      const { dataAtom } = get(initAtom)
      return get(dataAtom)
    },
    (_get, set, action) => set(initAtom, action) // delegate action
  )
  return queryAtom
}
