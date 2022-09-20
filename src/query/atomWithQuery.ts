import type { QueryKey, QueryObserverOptions } from '@tanstack/query-core'
import { atomsWithTanstackQuery } from 'jotai-tanstack-query'
import { atom } from 'jotai'
import type { WritableAtom } from 'jotai'
import { queryClientAtom } from './queryClientAtom'
import type { CreateQueryOptions, GetQueryClient } from './types'

type AtomWithQueryAction = {
  type: 'refetch'
}

export interface AtomWithQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey
> extends QueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  > {
  queryKey: TQueryKey
}

export interface AtomWithQueryOptionsWithEnabled<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey
> extends Omit<
    AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
    'enabled'
  > {
  enabled: boolean
}

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithQueryOptionsWithEnabled<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<TData | undefined, AtomWithQueryAction>

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<TData, AtomWithQueryAction>

export function atomWithQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
  >,
  getQueryClient: GetQueryClient = (get) => get(queryClientAtom)
): WritableAtom<TData | undefined, AtomWithQueryAction, void | Promise<void>> {
  const getOptions =
    typeof createQuery === 'function' ? createQuery : () => createQuery
  const [dataAtom] = atomsWithTanstackQuery(getOptions, getQueryClient)
  return atom(
    (get) => get(dataAtom),
    (_get, set, action: AtomWithQueryAction) => {
      if (action.type === 'refetch') {
        set(dataAtom, { type: 'refetch', unstable_pending: true })
      }
    }
  )
}
