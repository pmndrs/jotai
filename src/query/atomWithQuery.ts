import type { QueryKey, QueryObserverOptions } from '@tanstack/query-core'
import { atomsWithQuery } from 'jotai-tanstack-query'
import { atom } from 'jotai'
import type { Getter, WritableAtom } from 'jotai'
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

/**
 * @deprecated use `jotai-tanstack-query` instead
 */
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

/**
 * @deprecated use `jotai-tanstack-query` instead
 */
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
  console.warn('[DEPRECATED] use `jotai-tanstack-query` instead.')
  const getOptions = (get: Getter) => ({
    staleTime: 200,
    ...(typeof createQuery === 'function' ? createQuery(get) : createQuery),
  })
  const [dataAtom] = atomsWithQuery(getOptions, getQueryClient)
  return atom(
    (get) => {
      const options = getOptions(get)
      if (options.enabled === false) {
        const queryClient = getQueryClient(get)
        return queryClient.getQueryData<TData>(options.queryKey)
      }
      return get(dataAtom)
    },
    (_get, set, action: AtomWithQueryAction) => {
      if (action.type === 'refetch') {
        return set(dataAtom, { type: 'refetch', force: true })
      }
    }
  )
}
